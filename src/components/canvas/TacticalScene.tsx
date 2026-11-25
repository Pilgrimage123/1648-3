/**
 * Top-Level R3F Tactical 3D Scene (/src/components/canvas/TacticalScene.tsx).
 * Třívrstvá hierarchie osvětlení (ADR-0007, ADR-0011, ADR-0015, ADR-0018):
 * 1. Nebeský světelný zdroj (Celestial Directional Light): noční měsíc v M1 vs ranní východní slunce v M2.
 * 2. Praktická diegetická světla (Diegetic Practical Lights): svícny, pochodně, lucerna, doutnáky.
 * 3. Bojový zábleskový fond (Dynamic Combat Flash Pool): krátkodobé záblesky hlavní a detonací.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getMission1EscapeTile } from "../../core/GridSystem";
import type { ScenarioId, WeatherType } from "../../core/types";
import { useGameStore } from "../../store/useGameStore";
import {
  BAROQUE_VOLUMETRIC_FRAG,
  BAROQUE_VOLUMETRIC_VERT,
  getBaroqueChiaroscuroFrameStyle,
  getBaroqueLightingProfile,
  type VolumetricShaftSpec,
} from "./baroqueMaterials";
import { CombatAtmosphereField } from "./CombatAtmosphereField";
import { CombatLines3D } from "./CombatLines3D";
import {
  evaluateFixture,
  evaluateLantern,
  fixturesForScenario,
  mission3CordLights,
  isFixtureDucked,
  matchcordCandidates,
  MAX_CANDELABRA_SLOTS,
  MAX_MATCHCORD_SLOTS,
  MAX_TORCH_SLOTS,
  MISSION1_MOON_POSITION,
  MISSION2_SUN_POSITION,
  selectSteadySlots,
  type PracticalSample,
} from "./diegeticLights";
import { PragueSurroundings } from "./PragueSurroundings";
import { InstancedBattlefield } from "./InstancedBattlefield";
import { RainParticles } from "./RainParticles";
import { TacticalCamera } from "./TacticalCamera";
import { UnitActor } from "./UnitActor";
import { continuousGridToWorld, gridToWorld } from "./worldCoords";

const GrandPrioryPalaceDressing = lazy(() =>
  import("./GrandPrioryPalaceDressing").then((m) => ({ default: m.GrandPrioryPalaceDressing })),
);
const BridgeTowerDressing = lazy(() =>
  import("./BridgeTowerDressing").then((m) => ({ default: m.BridgeTowerDressing })),
);
const PowderYardDressing = lazy(() =>
  import("./PowderYardDressing").then((m) => ({ default: m.PowderYardDressing })),
);

function detectSoftwareRenderer(gl: THREE.WebGLRenderer): boolean {
  try {
    const ctx = gl.getContext();
    const debugInfo = ctx.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      debugInfo
        ? ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : ctx.getParameter(ctx.RENDERER),
    );
    return /SwiftShader|llvmpipe|Software|Mesa OffScreen/i.test(renderer);
  } catch {
    return false;
  }
}

/**
 * Software WebGL (SwiftShader/llvmpipe) frame pacer:
 * Schedules the next render with a brief breathing gap after each frame finishes
 * so CPU rasterization never starves input events or compositor frames.
 */
function SoftwareGlTicker() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    invalidate();
    const t1 = window.setTimeout(() => invalidate(), 90);
    const t2 = window.setTimeout(() => invalidate(), 240);
    let followUp: number | null = null;
    const schedule = () => {
      invalidate();
      if (followUp !== null) window.clearTimeout(followUp);
      followUp = window.setTimeout(() => {
        followUp = null;
        invalidate();
      }, 90);
    };
    const unsub = useGameStore.subscribe(schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("pointerup", schedule, { passive: true });
    window.addEventListener("wheel", schedule, { passive: true });
    window.addEventListener("keydown", schedule, { passive: true });
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (followUp !== null) window.clearTimeout(followUp);
      unsub();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointerup", schedule);
      window.removeEventListener("wheel", schedule);
      window.removeEventListener("keydown", schedule);
    };
  }, [invalidate]);

  return null;
}

function assignSlot(
  light: THREE.PointLight | null,
  sample: PracticalSample | undefined,
  t: number,
  weather: WeatherType,
) {
  if (!light) return;
  if (!sample || sample.intensity <= 0.01) {
    light.intensity = 0;
    return;
  }
  const speed =
    sample.kind === "candelabrum" ? 4.2 : sample.kind === "matchcord" ? 11 : 8.4;
  const amp =
    sample.kind === "matchcord" && weather === "rain" && sample.exposed
      ? 0.42
      : sample.exposed && weather === "rain"
        ? 0.26
        : sample.kind === "candelabrum"
          ? 0.07
          : 0.13;
  const phase = sample.position.x * 0.7 + sample.position.z;
  const wave = Math.sin(t * speed + phase);
  light.color.set(sample.color);
  light.intensity = sample.intensity * (1 + wave * amp);
  light.distance = sample.radius;
  light.position.set(sample.position.x, sample.position.y, sample.position.z);
}

/**
 * Procedural Studio PMREM Environment (`RoomEnvironment`) & ACESFilmic Tone Mapping Sync.
 * Gives gilded Corinthian capitals, crystal chandeliers, steel cuirasses, bronze falconets,
 * and river water genuine physically-based reflections with zero external files.
 */
function BaroqueEnvironmentRig({
  scenario,
  weather,
}: {
  scenario: ScenarioId;
  weather: WeatherType;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const profile = useMemo(
    () => getBaroqueLightingProfile(scenario, weather),
    [scenario, weather],
  );

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envRoom = new RoomEnvironment();
    const envRT = pmrem.fromScene(envRoom, 0.04);
    scene.environment = envRT.texture;
    envRoom.dispose();
    pmrem.dispose();
    return () => {
      if (scene.environment === envRT.texture) {
        scene.environment = null;
      }
      envRT.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = profile.exposure;
    scene.environmentIntensity = profile.envIntensity;
  }, [gl, scene, profile.exposure, profile.envIntensity]);

  return null;
}

/** Soft-edge Fresnel volumetric God-ray cone (never hard-edged translucent geometry). */
function VolumetricGodRay({ spec }: { spec: VolumetricShaftSpec }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pos = useMemo(
    () => continuousGridToWorld(spec.gridX, spec.gridY, spec.gridZ),
    [spec.gridX, spec.gridY, spec.gridZ],
  );
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(spec.color) },
      uOpacity: { value: spec.baseOpacity },
    }),
    [spec.color, spec.baseOpacity],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uColor!.value.set(spec.color);
    mat.uniforms.uOpacity!.value = Math.max(
      0,
      spec.baseOpacity + Math.sin(t * spec.pulseSpeed + spec.gridX * 0.4) * spec.pulseAmp,
    );
  });

  if (spec.baseOpacity <= 0.002) return null;

  return (
    <mesh
      position={[pos[0], pos[1] + spec.heightOffset, pos[2]]}
      rotation={[spec.rotX, 0, spec.rotZ]}
      raycast={() => null}
      renderOrder={4}
    >
      <cylinderGeometry
        args={[spec.topRadius, spec.bottomRadius, spec.height, 24, 1, true]}
      />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={BAROQUE_VOLUMETRIC_VERT}
        fragmentShader={BAROQUE_VOLUMETRIC_FRAG}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function DiegeticLightingRig({
  weather,
  softwareGl,
}: {
  weather: WeatherType;
  softwareGl: boolean;
}) {
  const candleRefs = useRef<(THREE.PointLight | null)[]>([]);
  const torchRefs = useRef<(THREE.PointLight | null)[]>([]);
  const cordRefs = useRef<(THREE.PointLight | null)[]>([]);

  const grid = useGameStore((s) => s.grid);
  const units = useGameStore((s) => s.units);
  const scenario = useGameStore((s) => s.scenario);
  const m3 = useGameStore((s) => s.m3);
  const blastZones = useGameStore((s) => s.blastZones);
  const lightFlashes = useGameStore((s) => s.lightFlashes);
  const activeFloor = useGameStore((s) => s.activeFloor);
  const fogOfWarEnabled = useGameStore((s) => s.fogOfWarEnabled);
  const fogSnapshot = useGameStore((s) => s.fogSnapshot);

  const profile = useMemo(
    () => getBaroqueLightingProfile(scenario, weather),
    [scenario, weather],
  );

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const now = performance.now();
    const escape = getMission1EscapeTile(grid);
    const damageAt = (coord: { x: number; y: 0 | 1 | 2; z: number }) =>
      grid.getTile(coord)?.damageLevel ?? 0;
    const duckedAt = (coord: { x: number; y: 0 | 1 | 2; z: number }) =>
      isFixtureDucked(coord, now, lightFlashes, blastZones);

    const fixtures = fixturesForScenario(scenario).map((fixture) =>
      evaluateFixture(
        fixture,
        weather,
        damageAt(fixture.coord),
        duckedAt(fixture.coord),
      ),
    );
    const allFixtures = escape
      ? [
          ...fixtures,
          evaluateLantern(
            escape.coord,
            weather,
            damageAt(escape.coord),
            duckedAt(escape.coord),
          ),
        ]
      : fixtures;
    const cords = matchcordCandidates(
      units,
      fogOfWarEnabled,
      fogSnapshot.visibleEnemyIds,
      fogSnapshot.soundContacts,
      grid,
    );
    const slots = selectSteadySlots(
      allFixtures,
      cords,
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      activeFloor,
      weather,
    );
    const candles = slots.filter((slot) => slot.kind === "candelabrum");
    const torches = slots.filter(
      (slot) => slot.kind === "torch" || slot.kind === "lantern",
    );
    const matchcords = slots.filter((slot) => slot.kind === "matchcord");
    const cordSlots =
      scenario === "mission3"
        ? mission3CordLights(m3, weather, matchcords)
        : matchcords;

    for (let i = 0; i < MAX_CANDELABRA_SLOTS; i++) {
      assignSlot(candleRefs.current[i] ?? null, candles[i], t, weather);
    }
    for (let i = 0; i < MAX_TORCH_SLOTS; i++) {
      assignSlot(torchRefs.current[i] ?? null, torches[i], t, weather);
    }
    for (let i = 0; i < MAX_MATCHCORD_SLOTS; i++) {
      assignSlot(cordRefs.current[i] ?? null, cordSlots[i] ?? undefined, t, weather);
    }
  });

  const isMorningBridge = scenario === "mission2";

  return (
    <group>
      <ambientLight
        intensity={profile.ambientIntensity}
        color={profile.ambientColor}
      />
      <hemisphereLight
        color={profile.hemiSkyColor}
        groundColor={profile.hemiGroundColor}
        intensity={profile.hemiIntensity}
      />

      {/*
        * 1. NEBESKÝ SVĚTELNÝ ZDROJ (Celestial Directional Light, ADR-0018):
        * Mission 1 & 3: chladný půlnoční měsíc [14, 28, 13].
        * Mission 2: teplé ranní slunce vycházející na východě [22, 24, 8] nad Starým Městem.
        */}
      <directionalLight
        position={isMorningBridge ? [...MISSION2_SUN_POSITION] : [...MISSION1_MOON_POSITION]}
        intensity={profile.keyIntensity}
        color={profile.keyColor}
        castShadow={!softwareGl}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={2}
        shadow-camera-far={65}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Subtle Baroque Rembrandt Rim Backlight (unshadowed, sculpts silhouettes & gilded edges) */}
      <directionalLight
        position={profile.rimPosition}
        intensity={profile.rimIntensity}
        color={profile.rimColor}
      />

      {Array.from({ length: MAX_CANDELABRA_SLOTS }, (_, i) => (
        <pointLight
          key={`candle-slot-${i}`}
          ref={(el) => {
            candleRefs.current[i] = el;
          }}
          color="#fde68a"
          decay={1.25}
          intensity={0}
        />
      ))}
      {Array.from({ length: MAX_TORCH_SLOTS }, (_, i) => (
        <pointLight
          key={`torch-slot-${i}`}
          ref={(el) => {
            torchRefs.current[i] = el;
          }}
          color="#f97316"
          decay={1.25}
          intensity={0}
        />
      ))}
      {Array.from({ length: MAX_MATCHCORD_SLOTS }, (_, i) => (
        <pointLight
          key={`cord-slot-${i}`}
          ref={(el) => {
            cordRefs.current[i] = el;
          }}
          color="#ea580c"
          decay={1.25}
          intensity={0}
        />
      ))}

      {/* Soft-edge Baroque Volumetric God-Rays per Mission */}
      {profile.shafts.map((shaft) => (
        <VolumetricGodRay key={shaft.id} spec={shaft} />
      ))}

      <mesh
        position={[0, -0.5, 0]}
        rotation={[-Math.PI * 0.5, 0, 0]}
        receiveShadow
        raycast={() => null}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color={profile.groundPlaneColor}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

/**
 * Fond dynamických záblesků (Dynamic Light Flash Pool, ADR-0011):
 * Spravuje max 2 explozivní bodová světla a 1 světlo záblesku hlavně s kvadratickým útlumem.
 */
function DynamicLightFlashPool() {
  const lightFlashes = useGameStore((s) => s.lightFlashes);
  const flash1Ref = useRef<THREE.PointLight>(null);
  const flash2Ref = useRef<THREE.PointLight>(null);
  const muzzleRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const now = performance.now();
    const blasts = lightFlashes.filter((f) => f.kind === "blast");
    const muzzles = lightFlashes.filter((f) => f.kind === "muzzle");

    if (flash1Ref.current) {
      const b = blasts[0];
      if (b) {
        const age = now - b.createdAt;
        const p = Math.min(1, Math.max(0, age / b.durationMs));
        const decay = Math.pow(1 - p, 2);
        flash1Ref.current.intensity = decay > 0.01 ? b.intensity * decay : 0;
        flash1Ref.current.distance = b.radius;
        const [wx, wy, wz] = gridToWorld(b.coord);
        const origin = b.world ?? { x: wx, y: wy + 0.6, z: wz };
        flash1Ref.current.position.set(origin.x, origin.y, origin.z);
      } else {
        flash1Ref.current.intensity = 0;
      }
    }

    if (flash2Ref.current) {
      const b = blasts[1];
      if (b) {
        const age = now - b.createdAt;
        const p = Math.min(1, Math.max(0, age / b.durationMs));
        const decay = Math.pow(1 - p, 2);
        flash2Ref.current.intensity = decay > 0.01 ? b.intensity * decay : 0;
        flash2Ref.current.distance = b.radius;
        const [wx, wy, wz] = gridToWorld(b.coord);
        const origin = b.world ?? { x: wx, y: wy + 0.6, z: wz };
        flash2Ref.current.position.set(origin.x, origin.y, origin.z);
      } else {
        flash2Ref.current.intensity = 0;
      }
    }

    if (muzzleRef.current) {
      const m = muzzles[0];
      if (m) {
        const age = now - m.createdAt;
        const p = Math.min(1, Math.max(0, age / m.durationMs));
        const decay = Math.pow(1 - p, 2);
        muzzleRef.current.intensity = decay > 0.01 ? m.intensity * decay : 0;
        muzzleRef.current.distance = m.radius;
        const [wx, wy, wz] = gridToWorld(m.coord);
        const origin = m.world ?? { x: wx, y: wy + 1.05, z: wz };
        muzzleRef.current.position.set(origin.x, origin.y, origin.z);
      } else {
        muzzleRef.current.intensity = 0;
      }
    }
  });

  return (
    <group>
      <pointLight ref={flash1Ref} color="#f97316" decay={2} intensity={0} />
      <pointLight ref={flash2Ref} color="#f97316" decay={2} intensity={0} />
      <pointLight ref={muzzleRef} color="#fde047" decay={2} intensity={0} />
    </group>
  );
}

export function TacticalScene({ paused = false }: { paused?: boolean }) {
  const units = useGameStore((s) => s.units);
  const weather = useGameStore((s) => s.weather);
  const scenario = useGameStore((s) => s.scenario);
  const [softwareGl, setSoftwareGl] = useState(false);

  const lightingProfile = useMemo(
    () => getBaroqueLightingProfile(scenario, weather),
    [scenario, weather],
  );
  const frameStyle = useMemo(
    () => getBaroqueChiaroscuroFrameStyle(scenario),
    [scenario],
  );

  return (
    <div className="relative w-full h-full bg-slate-950 select-none overflow-hidden">
      <Canvas
        frameloop={paused ? "never" : softwareGl ? "demand" : "always"}
        shadows={softwareGl ? false : "percentage"}
        dpr={softwareGl ? 1 : [1, 2]}
        camera={{ fov: 38, near: 0.5, far: 160, position: [14, 18, 14] }}
        gl={{
          antialias: !softwareGl,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: lightingProfile.exposure,
        }}
        onCreated={({ gl }) => {
          if (detectSoftwareRenderer(gl)) {
            setSoftwareGl(true);
          }
        }}
      >
        {softwareGl && !paused && <SoftwareGlTicker />}
        <BaroqueEnvironmentRig scenario={scenario} weather={weather} />
        <color attach="background" args={[lightingProfile.fogColor]} />
        <fog
          attach="fog"
          args={[lightingProfile.fogColor, lightingProfile.fogNear, lightingProfile.fogFar]}
        />

        <PragueSurroundings />

        <DiegeticLightingRig weather={weather} softwareGl={softwareGl} />
        <DynamicLightFlashPool />

        {/* Sjednocené částicové pole černoprachového dýmu, omítkového prachu a jisker (ADR-0011) */}
        <CombatAtmosphereField />

        {/* Atmospheric 3D Rain, Drifting Ash & Rising Torch Embers */}
        <RainParticles />

        <TacticalCamera />
        <InstancedBattlefield />
        <Suspense fallback={null}>
          {scenario === "mission1" && <GrandPrioryPalaceDressing />}
          {scenario === "mission2" && <BridgeTowerDressing />}
          {scenario === "mission3" && <PowderYardDressing />}
        </Suspense>
        <CombatLines3D />

        {units.map((unit) => (
          <UnitActor key={unit.id} unit={unit} />
        ))}
      </Canvas>

      {/* Baroque Chiaroscuro Edge Vignette (Subtly frames extreme corners while keeping the tactical battlefield clearly legible) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: frameStyle.vignetteGradient,
        }}
      />
    </div>
  );
}
