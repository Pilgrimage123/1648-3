/**
 * 2D Billboard Sprite Renderer (/src/components/canvas/UnitVisual2D.tsx).
 * - For 1648 Swedish troops (all enemy units across Missions 1, 2, 3), renders a live
 *   HTML5 2D Canvas skeletal cut-out rig (hierarchical joints, 2-bone IK musket arms,
 *   swinging 12 Apostles powder flasks, coat-hem & rain-cloak inertia, jointed ostrich
 *   plumes, matte vadmal wool vs. shifting specular steel, trench mud weathering, and
 *   multi-stage black-powder firing VFX) onto a shadow-casting THREE.CanvasTexture!
 * - For Bohemian / Imperial defender units, keeps the crisp procedural SVG billboard sprites.
 */

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
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
import {
  drawSwedishSoldier2D,
  SWEDISH_CANVAS_H,
  SWEDISH_CANVAS_W,
} from "../../utils/swedishCanvasRenderer";
import {
  createSwedishRigState,
  resolveSwedishProfile,
  resolveUsesFurketa,
  stepSwedishRig,
  type SwedishAnimInput,
  type SwedishTroopProfile,
} from "../../utils/swedishRig2D";
import { facingForward, FACING_YAW } from "./diegeticLights";
import { MatchcordCoal } from "./UnitVisual3D";

export interface UnitVisual2DProps {
  archetype: UnitArchetype;
  faction: Faction;
  facing: CardinalDir;
  hitTimestamp?: number;
  opacity?: number;
  lockType?: FirearmLockType;
  weather?: WeatherType;
  roofed?: boolean;
  unitId?: string;
  /** Live animation state machine inputs for 2D rigged Swedish troops */
  isMoving?: boolean;
  isOverwatch?: boolean;
  isReloading?: boolean;
  inCover?: boolean;
  isDead?: boolean;
  lungeTimestamp?: number;
  lungeKind?: "recoil" | "melee";
  fireMisfired?: boolean;
  collapseTimestamp?: number;
  supportsRestFork?: boolean;
}

function hashUnitSeed(unitId?: string): number {
  if (!unitId) return 1.3;
  let h = 0;
  for (let i = 0; i < unitId.length; i++) {
    h = (h * 31 + unitId.charCodeAt(i)) % 997;
  }
  return (h / 997) * Math.PI * 2;
}

/**
 * Live HTML5 2D Canvas Skeletal Rigged Billboard for 1648 Swedish Soldiers.
 */
function SwedishRiggedVisual2D({
  profile,
  facing,
  opacity,
  lockType,
  weather,
  roofed,
  unitId,
  isMoving,
  isOverwatch,
  isReloading,
  inCover,
  isDead,
  lungeTimestamp,
  lungeKind,
  fireMisfired,
  hitTimestamp,
  collapseTimestamp,
  supportsRestFork,
  ribbonColor,
}: {
  profile: SwedishTroopProfile;
  facing: CardinalDir;
  opacity: number;
  lockType?: FirearmLockType;
  weather: WeatherType;
  roofed: boolean;
  unitId?: string;
  isMoving: boolean;
  isOverwatch: boolean;
  isReloading: boolean;
  inCover: boolean;
  isDead: boolean;
  lungeTimestamp: number;
  lungeKind: "recoil" | "melee";
  fireMisfired: boolean;
  hitTimestamp: number;
  collapseTimestamp: number;
  supportsRestFork?: boolean;
  ribbonColor: string;
}) {
  const spriteMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const hasFurketa = useMemo(
    () => resolveUsesFurketa(profile, supportsRestFork),
    [profile, supportsRestFork],
  );
  const rigRef = useRef(
    createSwedishRigState(hashUnitSeed(unitId) + profile.scratchSeed * 0.1, hasFurketa),
  );
  const accumRef = useRef(0);
  const facingSignRef = useRef<1 | -1>(facing === "W" || facing === "N" ? -1 : 1);
  const cameraRightRef = useRef(new THREE.Vector3(1, 0, 0));

  // Create dedicated offscreen 2D Canvas + THREE.CanvasTexture + matching shadow DepthMaterial
  const canvasBundle = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SWEDISH_CANVAS_W;
    canvas.height = SWEDISH_CANVAS_H;
    const ctx = canvas.getContext("2d");

    // Draw immediate crisp initial pose so software WebGL on-demand renderers see frame 0 immediately
    rigRef.current.pose.hasFurketa = hasFurketa;
    if (ctx) {
      drawSwedishSoldier2D(ctx, profile, rigRef.current.pose, facingSignRef.current);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: texture,
      alphaTest: 0.42,
    });

    return { canvas, ctx, texture, depthMaterial };
  }, [profile, hasFurketa]);

  useEffect(() => {
    return () => {
      canvasBundle.texture.dispose();
      canvasBundle.depthMaterial.dispose();
    };
  }, [canvasBundle]);

  const baseEmissive = useMemo(() => new THREE.Color("#14223a"), []);
  const flashEmissive = useMemo(() => new THREE.Color("#ef4444"), []);

  // Reusable input struct (zero per-frame allocations)
  const animInputRef = useRef<SwedishAnimInput>({
    isMoving: false,
    isOverwatch: false,
    isReloading: false,
    inCover: false,
    isDead: false,
    hasFurketa,
    fireElapsedSec: null,
    fireKind: "recoil",
    fireMisfired: false,
    hitElapsedSec: null,
    collapseElapsedSec: null,
    windStrength: 1,
  });

  useFrame(({ camera }, rawDelta) => {
    const ctx = canvasBundle.ctx;
    if (!ctx) return;

    const dt = Math.min(0.05, rawDelta);
    const now = performance.now();

    // Project 3D tactical facing vector onto the camera's screen-right axis so 2D soldiers aim/march toward their true direction
    cameraRightRef.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const [fx, fz] = facingForward(facing);
    const screenDot = fx * cameraRightRef.current.x + fz * cameraRightRef.current.z;
    let facingFlipped = false;
    if (screenDot > 0.08 && facingSignRef.current !== 1) {
      facingSignRef.current = 1;
      facingFlipped = true;
    } else if (screenDot < -0.08 && facingSignRef.current !== -1) {
      facingSignRef.current = -1;
      facingFlipped = true;
    }

    const fireElapsed =
      lungeTimestamp > 0 ? (now - lungeTimestamp) / 1000 : null;
    const hitElapsed =
      hitTimestamp > 0 ? (now - hitTimestamp) / 1000 : null;
    const collapseElapsed =
      isDead && collapseTimestamp > 0 ? (now - collapseTimestamp) / 1000 : null;

    const inp = animInputRef.current;
    inp.isMoving = isMoving;
    inp.isOverwatch = isOverwatch;
    inp.isReloading = isReloading;
    inp.inCover = inCover;
    inp.isDead = isDead;
    inp.hasFurketa = hasFurketa;
    inp.fireElapsedSec =
      fireElapsed !== null && fireElapsed >= 0 && fireElapsed <= 1.78
        ? fireElapsed
        : null;
    inp.fireKind = lungeKind;
    inp.fireMisfired = fireMisfired;
    inp.hitElapsedSec =
      hitElapsed !== null && hitElapsed >= 0 && hitElapsed < 0.75
        ? hitElapsed
        : null;
    inp.collapseElapsedSec = collapseElapsed;
    inp.windStrength = weather === "rain" ? 1.45 : weather === "fog" ? 0.8 : 1.05;

    const isHighAction =
      isMoving ||
      isDead ||
      isReloading ||
      inp.fireElapsedSec !== null ||
      inp.hitElapsedSec !== null;

    // Step physics every frame for silky springs; redraw 2D canvas at 60Hz during action, ~28Hz in idle
    const pose = stepSwedishRig(rigRef.current, inp, dt);

    accumRef.current += dt;
    const redrawInterval = isHighAction ? 0.014 : 0.036;
    if (facingFlipped || accumRef.current >= redrawInterval) {
      accumRef.current = 0;
      drawSwedishSoldier2D(ctx, profile, pose, facingSignRef.current);
      canvasBundle.texture.needsUpdate = true;
    }

    // Subtle emissive rim + hit flash response on the 3D billboard material
    if (spriteMatRef.current) {
      if (pose.hitFlash > 0.05) {
        spriteMatRef.current.emissive.copy(flashEmissive);
        spriteMatRef.current.emissiveIntensity = pose.hitFlash * 1.4;
      } else if (pose.fireSample.muzzleFlash > 0.05 || pose.fireSample.panFlash > 0.05) {
        spriteMatRef.current.emissive.set("#f97316");
        spriteMatRef.current.emissiveIntensity =
          0.24 + Math.max(pose.fireSample.muzzleFlash, pose.fireSample.panFlash) * 0.75;
      } else {
        spriteMatRef.current.emissive.copy(baseEmissive);
        spriteMatRef.current.emissiveIntensity = 0.24;
      }
    }
  });

  return (
    <group>
      {/* Directional facing chevron & matchcord glow aligned in 3D facing yaw */}
      <group rotation={[0, FACING_YAW[facing], 0]}>
        <mesh position={[0, 0.025, 0.44]} rotation={[-Math.PI * 0.5, 0, 0]}>
          <coneGeometry args={[0.1, 0.18, 3]} />
          <meshBasicMaterial
            color={ribbonColor}
            transparent
            opacity={opacity * 0.8}
          />
        </mesh>
        {lockType === "matchlock" && (
          <MatchcordCoal weather={weather} roofed={roofed} />
        )}
      </group>

      {/* Upright camera-facing billboard holding the live rigged 2D Canvas texture */}
      <Billboard follow={true} lockX={true} lockY={false} lockZ={true}>
        <mesh
          position={[0, 1.03, 0]}
          castShadow
          receiveShadow
          customDepthMaterial={canvasBundle.depthMaterial}
        >
          <planeGeometry args={[2.08, 2.08]} />
          <meshStandardMaterial
            ref={spriteMatRef}
            map={canvasBundle.texture}
            transparent
            opacity={opacity}
            alphaTest={0.42}
            roughness={0.5}
            metalness={0.14}
            emissive="#14223a"
            emissiveIntensity={0.24}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
    </group>
  );
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
  isMoving = false,
  isOverwatch = false,
  isReloading = false,
  inCover = false,
  isDead = false,
  lungeTimestamp = 0,
  lungeKind = "recoil",
  fireMisfired = false,
  collapseTimestamp = 0,
  supportsRestFork,
}: UnitVisual2DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pennantRef = useRef<THREE.Mesh>(null);
  const spriteMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const scenario = useGameStore((s) => s.scenario);
  const swedishProfile = useMemo(
    () => resolveSwedishProfile(archetype, unitId, scenario, faction),
    [archetype, unitId, scenario, faction],
  );

  const ribbonColor =
    scenario === "mission3" && faction !== "player"
      ? "#dc2626"
      : faction === "player"
        ? archetype === "sniper"
          ? "#eab308"
          : "#dc2626"
        : "#facc15";

  // Static SVG billboard path for Bohemian / Imperial player defenders
  const variant = resolveSpriteVariant(archetype, unitId, scenario);
  const texture = useMemo(
    () => (swedishProfile ? null : getSharedSpriteTexture(variant)),
    [swedishProfile, variant],
  );
  const depthMaterial = useMemo(
    () => (swedishProfile ? undefined : getSharedDepthMaterial(variant)),
    [swedishProfile, variant],
  );

  const baseEmissive = useMemo(
    () => new THREE.Color(faction === "player" ? "#3b2112" : "#122038"),
    [faction],
  );
  const flashEmissive = useMemo(() => new THREE.Color("#ef4444"), []);

  useFrame(({ clock }) => {
    if (swedishProfile) return;
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

  // Swedish troops use our live HTML5 2D Canvas skeletal cut-out rig!
  if (swedishProfile) {
    return (
      <SwedishRiggedVisual2D
        profile={swedishProfile}
        facing={facing}
        opacity={opacity}
        lockType={lockType}
        weather={weather}
        roofed={roofed}
        unitId={unitId}
        isMoving={isMoving}
        isOverwatch={isOverwatch}
        isReloading={isReloading}
        inCover={inCover}
        isDead={isDead}
        lungeTimestamp={lungeTimestamp}
        lungeKind={lungeKind}
        fireMisfired={fireMisfired}
        hitTimestamp={hitTimestamp}
        collapseTimestamp={collapseTimestamp}
        supportsRestFork={supportsRestFork}
        ribbonColor={ribbonColor}
      />
    );
  }

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
