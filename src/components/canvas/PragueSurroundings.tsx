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
import { useLayoutEffect, useMemo, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { MISSION1_MOON_POSITION, MISSION2_SUN_POSITION } from "./diegeticLights";

const NO_RAYCAST = () => null;

// Board extents in world space (24 × 28 tiles, TILE_SIZE 1.6, centred on origin)
const BX = 19.2;
const BZ = 22.4;

type Mission = "mission1" | "mission2" | "mission3";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a world XZ point to the board rectangle (0 inside). */
function distToBoard(x: number, z: number): number {
  const dx = Math.max(0, Math.abs(x) - BX);
  const dz = Math.max(0, Math.abs(z) - BZ);
  return Math.hypot(dx, dz);
}

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
  if (!visible) return null;
  return (
    <points geometry={geom} renderOrder={-9} raycast={NO_RAYCAST} frustumCulled={false}>
      <pointsMaterial color="#cbd5e1" size={0.55} sizeAttenuation fog={false} transparent opacity={0.75} depthWrite={false} />
    </points>
  );
}

// ---------------------------------------------------------------------------
// House rows (instanced bodies + 45° tiled gable roofs + chimneys + lit windows)
// ---------------------------------------------------------------------------

interface House {
  x: number;
  z: number;
  w: number; // along ridge
  d: number; // across ridge
  h: number; // eaves height
  ridgeAlongX: boolean;
  normal: [number, number]; // facade facing the board
  facade: string;
  roof: string;
}

interface RowSpec {
  /** Row start & end along its length axis */
  from: number;
  to: number;
  /** Fixed coordinate across the row (row centre line) */
  at: number;
  alongX: boolean;
  depth: number;
  normal: [number, number];
  maxH: number;
  baseY?: number;
}

const FACADES_NIGHT = ["#4a443d", "#3f3a35", "#504638", "#463d3a", "#3b3833", "#4d4335"];
const FACADES_DAY = ["#8a7e6c", "#7d7468", "#93836a", "#857063", "#787268", "#8e7a5e", "#7a6f62"];
const ROOFS_NIGHT = ["#3a2420", "#33211d", "#3d2a22"];
const ROOFS_DAY = ["#7a4634", "#6e4030", "#80503a", "#6a4a3c"];

function buildHouses(rows: RowSpec[], night: boolean, seed: number): House[] {
  const rand = mulberry32(seed);
  const facades = night ? FACADES_NIGHT : FACADES_DAY;
  const roofs = night ? ROOFS_NIGHT : ROOFS_DAY;
  const out: House[] = [];
  for (const row of rows) {
    let s = row.from;
    while (s < row.to) {
      const w = 2.4 + rand() * 2.2;
      const mid = s + w * 0.5;
      s += w + (rand() < 0.12 ? 1.6 : 0.06); // occasional lane
      const x = row.alongX ? mid : row.at;
      const z = row.alongX ? row.at : mid;
      // near face distance to board → height cap (camera pitch ≈ 48.6°, tan ≈ 1.13)
      const nx = x - row.normal[0] * row.depth * 0.5;
      const nz = z - row.normal[1] * row.depth * 0.5;
      const dist = distToBoard(nx, nz);
      const roofH = row.depth * 0.5;
      const cap = Math.min(row.maxH, dist * 1.0 - roofH);
      if (cap < 1.4) continue;
      const h = Math.max(1.4, Math.min(cap, 3.6 + rand() * 5.2));
      out.push({
        x,
        z,
        w,
        d: row.depth,
        h,
        ridgeAlongX: row.alongX,
        normal: row.normal,
        facade: facades[Math.floor(rand() * facades.length)]!,
        roof: roofs[Math.floor(rand() * roofs.length)]!,
      });
    }
  }
  return out;
}

const _m = new THREE.Object3D();
const _c = new THREE.Color();

function HouseRows({ houses, night }: { houses: House[]; night: boolean }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const chimRef = useRef<THREE.InstancedMesh>(null);
  const corniceRef = useRef<THREE.InstancedMesh>(null);
  const winRef = useRef<THREE.InstancedMesh>(null);

  const windows = useMemo(() => {
    const rand = mulberry32(houses.length * 31 + (night ? 7 : 3));
    const list: { x: number; y: number; z: number; ry: number; lit: boolean }[] = [];
    for (const hs of houses) {
      const floors = Math.max(1, Math.floor((hs.h - 0.6) / 1.5));
      const cols = Math.max(1, Math.floor(hs.w / 1.1));
      const ry = Math.atan2(hs.normal[0], hs.normal[1]);
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const lit = night ? rand() < 0.22 : false;
          if (!night && rand() < 0.3) continue;
          const off = (c - (cols - 1) / 2) * (hs.w / cols);
          const y = 1.0 + f * 1.5;
          const fx = hs.x + hs.normal[0] * (hs.d * 0.5 + 0.02) + (hs.ridgeAlongX ? off : 0);
          const fz = hs.z + hs.normal[1] * (hs.d * 0.5 + 0.02) + (hs.ridgeAlongX ? 0 : off);
          list.push({ x: fx, y, z: fz, ry, lit });
        }
      }
    }
    return list;
  }, [houses, night]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const roof = roofRef.current;
    const chim = chimRef.current;
    const cornice = corniceRef.current;
    const win = winRef.current;
    if (!body || !roof || !chim || !cornice || !win) return;
    houses.forEach((hs, i) => {
      const sx = hs.ridgeAlongX ? hs.w : hs.d;
      const sz = hs.ridgeAlongX ? hs.d : hs.w;
      _m.position.set(hs.x, hs.h * 0.5 - 0.3, hs.z);
      _m.rotation.set(0, 0, 0);
      _m.scale.set(sx, hs.h + 0.6, sz);
      _m.updateMatrix();
      body.setMatrixAt(i, _m.matrix);
      body.setColorAt(i, _c.set(hs.facade));

      // Baroque cornice under the eaves
      _m.position.set(hs.x, hs.h - 0.05, hs.z);
      _m.scale.set(sx + 0.18, 0.16, sz + 0.18);
      _m.updateMatrix();
      cornice.setMatrixAt(i, _m.matrix);
      cornice.setColorAt(i, _c.set(hs.facade).multiplyScalar(1.25));

      // 45° gable roof: rotated square prism, half buried in the body
      const side = hs.d / Math.SQRT2;
      _m.position.set(hs.x, hs.h, hs.z);
      if (hs.ridgeAlongX) {
        _m.rotation.set(Math.PI / 4, 0, 0);
        _m.scale.set(hs.w + 0.12, side, side);
      } else {
        _m.rotation.set(0, 0, Math.PI / 4);
        _m.scale.set(side, side, hs.w + 0.12);
      }
      _m.updateMatrix();
      roof.setMatrixAt(i, _m.matrix);
      roof.setColorAt(i, _c.set(hs.roof));

      // Chimney stack
      _m.rotation.set(0, 0, 0);
      const cOff = (i % 3 - 1) * hs.w * 0.25;
      _m.position.set(
        hs.x + (hs.ridgeAlongX ? cOff : 0),
        hs.h + hs.d * 0.42,
        hs.z + (hs.ridgeAlongX ? 0 : cOff),
      );
      _m.scale.set(0.38, 0.9, 0.38);
      _m.updateMatrix();
      chim.setMatrixAt(i, _m.matrix);
      chim.setColorAt(i, _c.set(hs.facade).multiplyScalar(0.8));
    });
    windows.forEach((wd, i) => {
      _m.position.set(wd.x, wd.y, wd.z);
      _m.rotation.set(0, wd.ry, 0);
      _m.scale.set(1, 1, 1);
      _m.updateMatrix();
      win.setMatrixAt(i, _m.matrix);
      win.setColorAt(
        i,
        wd.lit ? _c.set("#f0a64a") : _c.set(night ? "#0b0d12" : "#2a2a2c"),
      );
    });
    for (const mesh of [body, roof, chim, cornice, win]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [houses, windows]);

  if (houses.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, houses.length]} receiveShadow castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={corniceRef} args={[undefined, undefined, houses.length]} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[undefined, undefined, houses.length]} receiveShadow castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={chimRef} args={[undefined, undefined, houses.length]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={winRef} args={[undefined, undefined, Math.max(1, windows.length)]} raycast={NO_RAYCAST}>
        <planeGeometry args={[0.42, 0.72]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
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
        <meshStandardMaterial color={copper} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[8, 37.4, -4]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.7, 0.9, 2.2, 8]} />
        <meshStandardMaterial color={copper} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[8, 39.6, -4]} raycast={NO_RAYCAST}>
        <coneGeometry args={[0.8, 2.6, 8]} />
        <meshStandardMaterial color={copper} roughness={0.6} metalness={0.3} />
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
  y = -0.2,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  color: string;
  y?: number;
}) {
  return (
    <mesh
      position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      raycast={NO_RAYCAST}
    >
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial color={color} roughness={0.14} metalness={0.32} />
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
      buildHouses(
        [
          // Old Town blocks behind Křižovnické náměstí (east)
          { from: -44, to: 44, at: 23.5, alongX: false, depth: 5, normal: [-1, 0], maxH: 7 },
          { from: -44, to: 44, at: 30, alongX: false, depth: 6, normal: [-1, 0], maxH: 10 },
          { from: -44, to: 44, at: 37, alongX: false, depth: 6, normal: [-1, 0], maxH: 12 },
          // Old Town riverside north & south of the board (east of quay)
          { from: 7, to: 21, at: -26, alongX: true, depth: 5, normal: [0, 1], maxH: 8 },
          { from: 7, to: 21, at: 26, alongX: true, depth: 5, normal: [0, -1], maxH: 8 },
          { from: 7, to: 21, at: -33, alongX: true, depth: 6, normal: [0, 1], maxH: 11 },
          { from: 7, to: 21, at: 33, alongX: true, depth: 6, normal: [0, -1], maxH: 11 },
          // Malá Strana across the Vltava (west bank)
          { from: -60, to: -8, at: -60, alongX: false, depth: 6, normal: [1, 0], maxH: 11 },
          { from: 8, to: 60, at: -60, alongX: false, depth: 6, normal: [1, 0], maxH: 11 },
          { from: -60, to: 60, at: -68, alongX: false, depth: 7, normal: [1, 0], maxH: 13 },
        ],
        false,
        2607,
      ),
    [],
  );
  const water = "#1d4f66";
  return (
    <group>
      {/* Vltava continuing north, south and west beyond the board */}
      <WaterRect x0={-57} x1={5.2} z0={-95} z1={-BZ} color={water} />
      <WaterRect x0={-57} x1={5.2} z0={BZ} z1={95} color={water} />
      <WaterRect x0={-57} x1={-BX} z0={-BZ} z1={BZ} color={water} />

      {/* Old Town quay embankment (off-board) & Malá Strana quay */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[5.5, -0.1, s * 58]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.7, 0.4, 72]} />
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

      <HouseRows houses={houses} night={false} />

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
      buildHouses(
        [
          // Kampa island beyond Čertovka (north)
          { from: -46, to: 46, at: -26, alongX: true, depth: 5, normal: [0, 1], maxH: 7 },
          { from: -46, to: 46, at: -33, alongX: true, depth: 6, normal: [0, 1], maxH: 10 },
          // Maltese Square & Lázeňská street (south)
          { from: -27, to: -12, at: 26, alongX: true, depth: 5, normal: [0, -1], maxH: 8 },
          { from: 2, to: 27, at: 26, alongX: true, depth: 5, normal: [0, -1], maxH: 8 },
          { from: -27, to: -14, at: 33, alongX: true, depth: 6, normal: [0, -1], maxH: 11 },
          { from: 4, to: 27, at: 33, alongX: true, depth: 6, normal: [0, -1], maxH: 11 },
          // West (towards Újezd) and east (towards the bridge) — skip the canal band
          { from: -12, to: 22, at: -23, alongX: false, depth: 5, normal: [1, 0], maxH: 8 },
          { from: -12, to: 22, at: 23, alongX: false, depth: 5, normal: [-1, 0], maxH: 8 },
          { from: -12, to: 40, at: -30, alongX: false, depth: 6, normal: [1, 0], maxH: 11 },
          { from: -12, to: 40, at: 30, alongX: false, depth: 6, normal: [-1, 0], maxH: 11 },
        ],
        true,
        1648,
      ),
    [],
  );
  const water = "#0b2f40";
  return (
    <group>
      {/* Čertovka canal continuing east & west beyond the board (z: 0..4) */}
      <WaterRect x0={-70} x1={-BX} z0={-BZ} z1={-14.4} color={water} y={-0.18} />
      <WaterRect x0={BX} x1={70} z0={-BZ} z1={-14.4} color={water} y={-0.18} />
      {[-14.2, -22.6].map((wz) => (
        <mesh key={wz} position={[0, -0.05, wz]} raycast={NO_RAYCAST}>
          <boxGeometry args={[140, 0.3, 0.4]} />
          <meshStandardMaterial color="#2c2823" roughness={0.95} />
        </mesh>
      ))}

      {/* Mill house continuing the on-board Čertovka wheel off the west edge.
          The wheel itself is the palace dressing at grid (1.15, 0, 2.2). */}
      <mesh position={[-23.2, 1.6, -18.1]} raycast={NO_RAYCAST}>
        <boxGeometry args={[4.2, 3.4, 5.2]} />
        <meshStandardMaterial color="#3d372f" roughness={0.95} />
      </mesh>
      <mesh position={[-23.2, 3.3, -18.1]} rotation={[0, 0, Math.PI / 4]} scale={[3.6, 3.6, 5.4]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#33211d" roughness={0.85} />
      </mesh>
      <mesh position={[-21.05, 1.8, -18.1]} rotation={[0, Math.PI / 2, 0]} raycast={NO_RAYCAST}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshBasicMaterial color="#f0a64a" toneMapped={false} />
      </mesh>

      <HouseRows houses={houses} night />

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
  const water = "#092533";
  return (
    <group>
      {/* Čertovka canal extensions north and south of x = 4..5 (world x = -12.8..-9.6) */}
      <WaterRect x0={-12.8} x1={-9.6} z0={-48} z1={-9.6} color={water} y={-0.36} />
      <WaterRect x0={-12.8} x1={-9.6} z0={1.6} z1={48} color={water} y={-0.36} />

      {/* Malá Strana bridgehead towers & shut arch east of the battery gate (world x = +15..+22) */}
      <mesh position={[19, 7, -3]} raycast={NO_RAYCAST}>
        <boxGeometry args={[6, 15, 16]} />
        <meshStandardMaterial color="#14181f" roughness={1} />
      </mesh>
      <mesh position={[18, 15, -7]} raycast={NO_RAYCAST}>
        <boxGeometry args={[3.2, 8, 3.2]} />
        <meshStandardMaterial color="#10141a" roughness={1} />
      </mesh>
      <mesh position={[18, 14, 2]} raycast={NO_RAYCAST}>
        <boxGeometry args={[3.2, 7, 3.2]} />
        <meshStandardMaterial color="#10141a" roughness={1} />
      </mesh>
      <mesh position={[15, 2.2, -5.6]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1.1, 4.4, 1.1]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>
      <mesh position={[15, 2.2, -1.2]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1.1, 4.4, 1.1]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>
      <mesh position={[15, 4.5, -3.4]} raycast={NO_RAYCAST}>
        <boxGeometry args={[1.2, 0.7, 4.6]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>
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
