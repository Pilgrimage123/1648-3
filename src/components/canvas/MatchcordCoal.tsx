import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { WeatherType } from "../../core/types";
import { LOCK_FORWARD_M, LOCK_HEIGHT_M, LOCK_RIGHT_M } from "./diegeticLights";

export function MatchcordCoal({
  weather = "clear",
  roofed = false,
}: {
  weather?: WeatherType;
  roofed?: boolean;
}) {
  const coalRef = useRef<THREE.Mesh>(null);
  const sparkA = useRef<THREE.Mesh>(null);
  const sparkB = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const outdoorRain = weather === "rain" && !roofed;
    const flicker = outdoorRain
      ? 0.25 + Math.abs(Math.sin(t * 23.0)) * 1.15
      : 0.78 + Math.sin(t * 9.2) * 0.28;
    for (const mesh of [coalRef.current, sparkA.current, sparkB.current]) {
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.6 * flicker;
    }
    if (sparkA.current) {
      sparkA.current.position.y = 0.05 + Math.abs(Math.sin(t * 14)) * 0.05;
    }
    if (sparkB.current) {
      sparkB.current.visible = !outdoorRain || Math.sin(t * 19) > -0.2;
    }
  });
  return (
    <group position={[LOCK_RIGHT_M, LOCK_HEIGHT_M, LOCK_FORWARD_M]}>
      <mesh ref={coalRef} raycast={() => null}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={2.6}
        />
      </mesh>
      <mesh ref={sparkA} position={[0.02, 0.05, 0.02]} raycast={() => null}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial
          color="#fdba74"
          emissive="#f97316"
          emissiveIntensity={3}
        />
      </mesh>
      <mesh ref={sparkB} position={[-0.015, 0.04, 0.03]} raycast={() => null}>
        <sphereGeometry args={[0.009, 6, 6]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#ea580c"
          emissiveIntensity={2.4}
        />
      </mesh>
    </group>
  );
}
