/**
 * Powder-yard dressing for Mise III. Sandstone and timber are the 30%.
 * The court cobble stays the calm 60%. Gold and orange stay on the cord,
 * the kegs, and the falconet. The Old Town coal is emissive only.
 */
import type { GridCoord } from "../../core/types";
import { useGameStore } from "../../store/useGameStore";
import { continuousGridToWorld, FLOOR_HEIGHT, gridToWorld } from "./worldCoords";

const SAND = "#7d7267";
const TIMBER = "#3d342e";
const NO_RAYCAST = () => null;

function place(coord: GridCoord, dx = 0, dy = 0, dz = 0): [number, number, number] {
  const [x, y, z] = gridToWorld(coord);
  return [x + dx, y + dy, z + dz];
}

export function PowderYardDressing() {
  const scenario = useGameStore((s) => s.scenario);
  if (scenario !== "mission3") return null;

  const roof = continuousGridToWorld(14, 0, 8.5);
  const coal = continuousGridToWorld(28, 8, 6);
  const posts: GridCoord[] = [
    { x: 8, y: 0, z: 12 },
    { x: 15, y: 0, z: 12 },
    { x: 8, y: 0, z: 14 },
    { x: 15, y: 0, z: 14 },
  ];

  return (
    <group>
      <mesh position={[roof[0], roof[1] + 2.55, roof[2]]} raycast={NO_RAYCAST}>
        <boxGeometry args={[4.7, 0.16, 3.1]} />
        <meshStandardMaterial color={SAND} roughness={0.86} metalness={0.02} />
      </mesh>

      {posts.map((coord) => (
        <mesh
          key={`post-${coord.x}-${coord.z}`}
          position={place(coord, coord.x === 8 ? -0.62 : 0.62, 1.15, coord.z === 12 ? -0.62 : 0.62)}
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[0.16, FLOOR_HEIGHT * 0.92, 0.16]} />
          <meshStandardMaterial color={TIMBER} roughness={0.8} />
        </mesh>
      ))}

      <mesh position={place({ x: 17, y: 0, z: 10 }, 0.42, 0.55, 0)} rotation={[0, 0, Math.PI / 2]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.08, 0.1, 0.7, 8]} />
        <meshStandardMaterial color="#f97316" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={place({ x: 17, y: 0, z: 10 }, 0.42, 0.32, 0)} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.55, 0.16, 0.28]} />
        <meshStandardMaterial color={TIMBER} roughness={0.82} />
      </mesh>

      {[
        { x: 16, y: 0 as const, z: 12 },
        { x: 17, y: 0 as const, z: 11 },
      ].map((coord) => (
        <mesh key={`gabion-${coord.x}-${coord.z}`} position={place(coord, 0, 0.42, 0)} raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.46, 0.5, 0.7, 8]} />
          <meshStandardMaterial color={SAND} roughness={0.92} />
        </mesh>
      ))}

      <mesh position={place({ x: 12, y: 0, z: 10 }, 0.55, 0.85, -0.42)} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 1.5, 0.28]} />
        <meshStandardMaterial color={TIMBER} roughness={0.78} />
      </mesh>
      <mesh position={place({ x: 12, y: 0, z: 10 }, 0.55, 0.85, 0.42)} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 1.5, 0.28]} />
        <meshStandardMaterial color={TIMBER} roughness={0.78} />
      </mesh>

      <mesh position={place({ x: 8, y: 0, z: 12 }, -0.48, 0.14, 0.2)} rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <torusGeometry args={[0.16, 0.045, 6, 10]} />
        <meshStandardMaterial color={TIMBER} roughness={0.9} />
      </mesh>

      {[0.12, 0.28, 0.44].map((step, index) => (
        <mesh
          key={`stair-${index}`}
          position={place({ x: 10, y: 0, z: 12 }, 0, step, 0.48)}
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[0.7, 0.08, 0.22]} />
          <meshStandardMaterial color={SAND} roughness={0.88} />
        </mesh>
      ))}

      <mesh position={[coal[0], coal[1], coal[2]]} raycast={NO_RAYCAST}>
        <sphereGeometry args={[0.55, 10, 8]} />
        <meshStandardMaterial color="#1c140f" emissive="#f97316" emissiveIntensity={1.6} roughness={1} />
      </mesh>
    </group>
  );
}
