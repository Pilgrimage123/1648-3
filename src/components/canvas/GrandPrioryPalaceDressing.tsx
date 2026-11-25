/**
 * Historical & Architectural 3D Dressing for Mission 1:
 * Grand Priory Palace of the Knights of Malta (Velkopřevorský palác, Malá Strana, Night of July 26, 1648).
 *
 * Implements:
 * 1. Soaring High-Ceiling Baroque Architecture:
 *    - Vaulted stucco ceiling ribs, gilded ceiling rosettes, fluted Corinthian pilasters, and raised rear palace walls
 *      with arched Baroque clerestory windows and broken pediments (Carlo Lurago early-Baroque style).
 *    - 8 Multi-tiered gilded brass & Bohemian crystal chandeliers (`BaroqueCrystalChandelier`) with flickering candle
 *      crowns and warm interior fill lighting.
 * 2. Historically Equipped Rooms (Strictly Perimeter-Aligned ±0.35m per ADR-0007 Pillar 1):
 *    - Grand Prior Rudolf Count Colloredo-Wallsee's Bedchamber & Study (P1 West Wing): Four-poster cardinal-velvet
 *      canopy bed with rumpled sheets, war desk with fortification maps of Prague & celestial globe, Maltese reliquary
 *      prie-dieu altar, carved walnut bookcases, and upholstered Baroque furniture covers.
 *    - Imperial Grand Staircase & Knight's Hall (P1/P0 Central Wing): Monumental Maltese heraldic achievement of
 *      Count Colloredo, classical marble statues in niches, Chiaroscuro oil paintings (Caravaggio/Rembrandt style),
 *      woven Maltese tapestries, and Cour d'honneur inlaid Maltese compass rose & corner wall fountains.
 *    - East Convent Gallery & Chapter Hall (P1/P0 East Wing): 17th-century gilded harpsichord (cembalo), banquet
 *      credenzas with silver chalices, and chapter portraits.
 *    - Maltese Priory Armory & Sala Terrena (P0 West & South): Pike & halberd racks, blackened steel cuirass stands,
 *      munitions chests, and rustic bossage garden portal arches.
 * 3. Historical July 26, 1648 Perimeter Landmarks:
 *    - Twin Gothic-Baroque towers of the Church of Our Lady Beneath the Chain (Kostel Panny Marie pod řetězem) on the
 *      south horizon (`z > 27`).
 *    - Velkopřevorský mlýn rotating wooden waterwheel on the Čertovka millrace (`z: 0..4`) beside the escape skiff.
 *    - Classical sandstone garden statues & calm boxwood parterre borders around the Belvedere pavilion (`z: 5..15`).
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getTileVisibility } from "../../core/FogOfWar";
import { useGameStore } from "../../store/useGameStore";
import { getBaroqueTextureSet } from "./baroqueMaterials";
import {
  continuousGridToWorld,
  FLOOR_HEIGHT,
} from "./worldCoords";

const noRaycast = () => null;

const BRASS_GOLD = "#d4a73f";
const BRIGHT_GOLD = "#facc15";
const CARDINAL_VELVET = "#6b151e";
const DEEP_CRIMSON = "#4a1218";
const WALNUT_DARK = "#362216";
const WALNUT_MID = "#4d3120";
const STUCCO_WARM = "#a69786";
const LIMESTONE_TRIM = "#75695d";

interface PalaceChandelierLightSpec {
  position: [number, number, number];
  color: string;
  intensity: number;
  distance: number;
  decay: number;
}

function makeLightPos(
  x: number,
  y: 0 | 1 | 2,
  z: number,
  yOffset: number,
): [number, number, number] {
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  return [wx, wy + yOffset, wz];
}

const PALACE_LIGHTS_P1: (PalaceChandelierLightSpec | null)[] = [
  {
    position: makeLightPos(11.5, 1, 21.5, 2.5),
    color: "#ffd27d",
    intensity: 4.8,
    distance: 18.0,
    decay: 1.35,
  },
  {
    position: makeLightPos(5.0, 1, 22.0, 2.4),
    color: "#ffbe55",
    intensity: 4.5,
    distance: 15.0,
    decay: 1.35,
  },
  {
    position: makeLightPos(18.0, 1, 21.5, 2.4),
    color: "#ffca68",
    intensity: 4.2,
    distance: 15.0,
    decay: 1.4,
  },
];

const PALACE_LIGHTS_P0: (PalaceChandelierLightSpec | null)[] = [
  {
    position: makeLightPos(11.5, 0, 20.5, 2.0),
    color: "#ffd27d",
    intensity: 4.2,
    distance: 16.0,
    decay: 1.4,
  },
  {
    position: makeLightPos(5.5, 0, 21.0, 1.95),
    color: "#ffbe55",
    intensity: 3.8,
    distance: 14.0,
    decay: 1.4,
  },
  null,
];

/**
 * Framed Chiaroscuro Oil Painting (Caravaggio / Rembrandt style) with procedural oil canvas,
 * chased gilded Baroque frame, corner rosettes, and crest cartouche.
 */
function BaroqueMasterpiecePainting({
  x,
  y,
  z,
  rotY = 0,
  width = 1.35,
  height = 0.92,
  canvasTone = "#2c1812",
  variant = 0,
  opacity = 1,
}: {
  x: number;
  y: 0 | 1;
  z: number;
  rotY?: number;
  width?: number;
  height?: number;
  canvasTone?: string;
  subjectTone?: string;
  variant?: 0 | 1 | 2 | 3;
  opacity?: number;
}) {
  const textures = useMemo(() => getBaroqueTextureSet(), []);
  const paintingTex = textures.paintingTextures[variant] ?? null;
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  const isTransparent = opacity < 0.99;
  if (opacity <= 0.02) return null;

  const hw = width * 0.48;
  const hh = height * 0.48;

  return (
    <group position={[wx, wy + 1.68, wz]} rotation={[0, rotY, 0]}>
      {/* Chased gilded outer moulded frame */}
      <mesh raycast={noRaycast}>
        <boxGeometry args={[width, height, 0.06]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.86}
          roughness={0.24}
          bumpMap={textures.gildedFiligreeBump}
          bumpScale={0.045}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Inner beveled gold liner */}
      <mesh position={[0, 0, 0.012]} raycast={noRaycast}>
        <boxGeometry args={[width - 0.1, height - 0.1, 0.044]} />
        <meshStandardMaterial
          color={BRIGHT_GOLD}
          metalness={0.9}
          roughness={0.2}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Four gilded Baroque corner bosses */}
      {[
        [-hw, -hh],
        [hw, -hh],
        [-hw, hh],
        [hw, hh],
      ].map(([cx, cy], ci) => (
        <mesh key={`corner-${ci}`} position={[cx!, cy!, 0.022]} raycast={noRaycast}>
          <boxGeometry args={[0.095, 0.095, 0.045]} />
          <meshStandardMaterial
            color={BRIGHT_GOLD}
            metalness={0.88}
            roughness={0.22}
            bumpMap={textures.gildedFiligreeBump}
            bumpScale={0.035}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
      ))}
      {/* Top Baroque scrolled crest cartouche */}
      <mesh position={[0, height * 0.54, 0.018]} raycast={noRaycast}>
        <boxGeometry args={[width * 0.34, 0.13, 0.065]} />
        <meshStandardMaterial
          color={BRIGHT_GOLD}
          metalness={0.88}
          roughness={0.2}
          bumpMap={textures.gildedFiligreeBump}
          bumpScale={0.04}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Procedural Caravaggio / Rembrandt Chiaroscuro oil canvas */}
      <mesh position={[0, 0, 0.036]} raycast={noRaycast}>
        <planeGeometry args={[width - 0.18, height - 0.18]} />
        <meshStandardMaterial
          map={paintingTex}
          color={paintingTex ? "#ffffff" : canvasTone}
          roughness={0.44}
          metalness={0.04}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/**
 * Woven Crimson & Gold Maltese Heraldic Wall Tapestry (Gobelín s maltézským křížem)
 * rendered with procedural brocade/cross CanvasTexture and brass spearhead finials.
 */
function MalteseHeraldicTapestry({
  x,
  y,
  z,
  rotY = 0,
  opacity = 1,
}: {
  x: number;
  y: 0 | 1;
  z: number;
  rotY?: number;
  opacity?: number;
}) {
  const textures = useMemo(() => getBaroqueTextureSet(), []);
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  const isTransparent = opacity < 0.99;
  if (opacity <= 0.02) return null;

  return (
    <group position={[wx, wy + 1.62, wz]} rotation={[0, rotY, 0]}>
      {/* Brass tapestry rod with spearhead finials */}
      <mesh position={[0, 0.72, 0.022]} rotation={[0, 0, Math.PI * 0.5]} raycast={noRaycast}>
        <cylinderGeometry args={[0.024, 0.024, 1.36, 8]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.88}
          roughness={0.22}
          bumpMap={textures.gildedFiligreeBump}
          bumpScale={0.03}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {[-0.7, 0.7].map((fx, fi) => (
        <mesh
          key={`finial-${fi}`}
          position={[fx, 0.72, 0.022]}
          rotation={[0, 0, fx < 0 ? Math.PI * 0.5 : -Math.PI * 0.5]}
          raycast={noRaycast}
        >
          <coneGeometry args={[0.045, 0.11, 6]} />
          <meshStandardMaterial
            color={BRIGHT_GOLD}
            metalness={0.9}
            roughness={0.2}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
      ))}
      {/* Carved walnut wall brackets */}
      {[-0.5, 0.5].map((bx, bi) => (
        <mesh key={`br-${bi}`} position={[bx, 0.72, 0.008]} raycast={noRaycast}>
          <boxGeometry args={[0.06, 0.11, 0.05]} />
          <meshStandardMaterial
            color={WALNUT_DARK}
            roughness={0.62}
            bumpMap={textures.carvedWalnutBump}
            bumpScale={0.04}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
      ))}
      {/* Backing velvet panel */}
      <mesh position={[0, 0, 0.018]} raycast={noRaycast}>
        <boxGeometry args={[1.14, 1.38, 0.026]} />
        <meshStandardMaterial
          color={DEEP_CRIMSON}
          roughness={0.86}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Procedural woven Maltese Cross & gilded brocade face */}
      <mesh position={[0, 0, 0.034]} raycast={noRaycast}>
        <planeGeometry args={[1.12, 1.36]} />
        <meshStandardMaterial
          map={textures.malteseTapestryTexture}
          color={textures.malteseTapestryTexture ? "#ffffff" : CARDINAL_VELVET}
          roughness={0.78}
          metalness={0.08}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/**
 * Perimeter Gilded Brass Wall Sconce (Barokní nástěnný svícen) — emissive flame only,
 * zero extra pointLights, strictly raycast={noRaycast}.
 */
function BaroqueWallSconce({
  x,
  y,
  z,
  rotY = 0,
  opacity = 1,
}: {
  x: number;
  y: 0 | 1;
  z: number;
  rotY?: number;
  opacity?: number;
}) {
  const textures = useMemo(() => getBaroqueTextureSet(), []);
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  const isTransparent = opacity < 0.99;
  if (opacity <= 0.02) return null;

  return (
    <group position={[wx, wy + 1.56, wz]} rotation={[0, rotY, 0]}>
      {/* Chased brass backplate */}
      <mesh raycast={noRaycast}>
        <boxGeometry args={[0.14, 0.28, 0.03]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.88}
          roughness={0.22}
          bumpMap={textures.gildedFiligreeBump}
          bumpScale={0.04}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Extending brass candle arm */}
      <mesh position={[0, -0.02, 0.09]} rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.014, 0.018, 0.16, 6]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.88}
          roughness={0.22}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Drip bobeche cup */}
      <mesh position={[0, 0.0, 0.16]} raycast={noRaycast}>
        <cylinderGeometry args={[0.045, 0.025, 0.025, 8]} />
        <meshStandardMaterial
          color={BRIGHT_GOLD}
          metalness={0.9}
          roughness={0.18}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Beeswax taper & amber flame */}
      <mesh position={[0, 0.065, 0.16]} raycast={noRaycast}>
        <cylinderGeometry args={[0.014, 0.016, 0.1, 6]} />
        <meshStandardMaterial
          color="#f8f4e8"
          roughness={0.62}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.135, 0.16]} raycast={noRaycast}>
        <coneGeometry args={[0.019, 0.055, 5]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#f97316"
          emissiveIntensity={1.75}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/**
 * Suspended Tiered Gilded Brass & Bohemian Crystal Chandelier (Barokní křišťálový lustr).
 * Anchored high above head clearance (wy + 2.02..2.36m) with subtle pendulum draft sway.
 */
function BaroqueCrystalChandelier({
  x,
  y,
  z,
  opacity = 1,
}: {
  x: number;
  y: 0 | 1;
  z: number;
  opacity?: number;
}) {
  const textures = useMemo(() => getBaroqueTextureSet(), []);
  const swayRef = useRef<THREE.Group>(null);
  const phase = x * 0.7 + z * 0.4;

  useFrame((state) => {
    if (!swayRef.current) return;
    const t = state.clock.elapsedTime;
    swayRef.current.rotation.z = Math.sin(t * 0.72 + phase) * 0.024;
    swayRef.current.rotation.x = Math.cos(t * 0.58 + phase) * 0.016;
  });

  if (opacity <= 0.02) return null;
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  const isTransparent = opacity < 0.99;

  return (
    <group position={[wx, wy + 2.26, wz]}>
      <group ref={swayRef}>
        {/* Ceiling suspension rod */}
        <mesh position={[0, -0.02, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.88}
            roughness={0.22}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        {/* Central turned brass baluster boss */}
        <mesh position={[0, -0.2, 0]} raycast={noRaycast}>
          <sphereGeometry args={[0.085, 10, 8]} />
          <meshStandardMaterial
            color={BRIGHT_GOLD}
            metalness={0.9}
            roughness={0.18}
            bumpMap={textures.gildedFiligreeBump}
            bumpScale={0.035}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        {/* Main gilded corona hoop */}
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.36, 0.025, 6, 20]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.88}
            roughness={0.22}
            bumpMap={textures.gildedFiligreeBump}
            bumpScale={0.03}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        {/* Inner Bohemian crystal prism crown */}
        <mesh position={[0, -0.13, 0]} rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.2, 0.019, 6, 16]} />
          <meshStandardMaterial
            color="#f1f5f9"
            emissive="#fef3c7"
            emissiveIntensity={0.26}
            metalness={0.32}
            roughness={0.08}
            envMapIntensity={1.6}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        {/* Lower faceted Bohemian crystal pear finial */}
        <mesh position={[0, -0.32, 0]} rotation={[Math.PI, 0, 0]} raycast={noRaycast}>
          <coneGeometry args={[0.068, 0.16, 8]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#fef3c7"
            emissiveIntensity={0.3}
            roughness={0.08}
            metalness={0.38}
            envMapIntensity={1.7}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        {/* 6 radial gilded scroll arms, crystal drops & beeswax candles */}
        {[0, 1, 2, 3, 4, 5].map((ci) => {
          const ang = (ci / 6) * Math.PI * 2;
          const cx = Math.cos(ang) * 0.36;
          const cz = Math.sin(ang) * 0.36;
          return (
            <group key={`ch-candle-${ci}`}>
              {/* Radial brass arm */}
              <mesh
                position={[cx * 0.5, -0.2, cz * 0.5]}
                rotation={[0, -ang, Math.PI * 0.5]}
                raycast={noRaycast}
              >
                <cylinderGeometry args={[0.012, 0.014, 0.34, 6]} />
                <meshStandardMaterial
                  color={BRASS_GOLD}
                  metalness={0.86}
                  roughness={0.24}
                  transparent={isTransparent}
                  opacity={opacity}
                />
              </mesh>
              <group position={[cx, -0.15, cz]}>
                {/* Hanging crystal prism drop */}
                <mesh position={[0, -0.095, 0]} rotation={[Math.PI, 0, 0]} raycast={noRaycast}>
                  <coneGeometry args={[0.022, 0.065, 5]} />
                  <meshStandardMaterial
                    color="#f8fafc"
                    emissive="#fde68a"
                    emissiveIntensity={0.25}
                    roughness={0.08}
                    metalness={0.35}
                    transparent={isTransparent}
                    opacity={opacity}
                  />
                </mesh>
                <mesh raycast={noRaycast}>
                  <cylinderGeometry args={[0.016, 0.018, 0.085, 6]} />
                  <meshStandardMaterial
                    color="#f8fafc"
                    roughness={0.6}
                    transparent={isTransparent}
                    opacity={opacity}
                  />
                </mesh>
                <mesh position={[0, 0.068, 0]} raycast={noRaycast}>
                  <coneGeometry args={[0.02, 0.055, 5]} />
                  <meshStandardMaterial
                    color="#fef08a"
                    emissive="#f97316"
                    emissiveIntensity={1.75}
                    transparent={isTransparent}
                    opacity={opacity}
                  />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

export function GrandPrioryPalaceDressing() {
  const scenario = useGameStore((s) => s.scenario);
  const activeFloor = useGameStore((s) => s.activeFloor);
  const actionMode = useGameStore((s) => s.actionMode);
  const activeProjectile = useGameStore((s) => s.activeProjectile);
  const fogSnapshot = useGameStore((s) => s.fogSnapshot);
  const fogOfWarEnabled = useGameStore((s) => s.fogOfWarEnabled);
  const waterwheelRef = useRef<THREE.Group>(null);
  const textures = useMemo(() => getBaroqueTextureSet(), []);

  const isShootingView = actionMode === "shoot" || activeProjectile !== null;

  useFrame((_, delta) => {
    if (waterwheelRef.current) {
      waterwheelRef.current.rotation.x -= delta * 0.65;
    }
  });

  if (scenario !== "mission1") return null;

  const isExplored = (x: number, y: 0 | 1 | 2, z: number) =>
    getTileVisibility(
      { x: Math.round(x), y, z: Math.round(z) },
      fogSnapshot,
      fogOfWarEnabled,
    ) !== "unexplored";

  // Floor cutaway visibility:
  // When viewing P0, P1 interior dressing hides/fades so P0 is 100% unobstructed.
  const p1Opacity = activeFloor < 1 ? 0.03 : isShootingView ? 0.45 : 1.0;

  const activeChandelierLights =
    activeFloor >= 1 ? PALACE_LIGHTS_P1 : PALACE_LIGHTS_P0;

  return (
    <group>
      {/* =====================================================================
          1. WARM BAROQUE CHANDELIER INTERIOR LIGHTS (Warm-vs-Cool Chiaroscuro)
             Fixed 3-slot pool toggled via visible/intensity to avoid shader recompilation.
         ===================================================================== */}
      {[0, 1, 2].map((slotIdx) => {
        const cfg = activeChandelierLights[slotIdx];
        return (
          <pointLight
            key={`palace-chandelier-light-${slotIdx}`}
            position={cfg ? cfg.position : [0, -10, 0]}
            color={cfg ? cfg.color : "#ffd27d"}
            intensity={cfg ? cfg.intensity : 0}
            distance={cfg ? cfg.distance : 1}
            decay={cfg ? cfg.decay : 1.4}
            visible={Boolean(cfg)}
          />
        );
      })}

      {/* =====================================================================
          3. GRAND PRIOR COLLOREDO'S BEDCHAMBER & STUDY (P1: x: 3..7, z: 22..26)
             Strictly Perimeter-Aligned so walkable tiles stay 100% clear!
         ===================================================================== */}
      {p1Opacity > 0.05 && isExplored(11, 1, 21) && (
        <group>
          {/* 3A. Marshal Colloredo's Four-Poster Baroque Canopy Bed (Nebesová postel)
              Flush against the west wall at x: 2.85, z: 25.0 */}
          {(() => {
            const [bx, by, bz] = continuousGridToWorld(2.88, 1, 25.0);
            return (
              <group position={[bx, by, bz]}>
                {/* Raised walnut dais platform */}
                <mesh position={[0, 0.14, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[1.18, 0.28, 1.68]} />
                  <meshStandardMaterial
                    color={WALNUT_DARK}
                    roughness={0.62}
                    bumpMap={textures.carvedWalnutBump}
                    bumpScale={0.045}
                  />
                </mesh>
                {/* Gilded base moulding */}
                <mesh position={[0, 0.04, 0]} raycast={noRaycast}>
                  <boxGeometry args={[1.24, 0.06, 1.74]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.86}
                    roughness={0.24}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.035}
                  />
                </mesh>
                {/* Rumpled white linen mattress & thrown-back crimson quilt (Colloredo just leapt out!) */}
                <mesh position={[0.04, 0.36, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[1.04, 0.2, 1.52]} />
                  <meshStandardMaterial color="#f1ece1" roughness={0.78} />
                </mesh>
                <mesh
                  position={[0.16, 0.47, 0.18]}
                  rotation={[0.08, 0.22, -0.12]}
                  castShadow
                  raycast={noRaycast}
                >
                  <boxGeometry args={[0.76, 0.08, 1.05]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.75} />
                </mesh>
                {/* Embroidered bolster pillows at headboard */}
                <mesh position={[-0.32, 0.52, -0.34]} rotation={[0, 0, 0.28]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.11, 0.11, 0.62, 10]} />
                  <meshStandardMaterial color="#f8f5ec" roughness={0.7} />
                </mesh>
                <mesh position={[-0.32, 0.52, 0.34]} rotation={[0, 0, 0.28]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.11, 0.11, 0.62, 10]} />
                  <meshStandardMaterial color="#f8f5ec" roughness={0.7} />
                </mesh>
                {/* Carved Walnut & Gilded Headboard with Maltese Crest */}
                <mesh position={[-0.54, 0.88, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.12, 1.32, 1.62]} />
                  <meshStandardMaterial
                    color={WALNUT_MID}
                    roughness={0.55}
                    bumpMap={textures.carvedWalnutBump}
                    bumpScale={0.05}
                  />
                </mesh>
                <mesh position={[-0.47, 1.15, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.04, 0.38, 0.38]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.88}
                    roughness={0.2}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.04}
                  />
                </mesh>
                {/* Four Twisted Solomonic Gilded Columns */}
                {[
                  [-0.52, -0.76],
                  [-0.52, 0.76],
                  [0.52, -0.76],
                  [0.52, 0.76],
                ].map(([px, pz], i) => (
                  <group key={`bed-post-${i}`} position={[px!, 0, pz!]}>
                    <mesh position={[0, 1.12, 0]} castShadow raycast={noRaycast}>
                      <cylinderGeometry args={[0.048, 0.058, 2.05, 10]} />
                      <meshStandardMaterial
                        color={BRASS_GOLD}
                        metalness={0.86}
                        roughness={0.22}
                        bumpMap={textures.flutedColumnBump}
                        bumpScale={0.045}
                      />
                    </mesh>
                    {/* Gilded finial plume above canopy */}
                    <mesh position={[0, 2.34, 0]} raycast={noRaycast}>
                      <sphereGeometry args={[0.075, 10, 10]} />
                      <meshStandardMaterial color={BRIGHT_GOLD} metalness={0.9} roughness={0.18} />
                    </mesh>
                  </group>
                ))}
                {/* High Cardinal Velvet Tester Canopy & Gold Bullion Valance */}
                <mesh position={[0, 2.18, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[1.24, 0.18, 1.74]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.78} />
                </mesh>
                <mesh position={[0, 2.08, 0]} raycast={noRaycast}>
                  <boxGeometry args={[1.28, 0.05, 1.78]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.88}
                    roughness={0.2}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.035}
                  />
                </mesh>
                {/* Tied-back crimson velvet bed curtains */}
                <mesh position={[-0.5, 1.22, -0.74]} rotation={[0.12, 0, 0]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.09, 0.14, 1.65, 8]} />
                  <meshStandardMaterial color={DEEP_CRIMSON} roughness={0.82} />
                </mesh>
                <mesh position={[-0.5, 1.22, 0.74]} rotation={[-0.12, 0, 0]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.09, 0.14, 1.65, 8]} />
                  <meshStandardMaterial color={DEEP_CRIMSON} roughness={0.82} />
                </mesh>
              </group>
            );
          })()}

          {/* 3B. Marshal's War Desk, Prague Fortification Maps & Celestial Globe (x: 2.75, z: 22.8) */}
          {(() => {
            const [dx, dy, dz] = continuousGridToWorld(2.78, 1, 22.75);
            return (
              <group position={[dx, dy, dz]}>
                {/* Carved walnut desk body */}
                <mesh position={[0, 0.42, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.72, 0.82, 1.32]} />
                  <meshStandardMaterial
                    color={WALNUT_MID}
                    roughness={0.55}
                    bumpMap={textures.carvedWalnutBump}
                    bumpScale={0.045}
                  />
                </mesh>
                <mesh position={[0, 0.84, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.78, 0.05, 1.38]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.84}
                    roughness={0.24}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.035}
                  />
                </mesh>
                {/* Unrolled parchment map of Prague fortifications with crimson wax seal */}
                <mesh position={[0.04, 0.87, -0.12]} rotation={[0, 0.15, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.48, 0.015, 0.64]} />
                  <meshStandardMaterial color="#f3e8d2" roughness={0.68} />
                </mesh>
                <mesh position={[0.18, 0.885, 0.14]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.035, 0.035, 0.015, 10]} />
                  <meshStandardMaterial color="#dc2626" roughness={0.4} />
                </mesh>
                {/* Brass Celestial Globe on carved stand next to desk */}
                <group position={[0.02, 0, 0.92]}>
                  <mesh position={[0, 0.32, 0]} raycast={noRaycast}>
                    <cylinderGeometry args={[0.06, 0.18, 0.64, 10]} />
                    <meshStandardMaterial
                      color={WALNUT_DARK}
                      roughness={0.62}
                      bumpMap={textures.carvedWalnutBump}
                      bumpScale={0.04}
                    />
                  </mesh>
                  <mesh position={[0, 0.78, 0]} raycast={noRaycast}>
                    <sphereGeometry args={[0.22, 14, 14]} />
                    <meshStandardMaterial
                      color="#d6c49e"
                      metalness={0.42}
                      roughness={0.36}
                    />
                  </mesh>
                  <mesh position={[0, 0.78, 0]} rotation={[0.4, 0, 0]} raycast={noRaycast}>
                    <torusGeometry args={[0.25, 0.016, 8, 20]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.9} roughness={0.18} />
                  </mesh>
                </group>
              </group>
            );
          })()}

          {/* 3C. Maltese Reliquary Altar & Kneeling Prie-Dieu (x: 5.0, z: 25.24, flush against z = 26 wall) */}
          {(() => {
            const [ax, ay, az] = continuousGridToWorld(5.0, 1, 25.24);
            return (
              <group position={[ax, ay, az]}>
                {/* Kneeling velvet cushion & walnut prie-dieu */}
                <mesh position={[0, 0.06, -0.28]} raycast={noRaycast}>
                  <boxGeometry args={[0.68, 0.12, 0.34]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.48, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.92, 0.92, 0.42]} />
                  <meshStandardMaterial
                    color={WALNUT_DARK}
                    roughness={0.58}
                    bumpMap={textures.carvedWalnutBump}
                    bumpScale={0.045}
                  />
                </mesh>
                {/* Altar cloth & Golden Maltese Reliquary Cross */}
                <mesh position={[0, 0.95, -0.02]} raycast={noRaycast}>
                  <boxGeometry args={[0.96, 0.04, 0.46]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.7} />
                </mesh>
                <mesh position={[0, 1.32, 0.06]} raycast={noRaycast}>
                  <boxGeometry args={[0.06, 0.56, 0.05]} />
                  <meshStandardMaterial
                    color={BRIGHT_GOLD}
                    metalness={0.92}
                    roughness={0.16}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.03}
                  />
                </mesh>
                <mesh position={[0, 1.42, 0.06]} raycast={noRaycast}>
                  <boxGeometry args={[0.36, 0.06, 0.05]} />
                  <meshStandardMaterial
                    color={BRIGHT_GOLD}
                    metalness={0.92}
                    roughness={0.16}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.03}
                  />
                </mesh>
              </group>
            );
          })()}

          {/* 3D. Baroque Walnut Credenza & Bookcase along Colloredo's Suite Perimeter */}
          {(() => {
            const [lx, ly, lz] = continuousGridToWorld(6.35, 1, 25.32);
            const [cx, cy, cz] = continuousGridToWorld(7.38, 1, 24.45);
            return (
              <group>
                {/* Low Baroque Library Cabinet with Leather Tomes against south wall (z = 25.32) */}
                <group position={[lx, ly, lz]}>
                  <mesh position={[0, 0.42, 0]} castShadow raycast={noRaycast}>
                    <boxGeometry args={[1.22, 0.82, 0.38]} />
                    <meshStandardMaterial
                      color={WALNUT_DARK}
                      roughness={0.58}
                      bumpMap={textures.carvedWalnutBump}
                      bumpScale={0.045}
                    />
                  </mesh>
                  <mesh position={[0, 0.85, 0]} raycast={noRaycast}>
                    <boxGeometry args={[1.28, 0.05, 0.44]} />
                    <meshStandardMaterial
                      color={BRASS_GOLD}
                      metalness={0.84}
                      roughness={0.24}
                      bumpMap={textures.gildedFiligreeBump}
                      bumpScale={0.035}
                    />
                  </mesh>
                  <mesh position={[-0.22, 0.93, 0]} raycast={noRaycast}>
                    <boxGeometry args={[0.38, 0.12, 0.26]} />
                    <meshStandardMaterial color="#7c2d12" roughness={0.7} />
                  </mesh>
                </group>
                {/* Low Carved Walnut Credenza along x = 7.38 south of the (8, 1, 23) archway */}
                <group position={[cx, cy, cz]}>
                  <mesh position={[0, 0.42, 0]} castShadow raycast={noRaycast}>
                    <boxGeometry args={[0.38, 0.82, 1.45]} />
                    <meshStandardMaterial
                      color={WALNUT_MID}
                      roughness={0.56}
                      bumpMap={textures.carvedWalnutBump}
                      bumpScale={0.045}
                    />
                  </mesh>
                  <mesh position={[0, 0.85, 0]} raycast={noRaycast}>
                    <boxGeometry args={[0.44, 0.05, 1.52]} />
                    <meshStandardMaterial
                      color={BRASS_GOLD}
                      metalness={0.84}
                      roughness={0.24}
                      bumpMap={textures.gildedFiligreeBump}
                      bumpScale={0.035}
                    />
                  </mesh>
                </group>
              </group>
            );
          })()}

          {/* =====================================================================
              4. KNIGHT'S HALL, GRAND STAIRCASE & EAST CONVENT GALLERY (P1)
             ===================================================================== */}
          {/* Classical Marble Statues on Plinths flanking Grand Staircase (x: 9.7 & x: 13.3, z: 26.32) */}
          {[9.7, 13.3].map((sx, idx) => {
            const [stx, sty, stz] = continuousGridToWorld(sx, 1, 26.32);
            return (
              <group key={`stair-statue-${idx}`} position={[stx, sty, stz]}>
                <mesh position={[0, 0.45, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.48, 0.9, 0.48]} />
                  <meshStandardMaterial
                    color={LIMESTONE_TRIM}
                    roughness={0.62}
                    bumpMap={textures.masonryAshlarBump}
                    bumpScale={0.04}
                  />
                </mesh>
                <mesh position={[0, 0.92, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.54, 0.08, 0.54]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.86}
                    roughness={0.22}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.035}
                  />
                </mesh>
                {/* Classical marble torso & draped toga */}
                <mesh position={[0, 1.38, 0]} castShadow raycast={noRaycast}>
                  <cylinderGeometry args={[0.14, 0.18, 0.82, 10]} />
                  <meshStandardMaterial color="#e7e2d8" roughness={0.36} metalness={0.04} />
                </mesh>
                <mesh position={[0, 1.92, 0]} castShadow raycast={noRaycast}>
                  <sphereGeometry args={[0.13, 10, 10]} />
                  <meshStandardMaterial color="#e7e2d8" roughness={0.36} metalness={0.04} />
                </mesh>
              </group>
            );
          })}

          {/* 17th-Century Italian Gilded Harpsichord (Cembalo) in East Convent Gallery (x: 20.22, z: 22.8) */}
          {(() => {
            const [cx, cy, cz] = continuousGridToWorld(20.22, 1, 22.8);
            return (
              <group position={[cx, cy, cz]}>
                {/* Turned gilded legs */}
                {[-0.55, 0, 0.55].map((lz, i) => (
                  <mesh key={`h-leg-${i}`} position={[0, 0.36, lz]} raycast={noRaycast}>
                    <cylinderGeometry args={[0.04, 0.03, 0.72, 8]} />
                    <meshStandardMaterial
                      color={BRASS_GOLD}
                      metalness={0.86}
                      roughness={0.22}
                      bumpMap={textures.flutedColumnBump}
                      bumpScale={0.035}
                    />
                  </mesh>
                ))}
                {/* Wing-shaped harpsichord case */}
                <mesh position={[0, 0.78, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.68, 0.22, 1.56]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.48} />
                </mesh>
                <mesh position={[0, 0.89, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.72, 0.04, 1.6]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.88}
                    roughness={0.2}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.04}
                  />
                </mesh>
                {/* Ivory keyboard manual */}
                <mesh position={[-0.28, 0.82, -0.45]} raycast={noRaycast}>
                  <boxGeometry args={[0.18, 0.06, 0.54]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                </mesh>
              </group>
            );
          })()}

          {/* Chiaroscuro Oil Paintings, Maltese Tapestries & Wall Sconces on verified P1 full-height walls */}
          <BaroqueMasterpiecePainting
            x={3.0}
            y={1}
            z={21.54}
            rotY={0}
            width={1.15}
            height={0.78}
            variant={0}
            opacity={p1Opacity}
          />
          <BaroqueMasterpiecePainting
            x={4.0}
            y={1}
            z={21.54}
            rotY={0}
            width={1.1}
            height={0.76}
            variant={1}
            opacity={p1Opacity}
          />
          <BaroqueMasterpiecePainting
            x={7.0}
            y={1}
            z={21.54}
            rotY={0}
            width={1.15}
            height={0.78}
            variant={2}
            opacity={p1Opacity}
          />
          <BaroqueWallSconce x={5.5} y={1} z={21.52} rotY={0} opacity={p1Opacity} />
          <MalteseHeraldicTapestry
            x={3.0}
            y={1}
            z={20.46}
            rotY={Math.PI}
            opacity={p1Opacity}
          />
          <BaroqueMasterpiecePainting
            x={4.0}
            y={1}
            z={20.46}
            rotY={Math.PI}
            width={1.12}
            height={0.76}
            variant={3}
            opacity={p1Opacity}
          />
          <MalteseHeraldicTapestry
            x={7.0}
            y={1}
            z={20.46}
            rotY={Math.PI}
            opacity={p1Opacity}
          />
          <BaroqueWallSconce x={5.5} y={1} z={20.48} rotY={Math.PI} opacity={p1Opacity} />

          {/* Three Suspended P1 Bohemian Crystal Chandeliers */}
          <BaroqueCrystalChandelier x={11.5} y={1} z={22.0} opacity={p1Opacity} />
          <BaroqueCrystalChandelier x={5.0} y={1} z={23.5} opacity={p1Opacity} />
          <BaroqueCrystalChandelier x={17.5} y={1} z={22.0} opacity={p1Opacity} />

          {/* Four Baroque Sandstone Balustrade Urns on P1 Belvedere Corners */}
          {[
            [8.62, 8.62],
            [14.38, 8.62],
            [8.62, 12.38],
            [14.38, 12.38],
          ].map(([ux, uz], ui) => {
            const [uwx, uwy, uwz] = continuousGridToWorld(ux!, 1, uz!);
            return (
              <group key={`belv-urn-${ui}`} position={[uwx, uwy, uwz]}>
                <mesh position={[0, 0.14, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.24, 0.28, 0.24]} />
                  <meshStandardMaterial
                    color={LIMESTONE_TRIM}
                    roughness={0.72}
                    bumpMap={textures.masonryAshlarBump}
                    bumpScale={0.04}
                  />
                </mesh>
                <mesh position={[0, 0.36, 0]} castShadow raycast={noRaycast}>
                  <cylinderGeometry args={[0.11, 0.06, 0.2, 8]} />
                  <meshStandardMaterial
                    color={STUCCO_WARM}
                    roughness={0.66}
                    bumpMap={textures.flutedColumnBump}
                    bumpScale={0.035}
                  />
                </mesh>
                <mesh position={[0, 0.48, 0]} raycast={noRaycast}>
                  <sphereGeometry args={[0.055, 8, 6]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.86} roughness={0.22} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* =====================================================================
          5. GROUND FLOOR MALTESE ARMORY, COUR D'HONNEUR & SALA TERRENA (y = 0)
         ===================================================================== */}
      {isExplored(11, 0, 20) && (
      <group>
        {/* 5A. Cour d'honneur Subtle Inlaid Stone Compass Rose (x: 11.5, y: 0, z: 19.0)
            Calm low-contrast stone mosaic (height 0.012m) preserving grid & AP zone readability. */}
        {(() => {
          const [mx, my, mz] = continuousGridToWorld(11.5, 0, 19.0);
          return (
            <group position={[mx, my + 0.006, mz]}>
              <mesh rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <ringGeometry args={[0.72, 0.82, 24]} />
                <meshStandardMaterial
                  color="#6b5c4f"
                  metalness={0.05}
                  roughness={0.88}
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                />
              </mesh>
              <mesh rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <circleGeometry args={[0.71, 24]} />
                <meshStandardMaterial
                  color="#4d4138"
                  roughness={0.9}
                  metalness={0.04}
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                />
              </mesh>
              {/* Subtle inlaid stone compass bars with separated Y offsets to prevent Z-fighting */}
              <mesh position={[0, 0.002, 0]} rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <planeGeometry args={[1.15, 0.22]} />
                <meshStandardMaterial
                  color="#6b5c4f"
                  metalness={0.05}
                  roughness={0.88}
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  polygonOffsetUnits={-2}
                />
              </mesh>
              <mesh position={[0, 0.004, 0]} rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <planeGeometry args={[0.22, 1.15]} />
                <meshStandardMaterial
                  color="#6b5c4f"
                  metalness={0.05}
                  roughness={0.88}
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-3}
                  polygonOffsetUnits={-3}
                />
              </mesh>
            </group>
          );
        })()}

        {/* 5B. Maltese Armory Pike Racks & Steel Cuirass Stands (P0 West Wing: x: 2.62, z: 19..24) */}
        {[19.5, 22.0, 24.5].map((rz, idx) => {
          const [rx, ry, wz] = continuousGridToWorld(2.62, 0, rz);
          return (
            <group key={`armory-rack-${idx}`} position={[rx, ry, wz]}>
              {/* Oak weapon rack frame */}
              <mesh position={[0, 0.55, 0]} castShadow raycast={noRaycast}>
                <boxGeometry args={[0.28, 1.1, 1.24]} />
                <meshStandardMaterial
                  color={WALNUT_DARK}
                  roughness={0.72}
                  bumpMap={textures.carvedWalnutBump}
                  bumpScale={0.04}
                />
              </mesh>
              {/* Upright 17th-century pikes & halberds */}
              {[-0.42, -0.14, 0.14, 0.42].map((pz, pIdx) => (
                <group key={`pike-${pIdx}`} position={[0.06, 0, pz]}>
                  <mesh position={[0, 1.08, 0]} raycast={noRaycast}>
                    <cylinderGeometry args={[0.016, 0.018, 2.05, 6]} />
                    <meshStandardMaterial color="#5c3a21" roughness={0.7} />
                  </mesh>
                  <mesh position={[0, 2.14, 0]} raycast={noRaycast}>
                    <coneGeometry args={[0.045, 0.22, 4]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.18} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        })}

        {/* Blackened Steel Maltese Cuirass Armor Stands along North Armory Wall (z: 26.35, x: 4.0 & 6.5) */}
        {[4.0, 6.5].map((ax, idx) => {
          const [cx, cy, cz] = continuousGridToWorld(ax, 0, 26.35);
          return (
            <group key={`cuirass-stand-${idx}`} position={[cx, cy, cz]}>
              <mesh position={[0, 0.5, 0]} raycast={noRaycast}>
                <cylinderGeometry args={[0.05, 0.18, 1.0, 8]} />
                <meshStandardMaterial color={WALNUT_DARK} roughness={0.7} />
              </mesh>
              {/* Steel breastplate */}
              <mesh position={[0, 1.12, 0]} castShadow raycast={noRaycast}>
                <cylinderGeometry args={[0.2, 0.16, 0.48, 10]} />
                <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.2} />
              </mesh>
              {/* Comb morion helmet */}
              <mesh position={[0, 1.52, 0]} castShadow raycast={noRaycast}>
                <sphereGeometry args={[0.14, 10, 10]} />
                <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.18} />
              </mesh>
            </group>
          );
        })}

        {/* 5C. Sala Terrena Garden Façade Broken Pediment & Maltese Portal Crest (z = 15.52, x = 11.5) */}
        {(() => {
          const [fx, fy, fz] = continuousGridToWorld(11.5, 0, 15.52);
          return (
            <group position={[fx, fy, fz]}>
              {/* Twin fluted sandstone pilasters framing the garden portal */}
              {[-1.55, 1.55].map((px, idx) => (
                <group key={`facade-pilaster-${idx}`} position={[px, 0, 0]}>
                  <mesh position={[0, FLOOR_HEIGHT * 0.5, 0]} castShadow raycast={noRaycast}>
                    <boxGeometry args={[0.34, FLOOR_HEIGHT, 0.34]} />
                    <meshStandardMaterial
                      color={STUCCO_WARM}
                      roughness={0.65}
                      bumpMap={textures.flutedColumnBump}
                      bumpScale={0.055}
                    />
                  </mesh>
                  <mesh position={[0, FLOOR_HEIGHT - 0.12, 0]} raycast={noRaycast}>
                    <boxGeometry args={[0.44, 0.2, 0.44]} />
                    <meshStandardMaterial
                      color={BRASS_GOLD}
                      metalness={0.86}
                      roughness={0.22}
                      bumpMap={textures.gildedFiligreeBump}
                      bumpScale={0.04}
                    />
                  </mesh>
                </group>
              ))}
              {/* Broken Baroque Scrolled Pediment flanking central Maltese Crest (bounded <= 2.38m) */}
              <mesh position={[-0.86, FLOOR_HEIGHT - 0.12, -0.04]} rotation={[0, 0, 0.26]} castShadow raycast={noRaycast}>
                <boxGeometry args={[1.1, 0.18, 0.28]} />
                <meshStandardMaterial
                  color={STUCCO_WARM}
                  roughness={0.68}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.045}
                />
              </mesh>
              <mesh position={[0.86, FLOOR_HEIGHT - 0.12, -0.04]} rotation={[0, 0, -0.26]} castShadow raycast={noRaycast}>
                <boxGeometry args={[1.1, 0.18, 0.28]} />
                <meshStandardMaterial
                  color={STUCCO_WARM}
                  roughness={0.68}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.045}
                />
              </mesh>
              {/* Colloredo-Maltese Heraldic Cartouche Shield at apex */}
              <group position={[0, FLOOR_HEIGHT - 0.2, -0.08]}>
                <mesh raycast={noRaycast}>
                  <cylinderGeometry args={[0.32, 0.32, 0.12, 12]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.88}
                    roughness={0.2}
                    bumpMap={textures.gildedFiligreeBump}
                    bumpScale={0.04}
                  />
                </mesh>
                <mesh position={[0, 0, -0.05]} rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.25, 0.25, 0.06, 12]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.7} />
                </mesh>
                <mesh position={[0, 0, -0.09]} raycast={noRaycast}>
                  <boxGeometry args={[0.28, 0.08, 0.03]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.45} />
                </mesh>
                <mesh position={[0, 0, -0.09]} raycast={noRaycast}>
                  <boxGeometry args={[0.08, 0.28, 0.03]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.45} />
                </mesh>
              </group>
            </group>
          );
        })()}

        {/* 5D. Cour d'honneur Lion-Mascaron Wall Fountains anchored onto arcade piers (9, 19) & (14, 19) */}
        {[
          { x: 9.38, rotY: Math.PI * 0.5 },
          { x: 13.62, rotY: -Math.PI * 0.5 },
        ].map(({ x: fx, rotY }, fi) => {
          const [wx, wy, wz] = continuousGridToWorld(fx, 0, 19.0);
          return (
            <group key={`courtyard-fountain-${fi}`} position={[wx, wy, wz]} rotation={[0, rotY, 0]}>
              <mesh position={[0, 0.45, 0.08]} castShadow raycast={noRaycast}>
                <cylinderGeometry args={[0.26, 0.18, 0.18, 12]} />
                <meshStandardMaterial
                  color={LIMESTONE_TRIM}
                  roughness={0.7}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.04}
                />
              </mesh>
              <mesh position={[0, 0.55, 0.08]} rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <circleGeometry args={[0.22, 12]} />
                <meshStandardMaterial
                  color="#164459"
                  roughness={0.1}
                  metalness={0.45}
                  bumpMap={textures.waterRippleBump}
                  bumpScale={0.025}
                />
              </mesh>
              <mesh position={[0, 0.92, 0.04]} raycast={noRaycast}>
                <sphereGeometry args={[0.11, 8, 8]} />
                <meshStandardMaterial
                  color={BRASS_GOLD}
                  metalness={0.88}
                  roughness={0.22}
                  bumpMap={textures.gildedFiligreeBump}
                  bumpScale={0.035}
                />
              </mesh>
            </group>
          );
        })}

        {/* 5E. P0 Suspended Chandeliers & Ground-Floor Palace Wall Paintings/Tapestries (visible on P0) */}
        {activeFloor === 0 && (
          <group>
            <BaroqueCrystalChandelier x={11.5} y={0} z={21.0} opacity={1} />
            <BaroqueCrystalChandelier x={5.5} y={0} z={21.5} opacity={1} />
            <MalteseHeraldicTapestry x={3.8} y={0} z={17.54} rotY={0} opacity={1} />
            <MalteseHeraldicTapestry x={6.8} y={0} z={17.54} rotY={0} opacity={1} />
            <BaroqueWallSconce x={5.3} y={0} z={17.52} rotY={0} opacity={1} />
            <BaroqueMasterpiecePainting
              x={7.2}
              y={0}
              z={16.54}
              rotY={0}
              variant={0}
              opacity={1}
            />
            <BaroqueMasterpiecePainting
              x={16.5}
              y={0}
              z={16.54}
              rotY={0}
              variant={1}
              opacity={1}
            />
            <BaroqueWallSconce x={17.75} y={0} z={16.52} rotY={0} opacity={1} />
            <BaroqueMasterpiecePainting
              x={19.0}
              y={0}
              z={16.54}
              rotY={0}
              variant={2}
              opacity={1}
            />
          </group>
        )}

        {/* 5F. Garden Belvedere P0 Tuscan Corner Pilasters (just outside 9..14, 9..12 footprint) */}
        {[
          [8.52, 8.52],
          [14.48, 8.52],
          [8.52, 12.48],
          [14.48, 12.48],
        ]
          .filter(([bx, bz]) => isExplored(bx!, 0, bz!))
          .map(([bx, bz], bi) => {
          const [pwx, pwy, pwz] = continuousGridToWorld(bx!, 0, bz!);
          return (
            <group key={`belv-pilaster-${bi}`} position={[pwx, pwy, pwz]}>
              <mesh position={[0, FLOOR_HEIGHT * 0.5, 0]} castShadow receiveShadow raycast={noRaycast}>
                <boxGeometry args={[0.26, FLOOR_HEIGHT, 0.26]} />
                <meshStandardMaterial
                  color={LIMESTONE_TRIM}
                  roughness={0.76}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.05}
                />
              </mesh>
              <mesh position={[0, FLOOR_HEIGHT - 0.1, 0]} raycast={noRaycast}>
                <boxGeometry args={[0.34, 0.16, 0.34]} />
                <meshStandardMaterial
                  color={STUCCO_WARM}
                  roughness={0.7}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.04}
                />
              </mesh>
            </group>
          );
        })}

        {/* 5G. Certovka Canal Sandstone Mooring Bollards along bank edge (z = 4.46) */}
        {[5.5, 9.5, 14.5, 18.5]
          .filter((mx) => isExplored(mx, 0, 5))
          .map((mx, mi) => {
          const [bwx, bwy, bwz] = continuousGridToWorld(mx, 0, 4.46);
          return (
            <group key={`bollard-${mi}`} position={[bwx, bwy, bwz]}>
              <mesh position={[0, 0.18, 0]} castShadow receiveShadow raycast={noRaycast}>
                <cylinderGeometry args={[0.1, 0.13, 0.36, 8]} />
                <meshStandardMaterial
                  color={LIMESTONE_TRIM}
                  roughness={0.86}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.04}
                />
              </mesh>
              <mesh position={[0, 0.28, 0.1]} rotation={[0, Math.PI * 0.5, 0]} raycast={noRaycast}>
                <torusGeometry args={[0.055, 0.015, 6, 12]} />
                <meshStandardMaterial color="#27272a" metalness={0.82} roughness={0.38} />
              </mesh>
            </group>
          );
        })}
      </group>
      )}

      {/* =====================================================================
          6. HISTORICAL JULY 26, 1648 PERIMETER LANDMARKS:
             - Velkopřevorský mlýn Waterwheel on Čertovka (x: 1.15, z: 2.2)
         ===================================================================== */}
      <group>
        {/* 6B. Velkopřevorský Mlýn Rotating Wooden Waterwheel on the Čertovka Canal (x: 1.15, z: 2.2) */}
        {(() => {
          const [mx, my, mz] = continuousGridToWorld(1.15, 0, 2.2);
          return (
            <group position={[mx, my + 0.35, mz]}>
              {/* Stone mill sluice pier */}
              <mesh position={[-0.55, 0.35, 0]} castShadow raycast={noRaycast}>
                <boxGeometry args={[0.75, 1.45, 2.2]} />
                <meshStandardMaterial
                  color="#3f3a34"
                  roughness={0.85}
                  bumpMap={textures.masonryAshlarBump}
                  bumpScale={0.055}
                />
              </mesh>
              {/* Rotating oak waterwheel */}
              <group ref={waterwheelRef} position={[0.05, 0.28, 0]}>
                <mesh rotation={[0, 0, Math.PI * 0.5]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.14, 0.14, 0.48, 10]} />
                  <meshStandardMaterial
                    color={WALNUT_DARK}
                    roughness={0.78}
                    bumpMap={textures.carvedWalnutBump}
                    bumpScale={0.04}
                  />
                </mesh>
                <mesh rotation={[0, Math.PI * 0.5, 0]} raycast={noRaycast}>
                  <torusGeometry args={[1.05, 0.08, 8, 20]} />
                  <meshStandardMaterial
                    color={WALNUT_MID}
                    roughness={0.76}
                    bumpMap={textures.carvedWalnutBump}
                    bumpScale={0.04}
                  />
                </mesh>
                {Array.from({ length: 8 }, (_, i) => {
                  const ang = (i / 8) * Math.PI * 2;
                  return (
                    <mesh
                      key={`wheel-paddle-${i}`}
                      rotation={[ang, 0, 0]}
                      raycast={noRaycast}
                    >
                      <boxGeometry args={[0.38, 2.15, 0.07]} />
                      <meshStandardMaterial
                        color={WALNUT_DARK}
                        roughness={0.8}
                        bumpMap={textures.carvedWalnutBump}
                        bumpScale={0.04}
                      />
                    </mesh>
                  );
                })}
              </group>
            </group>
          );
        })()}
      </group>
    </group>
  );
}
