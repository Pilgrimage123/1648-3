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
import { useGameStore } from "../../store/useGameStore";
import {
  continuousGridToWorld,
  FLOOR_HEIGHT,
  gridToWorld,
  TILE_SIZE,
} from "./worldCoords";

const noRaycast = () => null;

const BRASS_GOLD = "#d4a73f";
const BRIGHT_GOLD = "#facc15";
const ANTIQUE_BRONZE = "#8c6d2c";
const CARDINAL_VELVET = "#6b151e";
const DEEP_CRIMSON = "#4a1218";
const WALNUT_DARK = "#362216";
const WALNUT_MID = "#4d3120";
const STUCCO_CREAM = "#8f8274";
const STUCCO_WARM = "#a69786";
const LIMESTONE_TRIM = "#75695d";
const SANDSTONE_WEATHERED = "#635a50";
const CRYSTAL_ICE = "#e0f2fe";
const FLAME_CORE = "#fef08a";
const FLAME_HALO = "#f59e0b";

interface ChandelierSpec {
  id: string;
  x: number;
  y: 0 | 1;
  z: number;
  tiers: 1 | 2;
  candleCount: number;
  hangHeight: number;
  ceilingHeight: number;
  scale: number;
}

const PALACE_CHANDELIERS: ChandelierSpec[] = [
  // Piano Nobile (y = 1) — High vaulted ceilings
  {
    id: "chandelier-grand-staircase",
    x: 11.5,
    y: 1,
    z: 23.2,
    tiers: 2,
    candleCount: 10,
    hangHeight: 2.05,
    ceilingHeight: 2.86,
    scale: 1.24,
  },
  {
    id: "chandelier-knights-gallery",
    x: 11.5,
    y: 1,
    z: 16.9,
    tiers: 2,
    candleCount: 8,
    hangHeight: 1.98,
    ceilingHeight: 2.78,
    scale: 1.06,
  },
  {
    id: "chandelier-colloredo-bedchamber",
    x: 5.0,
    y: 1,
    z: 23.5,
    tiers: 2,
    candleCount: 8,
    hangHeight: 1.98,
    ceilingHeight: 2.78,
    scale: 1.1,
  },
  {
    id: "chandelier-west-antechamber",
    x: 5.0,
    y: 1,
    z: 18.8,
    tiers: 1,
    candleCount: 6,
    hangHeight: 1.94,
    ceilingHeight: 2.72,
    scale: 0.95,
  },
  {
    id: "chandelier-east-gallery-north",
    x: 18.0,
    y: 1,
    z: 19.5,
    tiers: 2,
    candleCount: 8,
    hangHeight: 1.98,
    ceilingHeight: 2.78,
    scale: 1.04,
  },
  {
    id: "chandelier-east-chapter-hall",
    x: 18.0,
    y: 1,
    z: 24.2,
    tiers: 2,
    candleCount: 8,
    hangHeight: 1.98,
    ceilingHeight: 2.78,
    scale: 1.06,
  },
  // Ground Floor (y = 0) — Vaulted Sala Terrena, Armory & Convent Hall
  {
    id: "chandelier-p0-vestibule",
    x: 11.5,
    y: 0,
    z: 20.9,
    tiers: 1,
    candleCount: 8,
    hangHeight: 1.82,
    ceilingHeight: 2.34,
    scale: 0.96,
  },
  {
    id: "chandelier-p0-armory",
    x: 5.5,
    y: 0,
    z: 21.0,
    tiers: 1,
    candleCount: 6,
    hangHeight: 1.8,
    ceilingHeight: 2.34,
    scale: 0.9,
  },
  {
    id: "chandelier-p0-chapter",
    x: 18.0,
    y: 0,
    z: 21.5,
    tiers: 1,
    candleCount: 8,
    hangHeight: 1.82,
    ceilingHeight: 2.34,
    scale: 0.94,
  },
];

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
 * Multi-tiered 17th-century Bohemian crystal & gilded brass chandelier
 * with open gilded filigree crown, suspension chain, crystal drops, and flickering candle crown.
 */
function BaroqueCrystalChandelier({
  spec,
  opacity,
  phaseOffset,
}: {
  spec: ChandelierSpec;
  opacity: number;
  phaseOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRingRef = useRef<THREE.Group>(null);
  const [wx, wy, wz] = continuousGridToWorld(spec.x, spec.y, spec.z);
  const isTransparent = opacity < 0.99;
  const chainLen = Math.max(0.24, spec.ceilingHeight - spec.hangHeight);

  const candleAngles = useMemo(
    () =>
      Array.from(
        { length: spec.candleCount },
        (_, i) => (i / spec.candleCount) * Math.PI * 2,
      ),
    [spec.candleCount],
  );

  const upperCandleAngles = useMemo(() => {
    if (spec.tiers !== 2) return [];
    const upperCount = Math.max(4, Math.floor(spec.candleCount * 0.5));
    return Array.from(
      { length: upperCount },
      (_, i) => (i / upperCount) * Math.PI * 2 + Math.PI / upperCount,
    );
  }, [spec.tiers, spec.candleCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.45 + phaseOffset) * 0.04;
      groupRef.current.rotation.z = Math.cos(t * 0.7 + phaseOffset) * 0.012;
    }
    if (flameRingRef.current) {
      const pulse =
        0.92 +
        Math.sin(t * 13.5 + phaseOffset * 2.1) * 0.1 +
        Math.cos(t * 21.0 + phaseOffset) * 0.06;
      flameRingRef.current.scale.set(1, pulse, 1);
    }
  });

  if (opacity <= 0.02) return null;

  return (
    <group position={[wx, wy, wz]}>
      {/* Open gilded filigree ceiling crown & hook at vault apex (never blocks top-down view) */}
      <group position={[0, spec.ceilingHeight, 0]}>
        <mesh rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.16 * spec.scale, 0.022, 8, 16]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.85}
            roughness={0.22}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, -0.03, 0]} raycast={noRaycast}>
          <sphereGeometry args={[0.065 * spec.scale, 10, 10]} />
          <meshStandardMaterial
            color={BRIGHT_GOLD}
            metalness={0.88}
            roughness={0.2}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
      </group>

      {/* Suspension chain & chandelier body */}
      <group ref={groupRef} position={[0, spec.hangHeight, 0]} scale={spec.scale}>
        {/* Brass suspension rod/chain up to ceiling rosette */}
        <mesh position={[0, chainLen / (2 * spec.scale), 0]} raycast={noRaycast}>
          <cylinderGeometry args={[0.022, 0.022, chainLen / spec.scale, 8]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.85}
            roughness={0.25}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>

        {/* Central turned brass baluster shaft */}
        <mesh position={[0, 0.12, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[0.055, 0.09, 0.56, 12]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.88}
            roughness={0.2}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>
        <mesh position={[0, 0.26, 0]} raycast={noRaycast}>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.9}
            roughness={0.18}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>

        {/* Lower cut-crystal sphere pendant */}
        <mesh position={[0, -0.22, 0]} raycast={noRaycast}>
          <octahedronGeometry args={[0.12, 1]} />
          <meshStandardMaterial
            color={CRYSTAL_ICE}
            emissive="#fde68a"
            emissiveIntensity={0.45}
            metalness={0.25}
            roughness={0.08}
            transparent
            opacity={Math.min(0.88, opacity)}
          />
        </mesh>

        {/* Main lower ornate wheel ring */}
        <mesh rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.56, 0.032, 10, 24]} />
          <meshStandardMaterial
            color={BRASS_GOLD}
            metalness={0.88}
            roughness={0.22}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>

        {/* Inner decorative filigree ring */}
        <mesh position={[0, 0.04, 0]} rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.34, 0.02, 8, 20]} />
          <meshStandardMaterial
            color={ANTIQUE_BRONZE}
            metalness={0.82}
            roughness={0.28}
            transparent={isTransparent}
            opacity={opacity}
          />
        </mesh>

        {/* Upper second tier ring (for grand 2-tier chandeliers) */}
        {spec.tiers === 2 && (
          <mesh position={[0, 0.28, 0]} rotation={[Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
            <torusGeometry args={[0.36, 0.025, 8, 20]} />
            <meshStandardMaterial
              color={BRASS_GOLD}
              metalness={0.88}
              roughness={0.22}
              transparent={isTransparent}
              opacity={opacity}
            />
          </mesh>
        )}

        {/* Radial S-scroll arms, drip pans, wax candles & crystal drops */}
        {candleAngles.map((ang, idx) => {
          const r = 0.58;
          const cx = Math.cos(ang) * r;
          const cz = Math.sin(ang) * r;
          const midX = Math.cos(ang) * (r * 0.52);
          const midZ = Math.sin(ang) * (r * 0.52);
          return (
            <group key={`c-arm-${idx}`}>
              {/* Brass spoke arm */}
              <mesh
                position={[midX, 0.01, midZ]}
                rotation={[0, -ang, Math.PI * 0.5]}
                raycast={noRaycast}
              >
                <cylinderGeometry args={[0.014, 0.018, r * 0.95, 6]} />
                <meshStandardMaterial
                  color={BRASS_GOLD}
                  metalness={0.85}
                  roughness={0.24}
                  transparent={isTransparent}
                  opacity={opacity}
                />
              </mesh>
              {/* Bobèche drip saucer */}
              <mesh position={[cx, 0.04, cz]} raycast={noRaycast}>
                <cylinderGeometry args={[0.055, 0.035, 0.025, 10]} />
                <meshStandardMaterial
                  color={BRASS_GOLD}
                  metalness={0.88}
                  roughness={0.2}
                  transparent={isTransparent}
                  opacity={opacity}
                />
              </mesh>
              {/* Beeswax candle */}
              <mesh position={[cx, 0.12, cz]} raycast={noRaycast}>
                <cylinderGeometry args={[0.022, 0.024, 0.14, 8]} />
                <meshStandardMaterial
                  color="#fef3c7"
                  emissive="#f59e0b"
                  emissiveIntensity={0.25}
                  roughness={0.65}
                  transparent={isTransparent}
                  opacity={opacity}
                />
              </mesh>
              {/* Hanging crystal teardrop prism beneath arm */}
              <mesh position={[cx * 0.88, -0.09, cz * 0.88]} raycast={noRaycast}>
                <octahedronGeometry args={[0.048, 0]} />
                <meshStandardMaterial
                  color={CRYSTAL_ICE}
                  emissive="#fde68a"
                  emissiveIntensity={0.55}
                  metalness={0.2}
                  roughness={0.08}
                  transparent
                  opacity={Math.min(0.85, opacity)}
                />
              </mesh>
            </group>
          );
        })}

        {/* Upper tier candles */}
        {upperCandleAngles.map((ang, idx) => {
          const r = 0.36;
          const cx = Math.cos(ang) * r;
          const cz = Math.sin(ang) * r;
          return (
            <group key={`u-arm-${idx}`} position={[cx, 0.31, cz]}>
              <mesh raycast={noRaycast}>
                <cylinderGeometry args={[0.045, 0.03, 0.02, 8]} />
                <meshStandardMaterial
                  color={BRASS_GOLD}
                  metalness={0.88}
                  roughness={0.2}
                  transparent={isTransparent}
                  opacity={opacity}
                />
              </mesh>
              <mesh position={[0, 0.07, 0]} raycast={noRaycast}>
                <cylinderGeometry args={[0.018, 0.02, 0.11, 8]} />
                <meshStandardMaterial
                  color="#fef3c7"
                  emissive="#f59e0b"
                  emissiveIntensity={0.25}
                  roughness={0.65}
                  transparent={isTransparent}
                  opacity={opacity}
                />
              </mesh>
            </group>
          );
        })}

        {/* Animated flickering candle flames */}
        <group ref={flameRingRef}>
          {candleAngles.map((ang, idx) => {
            const r = 0.58;
            const cx = Math.cos(ang) * r;
            const cz = Math.sin(ang) * r;
            return (
              <group key={`c-flame-${idx}`} position={[cx, 0.22, cz]}>
                <mesh raycast={noRaycast}>
                  <coneGeometry args={[0.026, 0.075, 6]} />
                  <meshBasicMaterial
                    color={FLAME_CORE}
                    transparent
                    opacity={Math.min(0.95, opacity)}
                  />
                </mesh>
                <mesh position={[0, -0.01, 0]} raycast={noRaycast}>
                  <sphereGeometry args={[0.042, 6, 6]} />
                  <meshBasicMaterial
                    color={FLAME_HALO}
                    transparent
                    opacity={0.38 * opacity}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}
          {upperCandleAngles.map((ang, idx) => {
            const r = 0.36;
            const cx = Math.cos(ang) * r;
            const cz = Math.sin(ang) * r;
            return (
              <mesh
                key={`u-flame-${idx}`}
                position={[cx, 0.44, cz]}
                raycast={noRaycast}
              >
                <coneGeometry args={[0.022, 0.065, 6]} />
                <meshBasicMaterial
                  color={FLAME_CORE}
                  transparent
                  opacity={Math.min(0.95, opacity)}
                />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

/**
 * Framed Chiaroscuro Oil Painting (Caravaggio / Rembrandt style) with ornate gilded Baroque frame
 * and picture-frame corner bosses.
 */
function BaroqueMasterpiecePainting({
  x,
  y,
  z,
  rotY = 0,
  width = 1.35,
  height = 0.92,
  canvasTone = "#2c1812",
  subjectTone = "#c27838",
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
  opacity?: number;
}) {
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  const isTransparent = opacity < 0.99;
  if (opacity <= 0.02) return null;

  return (
    <group position={[wx, wy + 1.68, wz]} rotation={[0, rotY, 0]}>
      {/* Gilded outer moulded frame */}
      <mesh raycast={noRaycast}>
        <boxGeometry args={[width, height, 0.055]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.78}
          roughness={0.28}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Top Baroque crest cartouche */}
      <mesh position={[0, height * 0.54, 0.015]} raycast={noRaycast}>
        <boxGeometry args={[width * 0.32, 0.12, 0.06]} />
        <meshStandardMaterial
          color={BRIGHT_GOLD}
          metalness={0.85}
          roughness={0.22}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Dark Chiaroscuro background canvas */}
      <mesh position={[0, 0, 0.032]} raycast={noRaycast}>
        <planeGeometry args={[width - 0.16, height - 0.16]} />
        <meshStandardMaterial
          color={canvasTone}
          roughness={0.62}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Illuminated Caravaggio focal figure/highlight */}
      <mesh position={[-width * 0.08, -0.02, 0.036]} raycast={noRaycast}>
        <planeGeometry args={[(width - 0.16) * 0.42, (height - 0.16) * 0.64]} />
        <meshStandardMaterial
          color={subjectTone}
          emissive={subjectTone}
          emissiveIntensity={0.14}
          roughness={0.5}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/**
 * Woven Crimson & Gold Maltese Heraldic Wall Tapestry (Gobelín s maltézským křížem).
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
  const [wx, wy, wz] = continuousGridToWorld(x, y, z);
  const isTransparent = opacity < 0.99;
  if (opacity <= 0.02) return null;

  return (
    <group position={[wx, wy + 1.62, wz]} rotation={[0, rotY, 0]}>
      {/* Brass tapestry rod */}
      <mesh position={[0, 0.72, 0.02]} rotation={[0, 0, Math.PI * 0.5]} raycast={noRaycast}>
        <cylinderGeometry args={[0.024, 0.024, 1.32, 8]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.85}
          roughness={0.24}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Cardinal velvet tapestry drape */}
      <mesh position={[0, 0, 0.02]} raycast={noRaycast}>
        <boxGeometry args={[1.14, 1.36, 0.028]} />
        <meshStandardMaterial
          color={CARDINAL_VELVET}
          roughness={0.82}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Gold brocade border */}
      <mesh position={[0, 0, 0.036]} raycast={noRaycast}>
        <boxGeometry args={[0.98, 1.2, 0.01]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.72}
          roughness={0.32}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0, 0.044]} raycast={noRaycast}>
        <boxGeometry args={[0.88, 1.1, 0.01]} />
        <meshStandardMaterial
          color={DEEP_CRIMSON}
          roughness={0.85}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Maltese Cross emblem in center */}
      <mesh position={[0, 0.06, 0.054]} raycast={noRaycast}>
        <boxGeometry args={[0.42, 0.12, 0.012]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#fef3c7"
          emissiveIntensity={0.18}
          roughness={0.4}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.06, 0.054]} raycast={noRaycast}>
        <boxGeometry args={[0.12, 0.42, 0.012]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#fef3c7"
          emissiveIntensity={0.18}
          roughness={0.4}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/**
 * High-Ceiling Vaulted Arch Rib spanning across a palace hall.
 */
function BaroqueVaultArchSpan({
  x1,
  x2,
  z,
  y,
  ceilingY,
  opacity,
}: {
  x1: number;
  x2: number;
  z: number;
  y: 0 | 1;
  ceilingY: number;
  opacity: number;
}) {
  const [wx1, wy, wz] = continuousGridToWorld(x1, y, z);
  const [wx2] = continuousGridToWorld(x2, y, z);
  const centerX = (wx1 + wx2) * 0.5;
  const spanWidth = Math.abs(wx2 - wx1);
  const isTransparent = opacity < 0.99;

  if (opacity <= 0.02) return null;

  return (
    <group position={[centerX, wy, wz]}>
      {/* Left & Right fluted wall pilasters */}
      {[-spanWidth * 0.5, spanWidth * 0.5].map((px, idx) => (
        <group key={`pilaster-${idx}`} position={[px, 0, 0]}>
          <mesh position={[0, ceilingY * 0.48, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.24, ceilingY * 0.96, 0.28]} />
            <meshStandardMaterial
              color={STUCCO_WARM}
              roughness={0.62}
              transparent={isTransparent}
              opacity={opacity}
            />
          </mesh>
          {/* Gilded Corinthian pilaster capital */}
          <mesh position={[0, ceilingY * 0.92, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.34, 0.18, 0.36]} />
            <meshStandardMaterial
              color={BRASS_GOLD}
              metalness={0.78}
              roughness={0.28}
              transparent={isTransparent}
              opacity={opacity}
            />
          </mesh>
        </group>
      ))}

      {/* Transverse coffered stucco ceiling rib */}
      <mesh position={[0, ceilingY, 0]} raycast={noRaycast}>
        <boxGeometry args={[spanWidth + 0.2, 0.18, 0.32]} />
        <meshStandardMaterial
          color={STUCCO_CREAM}
          roughness={0.65}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
      {/* Gilded soffit trim strip */}
      <mesh position={[0, ceilingY - 0.1, 0]} raycast={noRaycast}>
        <boxGeometry args={[spanWidth - 0.1, 0.03, 0.12]} />
        <meshStandardMaterial
          color={BRASS_GOLD}
          metalness={0.8}
          roughness={0.26}
          transparent={isTransparent}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

export function GrandPrioryPalaceDressing() {
  const scenario = useGameStore((s) => s.scenario);
  const activeFloor = useGameStore((s) => s.activeFloor);
  const actionMode = useGameStore((s) => s.actionMode);
  const activeProjectile = useGameStore((s) => s.activeProjectile);
  const waterwheelRef = useRef<THREE.Group>(null);

  const isShootingView = actionMode === "shoot" || activeProjectile !== null;

  useFrame((_, delta) => {
    if (waterwheelRef.current) {
      waterwheelRef.current.rotation.x -= delta * 0.65;
    }
  });

  if (scenario !== "mission1") return null;

  // Floor cutaway visibility:
  // When viewing P0, P1 architecture & chandeliers fade to ghosted 0.04 so P0 is 100% clear.
  // During shooting view, chandeliers fade slightly so OTS camera stays crisp.
  const p1Opacity = activeFloor < 1 ? 0.03 : isShootingView ? 0.45 : 1.0;
  const p0CeilingOpacity = activeFloor === 0 ? (isShootingView ? 0.45 : 1.0) : 0.18;

  const [, wy1] = gridToWorld({ x: 0, y: 1, z: 0 });
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
          2. SOARING HIGH CEILINGS, VAULTED ARCHES & CRYSTAL CHANDELIERS
         ===================================================================== */}
      {PALACE_CHANDELIERS.map((spec, idx) => (
        <BaroqueCrystalChandelier
          key={spec.id}
          spec={spec}
          opacity={spec.y === 1 ? p1Opacity : p0CeilingOpacity}
          phaseOffset={idx * 1.37}
        />
      ))}

      {/* Piano Nobile High-Ceiling Transverse Vault Ribs (2.82m above P1 floor) */}
      {p1Opacity > 0.05 && (
        <group>
          <BaroqueVaultArchSpan
            x1={2.35}
            x2={7.65}
            z={23.5}
            y={1}
            ceilingY={2.82}
            opacity={p1Opacity}
          />
          <BaroqueVaultArchSpan
            x1={2.35}
            x2={7.65}
            z={18.8}
            y={1}
            ceilingY={2.76}
            opacity={p1Opacity}
          />
          <BaroqueVaultArchSpan
            x1={8.35}
            x2={14.65}
            z={23.2}
            y={1}
            ceilingY={2.9}
            opacity={p1Opacity}
          />
          <BaroqueVaultArchSpan
            x1={15.35}
            x2={20.65}
            z={19.5}
            y={1}
            ceilingY={2.82}
            opacity={p1Opacity}
          />
          <BaroqueVaultArchSpan
            x1={15.35}
            x2={20.65}
            z={24.2}
            y={1}
            ceilingY={2.82}
            opacity={p1Opacity}
          />

          {/* High-Ceiling Crown Cornice & Clerestory Entablature along Rear Palace Wall (z = 27) */}
          {(() => {
            const [wxL, , wzRear] = continuousGridToWorld(2, 1, 27);
            const [wxR] = continuousGridToWorld(21, 1, 27);
            const width = Math.abs(wxR - wxL) + TILE_SIZE;
            const cx = (wxL + wxR) * 0.5;
            return (
              <group position={[cx, wy1, wzRear]}>
                {/* Upper high-ceiling clerestory frieze raising rear wall to 3.45m */}
                <mesh position={[0, 2.88, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[width, 1.05, TILE_SIZE * 0.92]} />
                  <meshStandardMaterial
                    color="#7d7267"
                    roughness={0.72}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
                {/* Gilded Baroque Modillion Crown Cornice */}
                <mesh position={[0, 3.44, -0.08]} raycast={noRaycast}>
                  <boxGeometry args={[width + 0.24, 0.18, TILE_SIZE * 1.08]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.72}
                    roughness={0.3}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
                {/* Sculpted Baroque Roof Balustrade & Pediment above Grand Staircase */}
                <mesh position={[0, 3.75, 0]} raycast={noRaycast}>
                  <boxGeometry args={[6.4, 0.48, 0.42]} />
                  <meshStandardMaterial
                    color={STUCCO_WARM}
                    roughness={0.62}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
                <mesh position={[0, 4.12, -0.05]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.08, 1.8, 0.55, 3]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.8}
                    roughness={0.25}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
              </group>
            );
          })()}

          {/* Arched Baroque Palace Windows with Warm Candlelit Mullions on Rear Wall (z = 26.5) */}
          {[4.0, 6.2, 9.8, 13.2, 16.8, 19.2].map((winX, idx) => {
            const [wx, , wz] = continuousGridToWorld(winX, 1, 26.52);
            return (
              <group key={`palace-window-${idx}`} position={[wx, wy1 + 1.85, wz]}>
                {/* Stone architrave surround */}
                <mesh raycast={noRaycast}>
                  <boxGeometry args={[1.05, 1.72, 0.12]} />
                  <meshStandardMaterial
                    color={STUCCO_WARM}
                    roughness={0.65}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
                {/* Triangular pediment cap */}
                <mesh position={[0, 0.96, 0.02]} raycast={noRaycast}>
                  <boxGeometry args={[1.18, 0.16, 0.16]} />
                  <meshStandardMaterial
                    color={BRASS_GOLD}
                    metalness={0.72}
                    roughness={0.3}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
                {/* Leaded glass pane reflecting warm interior candlelight & cool night */}
                <mesh position={[0, -0.02, -0.065]} raycast={noRaycast}>
                  <planeGeometry args={[0.82, 1.46]} />
                  <meshStandardMaterial
                    color="#1e293b"
                    emissive="#fbbf24"
                    emissiveIntensity={0.28}
                    metalness={0.65}
                    roughness={0.18}
                    transparent={p1Opacity < 0.99}
                    opacity={p1Opacity}
                  />
                </mesh>
                {/* Golden window cross mullions */}
                <mesh position={[0, -0.02, -0.072]} raycast={noRaycast}>
                  <boxGeometry args={[0.82, 0.045, 0.02]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, -0.02, -0.072]} raycast={noRaycast}>
                  <boxGeometry args={[0.045, 1.46, 0.02]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.8} roughness={0.25} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* =====================================================================
          3. GRAND PRIOR COLLOREDO'S BEDCHAMBER & STUDY (P1: x: 3..7, z: 22..26)
             Strictly Perimeter-Aligned so walkable tiles stay 100% clear!
         ===================================================================== */}
      {p1Opacity > 0.05 && (
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
                  <meshStandardMaterial color={WALNUT_DARK} roughness={0.65} />
                </mesh>
                {/* Gilded base moulding */}
                <mesh position={[0, 0.04, 0]} raycast={noRaycast}>
                  <boxGeometry args={[1.24, 0.06, 1.74]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.8} roughness={0.28} />
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
                  <meshStandardMaterial color={WALNUT_MID} roughness={0.58} />
                </mesh>
                <mesh position={[-0.47, 1.15, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.04, 0.38, 0.38]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.85} roughness={0.22} />
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
                      <meshStandardMaterial color={BRASS_GOLD} metalness={0.82} roughness={0.25} />
                    </mesh>
                    {/* Gilded finial plume above canopy */}
                    <mesh position={[0, 2.34, 0]} raycast={noRaycast}>
                      <sphereGeometry args={[0.075, 10, 10]} />
                      <meshStandardMaterial color={BRIGHT_GOLD} metalness={0.88} roughness={0.2} />
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
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.85} roughness={0.22} />
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
                  <meshStandardMaterial color={WALNUT_MID} roughness={0.58} />
                </mesh>
                <mesh position={[0, 0.84, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.78, 0.05, 1.38]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.75} roughness={0.3} />
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
                    <meshStandardMaterial color={WALNUT_DARK} roughness={0.65} />
                  </mesh>
                  <mesh position={[0, 0.78, 0]} raycast={noRaycast}>
                    <sphereGeometry args={[0.22, 14, 14]} />
                    <meshStandardMaterial
                      color="#d6c49e"
                      metalness={0.35}
                      roughness={0.42}
                    />
                  </mesh>
                  <mesh position={[0, 0.78, 0]} rotation={[0.4, 0, 0]} raycast={noRaycast}>
                    <torusGeometry args={[0.25, 0.016, 8, 20]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.88} roughness={0.2} />
                  </mesh>
                </group>
              </group>
            );
          })()}

          {/* 3C. Maltese Reliquary Altar & Kneeling Prie-Dieu (x: 5.0, z: 26.32) */}
          {(() => {
            const [ax, ay, az] = continuousGridToWorld(5.0, 1, 26.32);
            return (
              <group position={[ax, ay, az]}>
                {/* Kneeling velvet cushion & walnut prie-dieu */}
                <mesh position={[0, 0.06, -0.28]} raycast={noRaycast}>
                  <boxGeometry args={[0.68, 0.12, 0.34]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.48, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.92, 0.92, 0.42]} />
                  <meshStandardMaterial color={WALNUT_DARK} roughness={0.6} />
                </mesh>
                {/* Altar cloth & Golden Maltese Reliquary Cross */}
                <mesh position={[0, 0.95, -0.02]} raycast={noRaycast}>
                  <boxGeometry args={[0.96, 0.04, 0.46]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.7} />
                </mesh>
                <mesh position={[0, 1.32, 0.06]} raycast={noRaycast}>
                  <boxGeometry args={[0.06, 0.56, 0.05]} />
                  <meshStandardMaterial color={BRIGHT_GOLD} metalness={0.9} roughness={0.18} />
                </mesh>
                <mesh position={[0, 1.42, 0.06]} raycast={noRaycast}>
                  <boxGeometry args={[0.36, 0.06, 0.05]} />
                  <meshStandardMaterial color={BRIGHT_GOLD} metalness={0.9} roughness={0.18} />
                </mesh>
              </group>
            );
          })()}

          {/* 3D. Baroque Walnut Credenza & Bookcase along Colloredo's Suite Perimeter */}
          {(() => {
            const [lx, ly, lz] = continuousGridToWorld(6.35, 1, 26.32);
            const [cx, cy, cz] = continuousGridToWorld(7.38, 1, 24.0);
            return (
              <group>
                {/* Tall Baroque Bookcase against rear wall (z = 26.32) */}
                <group position={[lx, ly, lz]}>
                  <mesh position={[0, 1.05, 0]} castShadow raycast={noRaycast}>
                    <boxGeometry args={[1.28, 2.08, 0.36]} />
                    <meshStandardMaterial color={WALNUT_DARK} roughness={0.62} />
                  </mesh>
                  <mesh position={[0, 2.12, -0.02]} raycast={noRaycast}>
                    <boxGeometry args={[1.36, 0.1, 0.42]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
                  </mesh>
                  {[0.55, 1.05, 1.55].map((shelfY, sIdx) => (
                    <mesh
                      key={`shelf-${sIdx}`}
                      position={[0, shelfY, -0.16]}
                      raycast={noRaycast}
                    >
                      <boxGeometry args={[1.12, 0.32, 0.08]} />
                      <meshStandardMaterial
                        color={sIdx % 2 === 0 ? "#7c2d12" : "#78350f"}
                        roughness={0.7}
                      />
                    </mesh>
                  ))}
                </group>
                {/* Low Carved Walnut Credenza with Gilded Candelabrum & Goblets along x = 7.38 */}
                <group position={[cx, cy, cz]}>
                  <mesh position={[0, 0.42, 0]} castShadow raycast={noRaycast}>
                    <boxGeometry args={[0.38, 0.82, 2.2]} />
                    <meshStandardMaterial color={WALNUT_MID} roughness={0.6} />
                  </mesh>
                  <mesh position={[0, 0.85, 0]} raycast={noRaycast}>
                    <boxGeometry args={[0.44, 0.05, 2.28]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
                  </mesh>
                </group>
              </group>
            );
          })()}

          {/* 3E. Dress the two Tactical Low-Wall Cover Tiles in Colloredo's Room:
              (4, 1, 24) as a Baroque Velvet Divan & (6, 1, 24) as a Gilded Chest Table */}
          {(() => {
            const [c1x, c1y, c1z] = gridToWorld({ x: 4, y: 1, z: 24 });
            const [c2x, c2y, c2z] = gridToWorld({ x: 6, y: 1, z: 24 });
            return (
              <group>
                {/* Velvet Baroque Settee / Divan cap on (4, 1, 24) */}
                <group position={[c1x, c1y, c1z]}>
                  <mesh position={[0, 0.86, 0]} raycast={noRaycast}>
                    <boxGeometry args={[TILE_SIZE * 0.88, 0.1, TILE_SIZE * 0.88]} />
                    <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.75} />
                  </mesh>
                  <mesh position={[0, 0.96, -0.34]} raycast={noRaycast}>
                    <boxGeometry args={[TILE_SIZE * 0.88, 0.22, 0.16]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
                  </mesh>
                </group>
                {/* Inlaid Walnut Table with Silver Ewer & Goblet on (6, 1, 24) */}
                <group position={[c2x, c2y, c2z]}>
                  <mesh position={[0, 0.86, 0]} raycast={noRaycast}>
                    <boxGeometry args={[TILE_SIZE * 0.9, 0.08, TILE_SIZE * 0.9]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.75} roughness={0.3} />
                  </mesh>
                  <mesh position={[0.14, 1.02, 0.08]} raycast={noRaycast}>
                    <cylinderGeometry args={[0.06, 0.09, 0.24, 10]} />
                    <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.18} />
                  </mesh>
                </group>
              </group>
            );
          })()}

          {/* =====================================================================
              4. KNIGHT'S HALL, GRAND STAIRCASE & EAST CONVENT GALLERY (P1)
             ===================================================================== */}
          {/* Monumental Maltese Heraldic Achievement behind Grand Staircase (x: 11.5, z: 26.42) */}
          {(() => {
            const [hx, hy, hz] = continuousGridToWorld(11.5, 1, 26.42);
            return (
              <group position={[hx, hy + 1.85, hz]}>
                {/* Carved limestone baroque cartouche */}
                <mesh raycast={noRaycast}>
                  <boxGeometry args={[2.1, 1.48, 0.12]} />
                  <meshStandardMaterial color={STUCCO_WARM} roughness={0.58} />
                </mesh>
                {/* Cardinal crimson shield */}
                <mesh position={[0, 0, -0.075]} raycast={noRaycast}>
                  <boxGeometry args={[1.45, 1.12, 0.06]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.75} />
                </mesh>
                {/* Gilded baroque scrollwork frame */}
                <mesh position={[0, 0.78, -0.08]} raycast={noRaycast}>
                  <boxGeometry args={[1.85, 0.16, 0.1]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.85} roughness={0.22} />
                </mesh>
                {/* Eight-pointed Maltese Cross in bright silver-white & gold */}
                <mesh position={[0, 0, -0.12]} raycast={noRaycast}>
                  <boxGeometry args={[0.72, 0.2, 0.04]} />
                  <meshStandardMaterial
                    color="#f8fafc"
                    emissive="#fef3c7"
                    emissiveIntensity={0.24}
                    roughness={0.35}
                  />
                </mesh>
                <mesh position={[0, 0, -0.12]} raycast={noRaycast}>
                  <boxGeometry args={[0.2, 0.72, 0.04]} />
                  <meshStandardMaterial
                    color="#f8fafc"
                    emissive="#fef3c7"
                    emissiveIntensity={0.24}
                    roughness={0.35}
                  />
                </mesh>
              </group>
            );
          })()}

          {/* Classical Marble Statues on Plinths flanking Grand Staircase (x: 9.7 & x: 13.3, z: 26.32) */}
          {[9.7, 13.3].map((sx, idx) => {
            const [stx, sty, stz] = continuousGridToWorld(sx, 1, 26.32);
            return (
              <group key={`stair-statue-${idx}`} position={[stx, sty, stz]}>
                <mesh position={[0, 0.45, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.48, 0.9, 0.48]} />
                  <meshStandardMaterial color={LIMESTONE_TRIM} roughness={0.62} />
                </mesh>
                <mesh position={[0, 0.92, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.54, 0.08, 0.54]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
                </mesh>
                {/* Classical marble torso & draped toga */}
                <mesh position={[0, 1.38, 0]} castShadow raycast={noRaycast}>
                  <cylinderGeometry args={[0.14, 0.18, 0.82, 10]} />
                  <meshStandardMaterial color="#e7e2d8" roughness={0.45} />
                </mesh>
                <mesh position={[0, 1.92, 0]} castShadow raycast={noRaycast}>
                  <sphereGeometry args={[0.13, 10, 10]} />
                  <meshStandardMaterial color="#e7e2d8" roughness={0.45} />
                </mesh>
              </group>
            );
          })}

          {/* Courtyard Balustrade Gilded Urns & Crimson Drapery Swags (Cour d'honneur P1) */}
          {[
            [9, 17],
            [14, 17],
            [9, 21],
            [14, 21],
          ].map(([px, pz], idx) => {
            const [ux, uy, uz] = gridToWorld({ x: px!, y: 1, z: pz! });
            return (
              <group key={`courtyard-urn-${idx}`} position={[ux, uy + 2.04, uz]}>
                <mesh raycast={noRaycast}>
                  <boxGeometry args={[0.98, 0.18, 0.98]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.8} roughness={0.26} />
                </mesh>
                <mesh position={[0, 0.24, 0]} raycast={noRaycast}>
                  <sphereGeometry args={[0.22, 12, 12]} />
                  <meshStandardMaterial color={BRIGHT_GOLD} metalness={0.85} roughness={0.22} />
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
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.8} roughness={0.26} />
                  </mesh>
                ))}
                {/* Wing-shaped harpsichord case */}
                <mesh position={[0, 0.78, 0]} castShadow raycast={noRaycast}>
                  <boxGeometry args={[0.68, 0.22, 1.56]} />
                  <meshStandardMaterial color={CARDINAL_VELVET} roughness={0.55} />
                </mesh>
                <mesh position={[0, 0.89, 0]} raycast={noRaycast}>
                  <boxGeometry args={[0.72, 0.04, 1.6]} />
                  <meshStandardMaterial color={BRASS_GOLD} metalness={0.85} roughness={0.22} />
                </mesh>
                {/* Ivory keyboard manual */}
                <mesh position={[-0.28, 0.82, -0.45]} raycast={noRaycast}>
                  <boxGeometry args={[0.18, 0.06, 0.54]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                </mesh>
              </group>
            );
          })()}

          {/* Chiaroscuro Oil Paintings & Maltese Heraldic Tapestries on Perimeter Walls */}
          <BaroqueMasterpiecePainting
            x={2.58}
            y={1}
            z={18.8}
            rotY={Math.PI * 0.5}
            canvasTone="#231510"
            subjectTone="#d97706"
            opacity={p1Opacity}
          />
          <BaroqueMasterpiecePainting
            x={17.8}
            y={1}
            z={26.42}
            rotY={Math.PI}
            width={1.65}
            height={1.08}
            canvasTone="#1f1410"
            subjectTone="#ea580c"
            opacity={p1Opacity}
          />
          <MalteseHeraldicTapestry
            x={2.58}
            y={1}
            z={21.0}
            rotY={Math.PI * 0.5}
            opacity={p1Opacity}
          />
          <MalteseHeraldicTapestry
            x={8.2}
            y={1}
            z={26.42}
            rotY={Math.PI}
            opacity={p1Opacity}
          />
          <MalteseHeraldicTapestry
            x={14.8}
            y={1}
            z={26.42}
            rotY={Math.PI}
            opacity={p1Opacity}
          />
        </group>
      )}

      {/* =====================================================================
          5. GROUND FLOOR MALTESE ARMORY, COUR D'HONNEUR & SALA TERRENA (y = 0)
         ===================================================================== */}
      <group>
        {/* 5A. Cour d'honneur Inlaid Marble Maltese Compass Rose (x: 11.5, y: 0, z: 19.0)
            Flat floor mosaic (height 0.014m) so walkable courtyard tiles remain 100% unobstructed! */}
        {(() => {
          const [mx, my, mz] = continuousGridToWorld(11.5, 0, 19.0);
          return (
            <group position={[mx, my + 0.012, mz]}>
              <mesh rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <ringGeometry args={[1.15, 1.38, 24]} />
                <meshStandardMaterial color={BRASS_GOLD} metalness={0.72} roughness={0.32} />
              </mesh>
              <mesh rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <circleGeometry args={[1.14, 24]} />
                <meshStandardMaterial color="#2b211d" roughness={0.75} />
              </mesh>
              {/* Inlaid Golden Maltese Star */}
              <mesh position={[0, 0.003, 0]} rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <planeGeometry args={[1.45, 0.34]} />
                <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
              </mesh>
              <mesh position={[0, 0.003, 0]} rotation={[-Math.PI * 0.5, 0, 0]} raycast={noRaycast}>
                <planeGeometry args={[0.34, 1.45]} />
                <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
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
                <meshStandardMaterial color={WALNUT_DARK} roughness={0.75} />
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
                    <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.22} />
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
                <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Comb morion helmet */}
              <mesh position={[0, 1.52, 0]} castShadow raycast={noRaycast}>
                <sphereGeometry args={[0.14, 10, 10]} />
                <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.22} />
              </mesh>
            </group>
          );
        })}

        {/* 5C. Sala Terrena Garden Façade Broken Pediment & Maltese Portal Crest (z = 15.55, x = 11.5) */}
        {(() => {
          const [fx, fy, fz] = continuousGridToWorld(11.5, 0, 15.52);
          return (
            <group position={[fx, fy, fz]}>
              {/* Twin fluted sandstone pilasters framing the garden portal */}
              {[-1.55, 1.55].map((px, idx) => (
                <group key={`facade-pilaster-${idx}`} position={[px, 0, 0]}>
                  <mesh position={[0, FLOOR_HEIGHT * 0.5, 0]} castShadow raycast={noRaycast}>
                    <boxGeometry args={[0.34, FLOOR_HEIGHT, 0.34]} />
                    <meshStandardMaterial color={STUCCO_WARM} roughness={0.65} />
                  </mesh>
                  <mesh position={[0, FLOOR_HEIGHT - 0.12, 0]} raycast={noRaycast}>
                    <boxGeometry args={[0.44, 0.2, 0.44]} />
                    <meshStandardMaterial color={BRASS_GOLD} metalness={0.78} roughness={0.28} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        })()}
      </group>

      {/* =====================================================================
          6. HISTORICAL JULY 26, 1648 PERIMETER LANDMARKS:
             - Church of Our Lady Beneath the Chain (Kostel Panny Marie pod řetězem, z > 27)
             - Velkopřevorský mlýn Waterwheel on Čertovka (x: 1.15, z: 2.2)
             - Baroque Garden Statues & Calm Parterre Borders (z: 5..15)
         ===================================================================== */}
      <group>
        {/* 6A. Twin Towers of the Church of Our Lady Beneath the Chain (South Perimeter z = 28.6) */}
        {[6.0, 17.0].map((tx, idx) => {
          const [wx, wy, wz] = continuousGridToWorld(tx, 0, 28.65);
          return (
            <group key={`maltese-church-tower-${idx}`} position={[wx, wy, wz]}>
              {/* Massive Gothic-Baroque stone tower shaft */}
              <mesh position={[0, 4.4, 0]} castShadow receiveShadow raycast={noRaycast}>
                <boxGeometry args={[3.4, 8.8, 2.8]} />
                <meshStandardMaterial color="#4a433c" roughness={0.82} />
              </mesh>
              {/* Sandstone quoins / stringcourse */}
              <mesh position={[0, 5.2, 0]} raycast={noRaycast}>
                <boxGeometry args={[3.56, 0.24, 2.96]} />
                <meshStandardMaterial color={STUCCO_CREAM} roughness={0.7} />
              </mesh>
              <mesh position={[0, 8.75, 0]} raycast={noRaycast}>
                <boxGeometry args={[3.64, 0.28, 3.04]} />
                <meshStandardMaterial color={BRASS_GOLD} metalness={0.65} roughness={0.35} />
              </mesh>
              {/* Warm candlelit stained-glass belfry lancet window facing the palace */}
              <mesh position={[0, 6.8, -1.42]} raycast={noRaycast}>
                <planeGeometry args={[0.92, 2.1]} />
                <meshStandardMaterial
                  color="#451a03"
                  emissive="#f59e0b"
                  emissiveIntensity={0.75}
                  roughness={0.3}
                />
              </mesh>
              {/* Pyramidal Baroque spire & gilded Maltese cross finial */}
              <mesh position={[0, 10.4, 0]} rotation={[0, Math.PI * 0.25, 0]} raycast={noRaycast}>
                <coneGeometry args={[2.45, 3.2, 4]} />
                <meshStandardMaterial color="#27272a" metalness={0.25} roughness={0.75} />
              </mesh>
              <mesh position={[0, 12.25, 0]} raycast={noRaycast}>
                <sphereGeometry args={[0.2, 10, 10]} />
                <meshStandardMaterial color={BRIGHT_GOLD} metalness={0.9} roughness={0.18} />
              </mesh>
            </group>
          );
        })}

        {/* 6B. Velkopřevorský Mlýn Rotating Wooden Waterwheel on the Čertovka Canal (x: 1.15, z: 2.2) */}
        {(() => {
          const [mx, my, mz] = continuousGridToWorld(1.15, 0, 2.2);
          return (
            <group position={[mx, my + 0.35, mz]}>
              {/* Stone mill sluice pier */}
              <mesh position={[-0.55, 0.35, 0]} castShadow raycast={noRaycast}>
                <boxGeometry args={[0.75, 1.45, 2.2]} />
                <meshStandardMaterial color="#3f3a34" roughness={0.85} />
              </mesh>
              {/* Rotating oak waterwheel */}
              <group ref={waterwheelRef} position={[0.05, 0.28, 0]}>
                <mesh rotation={[0, 0, Math.PI * 0.5]} raycast={noRaycast}>
                  <cylinderGeometry args={[0.14, 0.14, 0.48, 10]} />
                  <meshStandardMaterial color={WALNUT_DARK} roughness={0.8} />
                </mesh>
                <mesh rotation={[0, Math.PI * 0.5, 0]} raycast={noRaycast}>
                  <torusGeometry args={[1.05, 0.08, 8, 20]} />
                  <meshStandardMaterial color={WALNUT_MID} roughness={0.78} />
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
                      <meshStandardMaterial color={WALNUT_DARK} roughness={0.82} />
                    </mesh>
                  );
                })}
              </group>
            </group>
          );
        })()}

        {/* 6C. Classical Baroque Sandstone Garden Statues on Belvedere Corner Pillars */}
        {[
          [9, 9],
          [14, 9],
          [9, 12],
          [14, 12],
        ].map(([gx, gz], idx) => {
          const [sx, sy, sz] = gridToWorld({ x: gx!, y: 1, z: gz! });
          return (
            <group key={`belvedere-finial-${idx}`} position={[sx, sy + 2.02, sz]}>
              <mesh raycast={noRaycast}>
                <boxGeometry args={[0.92, 0.16, 0.92]} />
                <meshStandardMaterial color={SANDSTONE_WEATHERED} roughness={0.72} />
              </mesh>
              <mesh position={[0, 0.24, 0]} raycast={noRaycast}>
                <sphereGeometry args={[0.2, 10, 10]} />
                <meshStandardMaterial color={BRASS_GOLD} metalness={0.75} roughness={0.3} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
