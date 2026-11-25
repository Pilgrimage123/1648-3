/**
 * Baroque Prague 1648 surroundings (`/src/components/canvas/PragueSurroundings.tsx`).
 *
 * Off-board city context framing both stages, obeying ADR-0007:
 * - Gradient sky dome (Mission 1 moonlit night, Mission 2 hazy Vltava dawn).
 * - Low muted Malá Strana / Old Town house rows hugging the board (height capped by
 *   distance from the board edge so the tactical camera never gets occluded).
 * - Historically grounded 1648 landmarks on the horizon only:
 *   Prague Castle + St. Vitus (Gothic choir, 1560s Renaissance helmet on the great tower),
 *   Týn Church twin spires, Old Town Hall tower, Lesser Town Bridge Towers,
 *   Church of Our Lady beneath the Chain (Maltese commandery).
 *   The Grand Priory mill wheel itself stays on the board (palace dressing);
 *   only its mill house continues west off the Čertovka.
 *   No 18th-century landmarks (no St. Nicholas dome, no bridge statues).
 * - Ground beyond the board stays dark (chiaroscuro border), river/canal water continues.
 */

import * as THREE from "three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { getBaroqueTextureSet } from "./baroqueMaterials";
import { MISSION1_MOON_POSITION, MISSION2_SUN_POSITION } from "./diegeticLights";
import {
  buildCityInstancePlan,
  buildPragueHouses,
  createChimneyGeometry,
  createFinialGeometry,
  createGableRoofGeometry,
  createPragueArchitectureGeometries,
  createRenaissanceGableGeometry,
  createWindowSurroundGeometry,
  disposePragueArchitectureGeometries,
  getMissionRowSpecs,
  MISSION2_BOARD_BOUNDS,
  MISSION3_BOARD_BOUNDS,
  mulberry32,
  STANDARD_BOARD_BOUNDS,
  type DetailTransform,
  type PragueHouse,
} from "./pragueArchitecture";

const NO_RAYCAST = () => null;

// Board extents in world space (24 × 28 tiles, TILE_SIZE 1.6, centred on origin)
const BX = 19.2;
const BZ = 22.4;

type Mission = "mission1" | "mission2" | "mission3";

// ---------------------------------------------------------------------------
// Sky dome
// ---------------------------------------------------------------------------

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 groundColor;
  uniform vec3 glowColor;
  uniform vec3 glowDir;
  uniform float glowStrength;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 col = h > 0.0
      ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55))
      : mix(horizonColor, groundColor, clamp(-h * 6.0, 0.0, 1.0));
    float g = max(dot(normalize(vDir), normalize(glowDir)), 0.0);
    col += glowColor * (pow(g, 6.0) * 0.55 + pow(g, 48.0) * 0.9) * glowStrength;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyDome({ mission, weather }: { mission: Mission; weather: string }) {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color() },
      horizonColor: { value: new THREE.Color() },
      groundColor: { value: new THREE.Color() },
      glowColor: { value: new THREE.Color() },
      glowDir: { value: new THREE.Vector3() },
      glowStrength: { value: 1 },
    }),
    [],
  );

  useLayoutEffect(() => {
    const rain = weather === "rain";
    const fog = weather === "fog";
    if (mission === "mission2") {
      // Hazy Vltava dawn: slate zenith, warm haze over the Old Town in the east
      uniforms.topColor.value.set(fog ? "#4b5562" : rain ? "#34465a" : "#3f6488");
      uniforms.horizonColor.value.set(fog ? "#5f6872" : rain ? "#56606a" : "#8c8a84");
      uniforms.groundColor.value.set("#2b333c");
      uniforms.glowColor.value.set("#f2c58a");
      uniforms.glowDir.value.set(...MISSION2_SUN_POSITION).setY(9).normalize();
      uniforms.glowStrength.value = fog ? 0.25 : rain ? 0.55 : 1.0;
    } else {
      // Moonlit Malá Strana night
      uniforms.topColor.value.set("#02040a");
      uniforms.horizonColor.value.set(fog ? "#18202e" : "#0e1628");
      uniforms.groundColor.value.set("#05070c");
      uniforms.glowColor.value.set("#8fa6c8");
      uniforms.glowDir.value.set(...MISSION1_MOON_POSITION).normalize();
      uniforms.glowStrength.value = fog ? 0.15 : rain ? 0.35 : 0.8;
    }
  }, [mission, weather, uniforms]);

  return (
    <mesh renderOrder={-10} raycast={NO_RAYCAST} frustumCulled={false}>
      <sphereGeometry args={[104, 32, 16]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

function StarField({ visible }: { visible: boolean }) {
  const geom = useMemo(() => {
    const rand = mulberry32(1648);
    const pts: number[] = [];
    for (let i = 0; i < 420; i++) {
      const u = rand() * Math.PI * 2;
      const v = 0.12 + rand() * 0.88;
      const r = 98;
      const y = v * r;
      const rr = Math.sqrt(r * r - y * y);
      pts.push(Math.cos(u) * rr, y, Math.sin(u) * rr);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useEffect(() => () => geom.dispose(), [geom]);
  if (!visible) return null;
  return (
    <points geometry={geom} renderOrder={-9} raycast={NO_RAYCAST} frustumCulled={false}>
      <pointsMaterial color="#cbd5e1" size={0.55} sizeAttenuation fog={false} transparent opacity={0.75} depthWrite={false} />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Prague 1648 Architectural House Rows (Renaissance, Early Baroque & Gothic)
// ---------------------------------------------------------------------------

const _m = new THREE.Object3D();
const _c = new THREE.Color();

function applyDetailInstances(
  mesh: THREE.InstancedMesh | null,
  items: DetailTransform[],
): void {
  if (!mesh || items.length === 0) return;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    _m.position.set(it.x, it.y, it.z);
    _m.rotation.set(0, it.rotY, 0);
    _m.scale.set(it.sx, it.sy, it.sz);
    _m.updateMatrix();
    mesh.setMatrixAt(i, _m.matrix);
    mesh.setColorAt(i, _c.set(it.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function applyHouseBodies(
  mesh: THREE.InstancedMesh | null,
  items: PragueHouse[],
): void {
  if (!mesh || items.length === 0) return;
  for (let i = 0; i < items.length; i++) {
    const hs = items[i]!;
    _m.position.set(hs.x, hs.h * 0.5 - 0.25, hs.z);
    _m.rotation.set(0, hs.rotY, 0);
    _m.scale.set(hs.w, hs.h + 0.5, hs.d);
    _m.updateMatrix();
    mesh.setMatrixAt(i, _m.matrix);
    mesh.setColorAt(i, _c.set(hs.facadeColor));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function applyWindowSurrounds(
  mesh: THREE.InstancedMesh | null,
  items: { x: number; y: number; z: number; rotY: number; w: number; h: number; trimColor: string }[],
): void {
  if (!mesh || items.length === 0) return;
  for (let i = 0; i < items.length; i++) {
    const wd = items[i]!;
    _m.position.set(wd.x, wd.y, wd.z);
    _m.rotation.set(0, wd.rotY, 0);
    _m.scale.set(wd.w, wd.h, 0.55);
    _m.updateMatrix();
    mesh.setMatrixAt(i, _m.matrix);
    mesh.setColorAt(i, _c.set(wd.trimColor));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function applyWindowPanes(
  mesh: THREE.InstancedMesh | null,
  items: { x: number; y: number; z: number; rotY: number; w: number; h: number; glowColor: string }[],
  fixedHex: string | null,
): void {
  if (!mesh || items.length === 0) return;
  for (let i = 0; i < items.length; i++) {
    const wd = items[i]!;
    _m.position.set(wd.x, wd.y, wd.z);
    _m.rotation.set(0, wd.rotY, 0);
    _m.scale.set(wd.w * 0.92, wd.h * 0.92, 1);
    _m.updateMatrix();
    mesh.setMatrixAt(i, _m.matrix);
    mesh.setColorAt(i, _c.set(fixedHex ?? wd.glowColor));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function HouseRows({
  houses,
  night,
  seed = 1648,
}: {
  houses: PragueHouse[];
  night: boolean;
  seed?: number;
}) {
  const plan = useMemo(
    () => buildCityInstancePlan(houses, night, seed),
    [houses, night, seed],
  );
  const geoms = useMemo(() => createPragueArchitectureGeometries(), []);
  useEffect(() => () => disposePragueArchitectureGeometries(geoms), [geoms]);

  // Partition windows by pediment geometry & period glazing texture
  const winGroups = useMemo(() => {
    const gothicSurr = plan.windows.filter((w) => w.pediment === "gothic");
    const renSurr = plan.windows.filter((w) => w.pediment === "renaissance");
    const barTriSurr = plan.windows.filter((w) => w.pediment === "baroque_tri");
    const barSegSurr = plan.windows.filter((w) => w.pediment === "baroque_seg");

    const unlitGothic = plan.windows.filter((w) => !w.lit && w.style === "gothic");
    const unlitRen = plan.windows.filter((w) => !w.lit && w.style === "renaissance");
    const unlitBar = plan.windows.filter((w) => !w.lit && w.style === "baroque");

    const litGothic = plan.windows.filter((w) => w.lit && w.style === "gothic");
    const litRen = plan.windows.filter((w) => w.lit && w.style === "renaissance");
    const litBar = plan.windows.filter((w) => w.lit && w.style === "baroque");

    return {
      gothicSurr,
      renSurr,
      barTriSurr,
      barSegSurr,
      unlitGothic,
      unlitRen,
      unlitBar,
      litGothic,
      litRen,
      litBar,
    };
  }, [plan.windows]);

  const sgraffitoRef = useRef<THREE.InstancedMesh>(null);
  const frescoRef = useRef<THREE.InstancedMesh>(null);
  const gothicPlasterRef = useRef<THREE.InstancedMesh>(null);
  const baroqueStuccoRef = useRef<THREE.InstancedMesh>(null);
  const plinthRef = useRef<THREE.InstancedMesh>(null);
  const corniceRef = useRef<THREE.InstancedMesh>(null);
  const pilasterRef = useRef<THREE.InstancedMesh>(null);
  const gableRoofRef = useRef<THREE.InstancedMesh>(null);
  const mansardRoofRef = useRef<THREE.InstancedMesh>(null);
  const renGableRef = useRef<THREE.InstancedMesh>(null);
  const renAtticRef = useRef<THREE.InstancedMesh>(null);
  const barGableRef = useRef<THREE.InstancedMesh>(null);
  const gotGableRef = useRef<THREE.InstancedMesh>(null);
  const dormerRef = useRef<THREE.InstancedMesh>(null);
  const orielRef = useRef<THREE.InstancedMesh>(null);
  const gothicPortalRef = useRef<THREE.InstancedMesh>(null);
  const renPortalRef = useRef<THREE.InstancedMesh>(null);
  const barPortalRef = useRef<THREE.InstancedMesh>(null);
  const gothicDoorRef = useRef<THREE.InstancedMesh>(null);
  const renDoorRef = useRef<THREE.InstancedMesh>(null);
  const barDoorRef = useRef<THREE.InstancedMesh>(null);
  const gothicGrilleRef = useRef<THREE.InstancedMesh>(null);
  const basketGrilleRef = useRef<THREE.InstancedMesh>(null);
  const houseSignRef = useRef<THREE.InstancedMesh>(null);
  const chimRef = useRef<THREE.InstancedMesh>(null);
  const finialRef = useRef<THREE.InstancedMesh>(null);

  const gothicSurrRef = useRef<THREE.InstancedMesh>(null);
  const renSurrRef = useRef<THREE.InstancedMesh>(null);
  const barTriSurrRef = useRef<THREE.InstancedMesh>(null);
  const barSegSurrRef = useRef<THREE.InstancedMesh>(null);
  const unlitGothicRef = useRef<THREE.InstancedMesh>(null);
  const unlitRenRef = useRef<THREE.InstancedMesh>(null);
  const unlitBarRef = useRef<THREE.InstancedMesh>(null);
  const litGothicRef = useRef<THREE.InstancedMesh>(null);
  const litRenRef = useRef<THREE.InstancedMesh>(null);
  const litBarRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    applyHouseBodies(sgraffitoRef.current, plan.sgraffitoHouses);
    applyHouseBodies(frescoRef.current, plan.frescoHouses);
    applyHouseBodies(gothicPlasterRef.current, plan.gothicPlasterHouses);
    applyHouseBodies(baroqueStuccoRef.current, plan.baroqueStuccoHouses);
    applyDetailInstances(plinthRef.current, plan.plinths);
    applyDetailInstances(corniceRef.current, plan.cornices);
    applyDetailInstances(pilasterRef.current, plan.pilasters);
    applyDetailInstances(gableRoofRef.current, plan.gableRoofs);
    applyDetailInstances(mansardRoofRef.current, plan.mansardRoofs);
    applyDetailInstances(renGableRef.current, plan.renaissanceGables);
    applyDetailInstances(renAtticRef.current, plan.renaissanceAttics);
    applyDetailInstances(barGableRef.current, plan.baroqueGables);
    applyDetailInstances(gotGableRef.current, plan.gothicGables);
    applyDetailInstances(dormerRef.current, plan.dormers);
    applyDetailInstances(orielRef.current, plan.oriels);
    applyDetailInstances(gothicPortalRef.current, plan.gothicPortals);
    applyDetailInstances(renPortalRef.current, plan.renaissancePortals);
    applyDetailInstances(barPortalRef.current, plan.baroquePortals);
    applyDetailInstances(gothicDoorRef.current, plan.gothicDoors);
    applyDetailInstances(renDoorRef.current, plan.renaissanceDoors);
    applyDetailInstances(barDoorRef.current, plan.baroqueDoors);
    applyDetailInstances(gothicGrilleRef.current, plan.gothicGrilles);
    applyDetailInstances(basketGrilleRef.current, plan.basketGrilles);
    applyDetailInstances(houseSignRef.current, plan.houseSigns);
    applyDetailInstances(chimRef.current, plan.chimneys);
    applyDetailInstances(finialRef.current, plan.finials);

    applyWindowSurrounds(gothicSurrRef.current, winGroups.gothicSurr);
    applyWindowSurrounds(renSurrRef.current, winGroups.renSurr);
    applyWindowSurrounds(barTriSurrRef.current, winGroups.barTriSurr);
    applyWindowSurrounds(barSegSurrRef.current, winGroups.barSegSurr);

    // Subtle period glazing tints: Gothic dark lead-rondel, Renaissance clear slate, Baroque greenish-blue crown glass
    applyWindowPanes(unlitGothicRef.current, winGroups.unlitGothic, night ? "#1b1f24" : "#343734");
    applyWindowPanes(unlitRenRef.current, winGroups.unlitRen, night ? "#16202d" : "#2f3844");
    applyWindowPanes(unlitBarRef.current, winGroups.unlitBar, night ? "#15292e" : "#2c464a");

    applyWindowPanes(litGothicRef.current, winGroups.litGothic, null);
    applyWindowPanes(litRenRef.current, winGroups.litRen, null);
    applyWindowPanes(litBarRef.current, winGroups.litBar, null);
  }, [plan, winGroups, night]);

  const textures = useMemo(() => getBaroqueTextureSet(), []);
  if (houses.length === 0) return null;

  return (
    <group>
      {/* 1a. High-contrast Bohemian Renaissance psaníčkové sgrafito (charcoal underlayer + white limewash + top frieze) */}
      {plan.sgraffitoHouses.length > 0 && (
        <instancedMesh
          ref={sgraffitoRef}
          args={[undefined, undefined, plan.sgraffitoHouses.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            roughness={0.86}
            map={textures.sgraffitoFacadeAlbedo}
            bumpMap={textures.masonryAshlarBump}
            bumpScale={0.025}
          />
        </instancedMesh>
      )}

      {/* 1b. Renaissance mineral-pigment frescoed facades (red, ochre, sage, slate-blue + painted grotesque bands) */}
      {plan.frescoHouses.length > 0 && (
        <instancedMesh
          ref={frescoRef}
          args={[undefined, undefined, plan.frescoHouses.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            roughness={0.85}
            map={textures.renaissanceFrescoAlbedo}
          />
        </instancedMesh>
      )}

      {/* 1c. Gothic smooth medieval limewash facades with illusionistic painted corner quoins */}
      {plan.gothicPlasterHouses.length > 0 && (
        <instancedMesh
          ref={gothicPlasterRef}
          args={[undefined, undefined, plan.gothicPlasterHouses.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            roughness={0.91}
            map={textures.gothicPlasterAlbedo}
          />
        </instancedMesh>
      )}

      {/* 1d. Early Baroque warm ochre/terracotta/salmon smooth sculpted stucco facades */}
      {plan.baroqueStuccoHouses.length > 0 && (
        <instancedMesh
          ref={baroqueStuccoRef}
          args={[undefined, undefined, plan.baroqueStuccoHouses.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            roughness={0.82}
            map={textures.baroqueStuccoAlbedo}
          />
        </instancedMesh>
      )}

      {/* Heavy ground-floor rusticated stone plinths */}
      {plan.plinths.length > 0 && (
        <instancedMesh
          ref={plinthRef}
          args={[undefined, undefined, plan.plinths.length]}
          receiveShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            roughness={0.95}
            bumpMap={textures.masonryAshlarBump}
            bumpScale={0.055}
          />
        </instancedMesh>
      )}

      {/* Eaves crown cornices & bold Early Baroque / Renaissance belt courses (kordonové římsy) */}
      {plan.cornices.length > 0 && (
        <instancedMesh
          ref={corniceRef}
          args={[undefined, undefined, plan.cornices.length]}
          receiveShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.8} />
        </instancedMesh>
      )}

      {/* Plastic Early Baroque pilasters & Renaissance corner lesenes */}
      {plan.pilasters.length > 0 && (
        <instancedMesh
          ref={pilasterRef}
          args={[undefined, undefined, plan.pilasters.length]}
          castShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.82} />
        </instancedMesh>
      )}

      {/* Steep pitched clay-tile gable roofs */}
      {plan.gableRoofs.length > 0 && (
        <instancedMesh
          ref={gableRoofRef}
          geometry={geoms.gableRoof}
          args={[undefined, undefined, plan.gableRoofs.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            roughness={0.72}
            map={textures.roofTileAlbedo}
            bumpMap={textures.roofTileBump}
            bumpScale={0.045}
          />
        </instancedMesh>
      )}

      {/* Early Baroque 4-sided hipped mansard roofs */}
      {plan.mansardRoofs.length > 0 && (
        <instancedMesh
          ref={mansardRoofRef}
          geometry={geoms.mansardRoof}
          args={[undefined, undefined, plan.mansardRoofs.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            roughness={0.7}
            map={textures.roofTileAlbedo}
            bumpMap={textures.roofTileBump}
            bumpScale={0.045}
          />
        </instancedMesh>
      )}

      {/* Sculpted Bohemian Renaissance scrolled gables (seamless psaníčko pattern, zero frieze stripe) */}
      {plan.renaissanceGables.length > 0 && (
        <instancedMesh
          ref={renGableRef}
          geometry={geoms.renaissanceGable}
          args={[undefined, undefined, plan.renaissanceGables.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            roughness={0.84}
            map={textures.sgraffitoPatternAlbedo}
          />
        </instancedMesh>
      )}

      {/* Prague Renaissance lunette attic parapets (lunetové atiky) */}
      {plan.renaissanceAttics.length > 0 && (
        <instancedMesh
          ref={renAtticRef}
          geometry={geoms.renaissanceAttic}
          args={[undefined, undefined, plan.renaissanceAttics.length]}
          receiveShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            roughness={0.84}
            map={textures.sgraffitoPatternAlbedo}
          />
        </instancedMesh>
      )}

      {/* Early Baroque scrolled volute gables with classical tympanum */}
      {plan.baroqueGables.length > 0 && (
        <instancedMesh
          ref={barGableRef}
          geometry={geoms.baroqueGable}
          args={[undefined, undefined, plan.baroqueGables.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.8} map={textures.baroqueStuccoAlbedo} />
        </instancedMesh>
      )}

      {/* Medieval Gothic crow-stepped gables (clean smooth medieval limewash — no center quoin seam) */}
      {plan.gothicGables.length > 0 && (
        <instancedMesh
          ref={gotGableRef}
          geometry={geoms.gothicGable}
          args={[undefined, undefined, plan.gothicGables.length]}
          receiveShadow
          castShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            roughness={0.92}
            map={textures.smoothLimeAlbedo}
            bumpMap={textures.masonryAshlarBump}
            bumpScale={0.032}
          />
        </instancedMesh>
      )}

      {/* Roof dormers (vikýře) */}
      {plan.dormers.length > 0 && (
        <instancedMesh
          ref={dormerRef}
          geometry={geoms.dormer}
          args={[undefined, undefined, plan.dormers.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.82} />
        </instancedMesh>
      )}

      {/* Cantilevered 1st-floor bay oriels (arkýře) */}
      {plan.oriels.length > 0 && (
        <instancedMesh
          ref={orielRef}
          geometry={geoms.oriel}
          args={[undefined, undefined, plan.oriels.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            roughness={0.86}
            bumpMap={textures.masonryAshlarBump}
            bumpScale={0.03}
          />
        </instancedMesh>
      )}

      {/* 2a. Gothic pointed portals with flanking stone benches (sedátka) */}
      {plan.gothicPortals.length > 0 && (
        <instancedMesh
          ref={gothicPortalRef}
          geometry={geoms.gothicPortal}
          args={[undefined, undefined, plan.gothicPortals.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.9} bumpMap={textures.masonryAshlarBump} bumpScale={0.03} />
        </instancedMesh>
      )}

      {/* 2b. Renaissance semicircular rusticated bosáž portals with top tablet */}
      {plan.renaissancePortals.length > 0 && (
        <instancedMesh
          ref={renPortalRef}
          geometry={geoms.renaissancePortal}
          args={[undefined, undefined, plan.renaissancePortals.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.84} bumpMap={textures.masonryAshlarBump} bumpScale={0.025} />
        </instancedMesh>
      )}

      {/* 2c. Early Baroque columned portals carrying projecting altán balconies, broken pediments & cartouches */}
      {plan.baroquePortals.length > 0 && (
        <instancedMesh
          ref={barPortalRef}
          geometry={geoms.baroquePortal}
          args={[undefined, undefined, plan.baroquePortals.length]}
          castShadow
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.78} />
        </instancedMesh>
      )}

      {/* 3a. Gothic iron-strapped oak doors with rivets & ring knocker */}
      {plan.gothicDoors.length > 0 && (
        <instancedMesh
          ref={gothicDoorRef}
          args={[undefined, undefined, plan.gothicDoors.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={textures.gothicDoorAlbedo} roughness={0.88} />
        </instancedMesh>
      )}

      {/* 3b. Renaissance coffered doors with carved rosettes (kazetová vrata) */}
      {plan.renaissanceDoors.length > 0 && (
        <instancedMesh
          ref={renDoorRef}
          args={[undefined, undefined, plan.renaissanceDoors.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={textures.renaissanceDoorAlbedo} roughness={0.82} />
        </instancedMesh>
      )}

      {/* 3c. Early Baroque double-leaf carved doors with inset pedestrian wicket gate */}
      {plan.baroqueDoors.length > 0 && (
        <instancedMesh
          ref={barDoorRef}
          args={[undefined, undefined, plan.baroqueDoors.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={textures.baroqueDoorAlbedo} roughness={0.8} />
        </instancedMesh>
      )}

      {/* Painted / relief Prague house signs (domovní znamení) */}
      {plan.houseSigns.length > 0 && (
        <instancedMesh
          ref={houseSignRef}
          args={[undefined, undefined, plan.houseSigns.length]}
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial map={textures.houseSignAlbedo} roughness={0.68} />
        </instancedMesh>
      )}

      {/* Ground-floor Gothic heavy wrought-iron grilles */}
      {plan.gothicGrilles.length > 0 && (
        <instancedMesh
          ref={gothicGrilleRef}
          geometry={geoms.gothicGrille}
          args={[undefined, undefined, plan.gothicGrilles.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.55} metalness={0.68} />
        </instancedMesh>
      )}

      {/* Ground-floor Renaissance outward-bowed basket grilles (košové mříže) */}
      {plan.basketGrilles.length > 0 && (
        <instancedMesh
          ref={basketGrilleRef}
          geometry={geoms.basketGrille}
          args={[undefined, undefined, plan.basketGrilles.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.52} metalness={0.7} />
        </instancedMesh>
      )}

      {/* Plastered Prague chimney stacks with corbeled crowns */}
      {plan.chimneys.length > 0 && (
        <instancedMesh
          ref={chimRef}
          geometry={geoms.chimney}
          args={[undefined, undefined, plan.chimneys.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.93} />
        </instancedMesh>
      )}

      {/* Gable finial vases / stone obelisks (vázy a čučky) */}
      {plan.finials.length > 0 && (
        <instancedMesh
          ref={finialRef}
          geometry={geoms.finial}
          args={[undefined, undefined, plan.finials.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.78} />
        </instancedMesh>
      )}

      {/* 4a. Gothic deeply recessed chamfered stone window surrounds */}
      {winGroups.gothicSurr.length > 0 && (
        <instancedMesh
          ref={gothicSurrRef}
          geometry={geoms.gothicWindowSurround}
          args={[undefined, undefined, winGroups.gothicSurr.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.9} />
        </instancedMesh>
      )}

      {/* 4b. Renaissance moulded šambrána with horizontal cornice hood */}
      {winGroups.renSurr.length > 0 && (
        <instancedMesh
          ref={renSurrRef}
          geometry={geoms.renaissanceWindowSurround}
          args={[undefined, undefined, winGroups.renSurr.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.82} />
        </instancedMesh>
      )}

      {/* 4c. Early Baroque tall window surrounds with triangular suprafenestras */}
      {winGroups.barTriSurr.length > 0 && (
        <instancedMesh
          ref={barTriSurrRef}
          geometry={geoms.baroqueWindowSurroundTri}
          args={[undefined, undefined, winGroups.barTriSurr.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.78} />
        </instancedMesh>
      )}

      {/* 4d. Early Baroque tall window surrounds with segmental arched suprafenestras */}
      {winGroups.barSegSurr.length > 0 && (
        <instancedMesh
          ref={barSegSurrRef}
          geometry={geoms.baroqueWindowSurroundSeg}
          args={[undefined, undefined, winGroups.barSegSurr.length]}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial roughness={0.78} />
        </instancedMesh>
      )}

      {/* 5a. Reflective unlit Gothic leaded bullseye rondel glass (bukle) */}
      {winGroups.unlitGothic.length > 0 && (
        <instancedMesh
          ref={unlitGothicRef}
          args={[undefined, undefined, winGroups.unlitGothic.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            map={textures.gothicWindowAlbedo}
            roughness={0.28}
            metalness={0.22}
            envMapIntensity={0.7}
          />
        </instancedMesh>
      )}

      {/* 5b. Reflective unlit Renaissance leaded glass with heraldic medallions */}
      {winGroups.unlitRen.length > 0 && (
        <instancedMesh
          ref={unlitRenRef}
          args={[undefined, undefined, winGroups.unlitRen.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            map={textures.windowPaneAlbedo}
            roughness={0.22}
            metalness={0.26}
            envMapIntensity={0.85}
          />
        </instancedMesh>
      )}

      {/* 5c. Reflective unlit Early Baroque greenish-blue tinted crown glass in light wooden casements */}
      {winGroups.unlitBar.length > 0 && (
        <instancedMesh
          ref={unlitBarRef}
          args={[undefined, undefined, winGroups.unlitBar.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            map={textures.baroqueWindowAlbedo}
            roughness={0.16}
            metalness={0.32}
            envMapIntensity={0.95}
          />
        </instancedMesh>
      )}

      {/* 6a-c. Warm candlelit nocturnal windows preserving each period's glazing pattern */}
      {winGroups.litGothic.length > 0 && (
        <instancedMesh
          ref={litGothicRef}
          args={[undefined, undefined, winGroups.litGothic.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={textures.gothicWindowAlbedo} toneMapped={false} />
        </instancedMesh>
      )}
      {winGroups.litRen.length > 0 && (
        <instancedMesh
          ref={litRenRef}
          args={[undefined, undefined, winGroups.litRen.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={textures.windowPaneAlbedo} toneMapped={false} />
        </instancedMesh>
      )}
      {winGroups.litBar.length > 0 && (
        <instancedMesh
          ref={litBarRef}
          args={[undefined, undefined, winGroups.litBar.length]}
          raycast={NO_RAYCAST}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={textures.baroqueWindowAlbedo} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Landmark building blocks
// ---------------------------------------------------------------------------

function Spire({
  pos,
  w,
  h,
  roofH,
  color,
  roof,
  turrets = false,
}: {
  pos: [number, number, number];
  w: number;
  h: number;
  roofH: number;
  color: string;
  roof: string;
  turrets?: boolean;
}) {
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, h + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} raycast={NO_RAYCAST}>
        <coneGeometry args={[w * 0.72, roofH, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      {turrets &&
        ([
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const).map(([sx, sz]) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * w * 0.48, h + roofH * 0.22, sz * w * 0.48]}
            raycast={NO_RAYCAST}
          >
            <coneGeometry args={[w * 0.13, roofH * 0.45, 8]} />
            <meshStandardMaterial color={roof} roughness={0.8} />
          </mesh>
        ))}
    </group>
  );
}

function Hill({ pos, r, h, color }: { pos: [number, number, number]; r: number; h: number; color: string }) {
  return (
    <mesh position={pos} scale={[r, h, r * 0.8]} raycast={NO_RAYCAST}>
      <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

/** Prague Castle on Hradčany: long palace wings + St. Vitus Gothic choir and great tower with 1560s Renaissance helmet. */
function PragueCastle({ pos, rotY, night }: { pos: [number, number, number]; rotY: number; night: boolean }) {
  const stone = night ? "#1c2029" : "#5c6066";
  const roof = night ? "#151a22" : "#4a4f52";
  const copper = night ? "#1d2a2a" : "#4f6b62";
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Hill pos={[0, 0, 0]} r={34} h={13} color={night ? "#0b0f14" : "#3c463f"} />
      {/* Palace wings along the ridge */}
      <mesh position={[0, 15.5, 2]} raycast={NO_RAYCAST}>
        <boxGeometry args={[46, 6, 5]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 18.5, 2]} rotation={[Math.PI / 4, 0, 0]} scale={[46.4, 3.5, 3.5]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={roof} roughness={0.85} />
      </mesh>
      {/* St. Vitus Gothic choir (unfinished nave in 1648) with flying buttresses */}
      <mesh position={[-2, 19, -5]} raycast={NO_RAYCAST}>
        <boxGeometry args={[16, 10, 6]} />
        <meshStandardMaterial color={stone} roughness={0.88} />
      </mesh>
      <mesh position={[-2, 24, -5]} rotation={[Math.PI / 4, 0, 0]} scale={[16.4, 4.4, 4.4]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={roof} roughness={0.85} />
      </mesh>
      {[-8, -4, 0, 4].map((bx) => (
        <mesh key={bx} position={[bx - 2, 18, -8.6]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.8, 8, 1.4]} />
          <meshStandardMaterial color={stone} roughness={0.9} />
        </mesh>
      ))}
      {/* Great South Tower + Renaissance bulbous helmet */}
      <mesh position={[8, 23, -4]} raycast={NO_RAYCAST}>
        <boxGeometry args={[4.4, 18, 4.4]} />
        <meshStandardMaterial color={stone} roughness={0.88} />
      </mesh>
      <mesh position={[8, 33.6, -4]} scale={[1, 1.25, 1]} raycast={NO_RAYCAST}>
        <sphereGeometry args={[2.5, 16, 12]} />
        <meshStandardMaterial color={copper} roughness={0.44} metalness={0.55} />
      </mesh>
      <mesh position={[8, 37.4, -4]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.7, 0.9, 2.2, 8]} />
        <meshStandardMaterial color={copper} roughness={0.44} metalness={0.55} />
      </mesh>
      <mesh position={[8, 39.6, -4]} raycast={NO_RAYCAST}>
        <coneGeometry args={[0.8, 2.6, 8]} />
        <meshStandardMaterial color={copper} roughness={0.42} metalness={0.58} />
      </mesh>
      {/* Gilded Renaissance finial orb atop St. Vitus Great Tower */}
      <mesh position={[8, 41.1, -4]} raycast={NO_RAYCAST}>
        <sphereGeometry args={[0.42, 8, 6]} />
        <meshStandardMaterial color="#e5b84b" metalness={0.88} roughness={0.22} />
      </mesh>
      {/* St. George's Basilica twin Romanesque towers */}
      <Spire pos={[18, 18, -3]} w={2.2} h={7} roofH={4} color={stone} roof={roof} />
      <Spire pos={[21, 18, -3]} w={2.2} h={6.4} roofH={3.6} color={stone} roof={roof} />
      {night && (
        <>
          {[-14, -6, 4, 12].map((wx) => (
            <mesh key={wx} position={[wx, 15.5, 4.55]} raycast={NO_RAYCAST}>
              <planeGeometry args={[0.8, 1.1]} />
              <meshBasicMaterial color="#e3a24f" toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/** Týn Church: two Gothic towers each with a steep central spire and four corner pinnacles. */
function TynChurch({ pos, rotY, night }: { pos: [number, number, number]; rotY: number; night: boolean }) {
  const stone = night ? "#1b1f27" : "#5a5650";
  const roof = night ? "#12161d" : "#2f3438";
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 7, 5]} raycast={NO_RAYCAST}>
        <boxGeometry args={[9, 14, 14]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 14, 5]} rotation={[0, 0, Math.PI / 4]} scale={[6.4, 6.4, 14.2]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={roof} roughness={0.85} />
      </mesh>
      {[-3, 3].map((tx) => (
        <group key={tx} position={[tx, 0, -3]}>
          <Spire pos={[0, 0, 0]} w={3.2} h={22} roofH={13} color={stone} roof={roof} turrets />
          {/* Gilded orb finial (10% accent kept tiny on the horizon) */}
          <mesh position={[0, 35.4, 0]} raycast={NO_RAYCAST}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshStandardMaterial color="#d4a73f" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Lesser Town Bridge Towers: tall Gothic tower (1464) + lower Romanesque Judith tower, gate spanning the bridge. */
function LesserTownBridgeTowers({ x, night }: { x: number; night: boolean }) {
  const stone = night ? "#1c1f26" : "#5e5850";
  const roof = night ? "#12151b" : "#2f3336";
  return (
    <group position={[x, 0, 0]}>
      <Spire pos={[0, 0, -3.4]} w={5.2} h={17} roofH={9} color={stone} roof={roof} turrets />
      <Spire pos={[0, 0, 4.2]} w={4.4} h={10} roofH={4.5} color={stone} roof={roof} />
      <mesh position={[0, 5.5, 0.6]} raycast={NO_RAYCAST}>
        <boxGeometry args={[3, 3, 4]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Old Town Hall tower (1364) with corner bartizans and pointed roof. */
function OldTownHallTower({ pos, night }: { pos: [number, number, number]; night: boolean }) {
  const stone = night ? "#1c1f26" : "#5b5750";
  const roof = night ? "#12151b" : "#2f3336";
  return (
    <group position={pos}>
      <Spire pos={[0, 0, 0]} w={4.6} h={24} roofH={8} color={stone} roof={roof} turrets />
      <mesh position={[0, 6, 6]} raycast={NO_RAYCAST}>
        <boxGeometry args={[12, 12, 10]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Church of Our Lady beneath the Chain: two massive squat Gothic towers of the Maltese commandery. */
function OurLadyBeneathTheChain({ pos, rotY, night }: { pos: [number, number, number]; rotY: number; night: boolean }) {
  const stone = night ? "#22252c" : "#5c5852";
  const roof = night ? "#15181e" : "#33373a";
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Spire pos={[-3.6, 0, 0]} w={5} h={15} roofH={8} color={stone} roof={roof} />
      <Spire pos={[3.6, 0, 0]} w={5} h={15} roofH={8} color={stone} roof={roof} />
      <mesh position={[0, 5, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[2.4, 10, 4]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.2, 2.05]} raycast={NO_RAYCAST}>
        <planeGeometry args={[1.4, 2.4]} />
        <meshBasicMaterial color={night ? "#c98a3e" : "#1a1612"} toneMapped={false} />
      </mesh>
      {/* Maltese cross banner – the one heraldic accent of this skyline */}
      <mesh position={[0, 11.2, 2.05]} raycast={NO_RAYCAST}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function WaterRect({
  x0,
  x1,
  z0,
  z1,
  color,
  y = -0.12,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  color: string;
  y?: number;
}) {
  const textures = useMemo(() => getBaroqueTextureSet(), []);
  return (
    <mesh
      position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      raycast={NO_RAYCAST}
    >
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial
        color={color}
        roughness={0.22}
        metalness={0.25}
        envMapIntensity={0.88}
        bumpMap={textures.waterRippleBump}
        bumpScale={0.02}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Mission layouts
// ---------------------------------------------------------------------------

/** Mission 2 (26 July 1648, dawn): Old Town bank east, Vltava west, Malá Strana & the Castle beyond. */
function Mission2Surroundings() {
  const houses = useMemo(
    () =>
      buildPragueHouses(
        getMissionRowSpecs("mission2"),
        false,
        2607,
        MISSION2_BOARD_BOUNDS,
      ),
    [],
  );
  const water = "#174b63";
  return (
    <group>
      {/* Vltava continuing north, south and west beyond the board */}
      <WaterRect x0={-57} x1={4.96} z0={-95} z1={-BZ} color={water} />
      <WaterRect x0={-57} x1={4.96} z0={BZ} z1={95} color={water} />
      <WaterRect x0={-57} x1={-BX} z0={-BZ} z1={BZ} color={water} />

      {/* Old Town quay embankment (off-board, aligned to BridgeTowerDressing wx=4.96) & Malá Strana quay */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[4.96, -0.1, s * 58]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.56, 0.4, 72]} />
          <meshStandardMaterial color="#5e5345" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-57.5, -0.1, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 0.6, 190]} />
        <meshStandardMaterial color="#4f483f" roughness={0.9} />
      </mesh>

      {/* Charles Bridge continuing west to Malá Strana (bare deck, as in 1648) */}
      <mesh position={[-38.3, -0.32, 0]} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[38.2, 0.64, 8.2]} />
        <meshStandardMaterial color="#6b6152" roughness={0.9} />
      </mesh>
      {[-4.3, 4.3].map((pz) => (
        <mesh key={pz} position={[-38.3, 0.18, pz]} castShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[38.2, 0.36, 0.3]} />
          <meshStandardMaterial color="#786c5b" roughness={0.86} />
        </mesh>
      ))}
      {[-24, -31, -38, -45, -52].map((px) => (
        <group key={px} position={[px, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, -0.35, s * 5.3]} rotation={[0, Math.PI / 4, 0]} raycast={NO_RAYCAST}>
              <boxGeometry args={[1.6, 0.6, 1.6]} />
              <meshStandardMaterial color="#6b6152" roughness={0.9} />
            </mesh>
          ))}
          {/* timber icebreaker upstream (south) */}
          <mesh position={[0, -0.05, 8]} rotation={[-0.4, 0, 0]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.36, 0.28, 2.6]} />
            <meshStandardMaterial color="#4a3322" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <LesserTownBridgeTowers x={-58.5} night={false} />

      <HouseRows houses={houses} night={false} seed={2607} />

      {/* Horizon: Hradčany & Petřín to the west, Týn and Old Town Hall to the east */}
      <PragueCastle pos={[-86, -1, -24]} rotY={Math.PI / 2} night={false} />
      <Hill pos={[-84, -1, 34]} r={30} h={16} color="#3a443c" />
      <TynChurch pos={[66, 0, 6]} rotY={-Math.PI / 2} night={false} />
      <OldTownHallTower pos={[55, 0, -12]} night={false} />
    </group>
  );
}

/** Mission 1 (night, Malá Strana): Čertovka & Kampa north, Maltese Square south, Castle on the hill. */
function Mission1Surroundings() {
  const houses = useMemo(
    () =>
      buildPragueHouses(
        getMissionRowSpecs("mission1"),
        true,
        1648,
        STANDARD_BOARD_BOUNDS,
      ),
    [],
  );
  const millGeoms = useMemo(
    () => ({
      roof: createGableRoofGeometry(),
      gable: createRenaissanceGableGeometry(),
      chimney: createChimneyGeometry(),
      finial: createFinialGeometry(),
      windowSurround: createWindowSurroundGeometry(),
    }),
    [],
  );
  useEffect(
    () => () => {
      millGeoms.roof.dispose();
      millGeoms.gable.dispose();
      millGeoms.chimney.dispose();
      millGeoms.finial.dispose();
      millGeoms.windowSurround.dispose();
    },
    [millGeoms],
  );
  const textures = useMemo(() => getBaroqueTextureSet(), []);
  const water = "#103a4f";
  return (
    <group>
      {/* Čertovka canal continuing east & west beyond the board (z: 0..4) */}
      <WaterRect x0={-70} x1={-BX} z0={-BZ} z1={-14.4} color={water} y={-0.12} />
      <WaterRect x0={BX} x1={70} z0={-BZ} z1={-14.4} color={water} y={-0.12} />
      {[-14.2, -22.6].map((wz) => (
        <group key={wz}>
          <mesh position={[-(BX + 70) * 0.5, -0.05, wz]} raycast={NO_RAYCAST}>
            <boxGeometry args={[70 - BX, 0.3, 0.4]} />
            <meshStandardMaterial color="#2c2823" roughness={0.95} />
          </mesh>
          <mesh position={[(BX + 70) * 0.5, -0.05, wz]} raycast={NO_RAYCAST}>
            <boxGeometry args={[70 - BX, 0.3, 0.4]} />
            <meshStandardMaterial color="#2c2823" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Renaissance Grand Priory Mill House continuing the on-board Čertovka wheel off the west edge */}
      <group position={[-23.6, 0, -18.1]}>
        {/* Low stone water-table plinth */}
        <mesh position={[0, 0.12, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[5.5, 1.36, 6.3]} />
          <meshStandardMaterial color="#3a3530" roughness={0.95} bumpMap={textures.masonryAshlarBump} bumpScale={0.05} />
        </mesh>
        {/* High-contrast Bohemian Renaissance psaníčkové sgrafito main body */}
        <mesh position={[0, 2.35, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[5.4, 4.7, 6.2]} />
          <meshStandardMaterial color="#80796e" roughness={0.86} map={textures.sgraffitoFacadeAlbedo} />
        </mesh>
        {/* Eaves cornice & Renaissance stringcourse belt */}
        <mesh position={[0, 4.68, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[5.76, 0.24, 6.56]} />
          <meshStandardMaterial color="#918778" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.15, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[5.62, 0.14, 6.42]} />
          <meshStandardMaterial color="#918778" roughness={0.82} />
        </mesh>
        {/* True-pitched Bohemian clay tile gable roof (ridge along X, gable facing east toward Čertovka dock) */}
        <mesh
          position={[0, 4.7, 0]}
          scale={[5.2, 2.9, 6.6]}
          geometry={millGeoms.roof}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            color="#623629"
            roughness={0.72}
            map={textures.roofTileAlbedo}
            bumpMap={textures.roofTileBump}
            bumpScale={0.045}
          />
        </mesh>
        {/* Sculpted Renaissance scrolled gables on east & west ends with stone vase finials */}
        {([1, -1] as const).map((dir) => (
          <group key={dir}>
            <mesh
              position={[dir * 2.62, 4.68, 0]}
              rotation={[0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
              scale={[6.28, 3.25, 0.38]}
              geometry={millGeoms.gable}
              raycast={NO_RAYCAST}
            >
              <meshStandardMaterial color="#80796e" roughness={0.84} map={textures.sgraffitoPatternAlbedo} />
            </mesh>
            <mesh
              position={[dir * 2.62, 8.05, 0]}
              scale={[0.3, 0.56, 0.3]}
              geometry={millGeoms.finial}
              raycast={NO_RAYCAST}
            >
              <meshStandardMaterial color="#918778" roughness={0.78} />
            </mesh>
          </group>
        ))}
        {/* Corbeled Prague chimney */}
        <mesh
          position={[-0.9, 6.55, -1.1]}
          scale={[0.62, 1.7, 0.62]}
          geometry={millGeoms.chimney}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial color="#423b34" roughness={0.92} />
        </mesh>
        {/* Painted Prague mill house sign (domovní znamení) facing the dock */}
        <mesh position={[2.76, 3.65, 0]} rotation={[0, Math.PI / 2, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.84, 0.62, 0.08]} />
          <meshStandardMaterial color="#b4a894" map={textures.houseSignAlbedo} roughness={0.68} />
        </mesh>
        {/* Renaissance stone-framed mullioned candlelit windows facing the dock */}
        {[-1.55, 1.55].map((wz) => (
          <group key={wz} position={[2.76, 2.95, wz]} rotation={[0, Math.PI / 2, 0]}>
            <mesh scale={[0.74, 1.12, 0.55]} geometry={millGeoms.windowSurround} raycast={NO_RAYCAST}>
              <meshStandardMaterial color="#918778" roughness={0.82} />
            </mesh>
            <mesh position={[0, 0, 0.01]} raycast={NO_RAYCAST}>
              <planeGeometry args={[0.68, 1.02]} />
              <meshBasicMaterial color="#eba349" map={textures.windowPaneAlbedo} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      <HouseRows houses={houses} night seed={1648} />

      {/* Church of Our Lady beneath the Chain – the Maltese commandery church beside the Grand Priory */}
      <OurLadyBeneathTheChain pos={[-4, 0, 34]} rotY={Math.PI} night />

      {/* Horizon: Prague Castle on Hradčany (north-west), Petřín (west), Old Town across the river (east) */}
      <PragueCastle pos={[-48, -1, -82]} rotY={0.35} night />
      <Hill pos={[-88, -1, 10]} r={34} h={20} color="#090c11" />
      <TynChurch pos={[78, 0, -40]} rotY={-Math.PI / 2} night />
    </group>
  );
}

function Mission3Surroundings() {
  const houses = useMemo(
    () =>
      buildPragueHouses(
        getMissionRowSpecs("mission3"),
        true,
        2707,
        MISSION3_BOARD_BOUNDS,
      ),
    [],
  );
  const water = "#103a4f";
  return (
    <group>
      {/* Čertovka canal extensions north and south of x = 4..5 (world x = -12.8..-9.6), flush with board water plane */}
      <WaterRect x0={-12.8} x1={-9.6} z0={-54} z1={-9.6} color={water} y={-0.12} />
      <WaterRect x0={-12.8} x1={-9.6} z0={1.6} z1={54} color={water} y={-0.12} />

      {/* Canal stone retaining walls extending off-board */}
      {[-12.95, -9.45].map((wx) => (
        <group key={wx}>
          <mesh position={[wx, -0.05, -31.8]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.35, 0.35, 44.4]} />
            <meshStandardMaterial color="#2c2823" roughness={0.95} />
          </mesh>
          <mesh position={[wx, -0.05, 27.8]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.35, 0.35, 52.4]} />
            <meshStandardMaterial color="#2c2823" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Malá Strana & Kampa Renaissance/Baroque/Gothic surrounding blocks */}
      <HouseRows houses={houses} night seed={2707} />

      {/* Malá Strana bridgehead Gothic/Renaissance towers & shut arch east of the battery gate */}
      <group position={[18.8, 0, -3.4]}>
        <Spire pos={[0, 0, -4.4]} w={5.2} h={16} roofH={8.5} color="#282a30" roof="#1c2026" turrets />
        <Spire pos={[0, 0, 4.4]} w={4.5} h={11.5} roofH={5.2} color="#2c2b2f" roof="#241e1d" />
        <mesh position={[0, 5.2, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[3.4, 4.6, 5.2]} />
          <meshStandardMaterial color="#26282e" roughness={0.92} />
        </mesh>
        <mesh position={[-3.6, 2.2, -2.2]} raycast={NO_RAYCAST}>
          <boxGeometry args={[1.1, 4.4, 1.1]} />
          <meshStandardMaterial color="#2b2623" roughness={0.94} />
        </mesh>
        <mesh position={[-3.6, 2.2, 2.2]} raycast={NO_RAYCAST}>
          <boxGeometry args={[1.1, 4.4, 1.1]} />
          <meshStandardMaterial color="#2b2623" roughness={0.94} />
        </mesh>
        <mesh position={[-3.6, 4.5, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[1.2, 0.75, 5.2]} />
          <meshStandardMaterial color="#342e29" roughness={0.9} />
        </mesh>
      </group>

      {/* Distant Prague Castle & Hradčany ridge framing the night horizon */}
      <PragueCastle pos={[-54, -1, -76]} rotY={0.42} night />
    </group>
  );
}

export function PragueSurroundings() {
  const scenario = useGameStore((s) => s.scenario);
  const weather = useGameStore((s) => s.weather);
  const mission: Mission =
    scenario === "mission2" ? "mission2" : scenario === "mission3" ? "mission3" : "mission1";

  return (
    <group>
      <SkyDome mission={mission} weather={weather} />
      <StarField visible={mission !== "mission2" && weather === "clear"} />
      {mission === "mission2" ? (
        <Mission2Surroundings />
      ) : mission === "mission3" ? (
        <Mission3Surroundings />
      ) : (
        <Mission1Surroundings />
      )}
    </group>
  );
}
