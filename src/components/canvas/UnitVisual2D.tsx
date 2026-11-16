/**
 * 2D Billboard Sprite Renderer (/src/components/canvas/UnitVisual2D.tsx).
 * Uses <Billboard> from @react-three/drei with <mesh castShadow receiveShadow>,
 * alphaTest={0.5}, and a custom RGBADepthPacking depth material so 2D sprites
 * cast real 3D silhouette shadows onto the multi-floor battlefield.
 * Includes subtle secondary wind motion (cloak/plume sway) so units breathe during turns.
 */

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type {
  CardinalDir,
  Faction,
  FirearmLockType,
  UnitArchetype,
  WeatherType,
} from "../../core/types";
import { useGameStore } from "../../store/useGameStore";
import {
  getSharedDepthMaterial,
  getSharedSpriteTexture,
  resolveSpriteVariant,
} from "../../utils/proceduralSprites";
import { FACING_YAW } from "./diegeticLights";
import { MatchcordCoal } from "./UnitVisual3D";

interface UnitVisual2DProps {
  archetype: UnitArchetype;
  faction: Faction;
  facing: CardinalDir;
  hitTimestamp?: number;
  opacity?: number;
  lockType?: FirearmLockType;
  weather?: WeatherType;
  roofed?: boolean;
  unitId?: string;
}

export function UnitVisual2D({
  archetype,
  faction,
  facing,
  hitTimestamp = 0,
  opacity = 1,
  lockType,
  weather = "clear",
  roofed = false,
  unitId,
}: UnitVisual2DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pennantRef = useRef<THREE.Mesh>(null);
  const spriteMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const scenario = useGameStore((s) => s.scenario);
  const variant = resolveSpriteVariant(archetype, unitId, scenario);

  const texture = useMemo(
    () => getSharedSpriteTexture(variant),
    [variant],
  );

  const depthMaterial = useMemo(
    () => getSharedDepthMaterial(variant),
    [variant],
  );

  const baseEmissive = useMemo(
    () => new THREE.Color(faction === "player" ? "#3b2112" : "#122038"),
    [faction],
  );
  const flashEmissive = useMemo(() => new THREE.Color("#ef4444"), []);

  // Subtle secondary wind motion & zero-alloc hit-flash decay
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(t * 2.2) * 0.022;
      const breath = 1 + Math.sin(t * 3.1) * 0.012;
      meshRef.current.scale.set(1, breath, 1);
    }
    if (pennantRef.current) {
      pennantRef.current.rotation.y = Math.sin(t * 4.8) * 0.28;
      pennantRef.current.rotation.z = Math.cos(t * 3.6) * 0.12;
    }
    if (spriteMatRef.current) {
      let flash = 0;
      if (hitTimestamp > 0) {
        const elapsed = (performance.now() - hitTimestamp) / 1000;
        if (elapsed >= 0 && elapsed < 1.05) {
          flash = Math.pow(1 - elapsed / 1.05, 1.5);
        }
      }
      if (flash > 0.05) {
        spriteMatRef.current.emissive.copy(flashEmissive);
        spriteMatRef.current.emissiveIntensity = flash * 1.8;
      } else {
        spriteMatRef.current.emissive.copy(baseEmissive);
        spriteMatRef.current.emissiveIntensity = 0.22;
      }
    }
  });

  const ribbonColor =
    scenario === "mission3" && faction !== "player"
      ? "#dc2626"
      : faction === "player"
        ? archetype === "sniper"
          ? "#eab308"
          : "#dc2626"
        : "#facc15";

  return (
    <group>
      {/* Directional facing chevron & matchcord glow aligned in 3D facing yaw */}
      <group rotation={[0, FACING_YAW[facing], 0]}>
        <mesh position={[0, 0.025, 0.44]} rotation={[-Math.PI * 0.5, 0, 0]}>
          <coneGeometry args={[0.1, 0.18, 3]} />
          <meshBasicMaterial
            color={ribbonColor}
            transparent
            opacity={opacity * 0.78}
          />
        </mesh>
        {lockType === "matchlock" && (
          <MatchcordCoal weather={weather} roofed={roofed} />
        )}
      </group>

      {/* lockX={true} and lockZ={true} keep the miniature figurine standing vertically upright on the floor
          while turning horizontally (yaw) toward the camera, producing authentic grounded 3D shadows. */}
      <Billboard follow={true} lockX={true} lockY={false} lockZ={true}>
        <mesh
          ref={meshRef}
          position={[0, 0.94, 0]}
          castShadow
          receiveShadow
          customDepthMaterial={depthMaterial}
        >
          <planeGeometry args={[1.52, 1.88]} />
          <meshStandardMaterial
            ref={spriteMatRef}
            map={texture}
            transparent
            opacity={opacity}
            alphaTest={0.5}
            roughness={0.48}
            metalness={0.12}
            emissive={faction === "player" ? "#3b2112" : "#122038"}
            emissiveIntensity={0.22}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Secondary fluttering heraldic sash/streamer in the wind behind unit */}
        <mesh
          ref={pennantRef}
          position={[
            variant === "trooper" ? -0.18 : 0.28,
            variant === "trooper" ? 1.56 : 1.12,
            -0.06,
          ]}
        >
          <planeGeometry args={[0.34, 0.11]} />
          <meshStandardMaterial
            color={ribbonColor}
            roughness={0.6}
            transparent={opacity < 0.99}
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
