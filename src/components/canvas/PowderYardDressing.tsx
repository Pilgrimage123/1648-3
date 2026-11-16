/**
 * Powder-yard dressing for Mise III. Sandstone and timber are the 30%.
 * The court cobble stays the calm 60%. Gold and orange stay on the cord,
 * the kegs, the live cart clock, and the falconet. The Old Town coal is emissive only.
 */
import { LANE } from "../../core/mission3";
import type { GridCoord } from "../../core/types";
import { useGameStore } from "../../store/useGameStore";
import { continuousGridToWorld, FLOOR_HEIGHT, gridToWorld } from "./worldCoords";

const SAND = "#7d7267";
const TIMBER = "#3d342e";
const IRON = "#292524";
const NO_RAYCAST = () => null;

function place(coord: GridCoord, dx = 0, dy = 0, dz = 0): [number, number, number] {
  const [x, y, z] = gridToWorld(coord);
  return [x + dx, y + dy, z + dz];
}

function SpokedWheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh raycast={NO_RAYCAST}>
        <torusGeometry args={[0.24, 0.032, 6, 12]} />
        <meshStandardMaterial color={IRON} roughness={0.65} metalness={0.45} />
      </mesh>
      {[0, Math.PI / 3, (Math.PI * 2) / 3].map((ang) => (
        <mesh key={ang} rotation={[0, 0, ang]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.44, 0.035, 0.03]} />
          <meshStandardMaterial color={TIMBER} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function PowderCart({ coord, dx = 0 }: { coord: GridCoord; dx?: number }) {
  return (
    <group position={place(coord, dx, 0, 0)}>
      {/* Timber bed and side shafts facing west toward the bearer */}
      <mesh position={[0.04, 0.28, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.72, 0.08, 0.56]} />
        <meshStandardMaterial color={TIMBER} roughness={0.85} />
      </mesh>
      {[-0.24, 0.24].map((sz) => (
        <mesh key={`shaft-${sz}`} position={[-0.36, 0.3, sz]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.48, 0.05, 0.06]} />
          <meshStandardMaterial color={TIMBER} roughness={0.85} />
        </mesh>
      ))}
      <SpokedWheel position={[0.06, 0.25, -0.32]} />
      <SpokedWheel position={[0.06, 0.25, 0.32]} />
      {/* Iron-hooped powder keg strapped atop the cart */}
      <mesh position={[0.06, 0.58, 0]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.22, 0.2, 0.52, 12]} />
        <meshStandardMaterial color="#f97316" roughness={0.55} metalness={0.22} />
      </mesh>
      {[-0.14, 0.14].map((hy) => (
        <mesh key={`hoop-${hy}`} position={[0.06, 0.58 + hy, 0]} raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.226, 0.226, 0.04, 12]} />
          <meshStandardMaterial color={IRON} roughness={0.5} metalness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function FieldFalconet({ coord }: { coord: GridCoord }) {
  return (
    <group position={place(coord, 0.22, 0, 0)}>
      {/* Axle tree and spoked wheels */}
      <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.05, 0.05, 0.88, 8]} />
        <meshStandardMaterial color={TIMBER} roughness={0.85} />
      </mesh>
      <SpokedWheel position={[0, 0.26, -0.44]} />
      <SpokedWheel position={[0, 0.26, 0.44]} />

      {/* Split-trail oak carriage cheeks */}
      {[-0.1, 0.1].map((cz) => (
        <mesh
          key={`trail-${cz}`}
          position={[0.32, 0.28, cz]}
          rotation={[0, cz < 0 ? -0.14 : 0.14, -0.26]}
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[0.88, 0.1, 0.08]} />
          <meshStandardMaterial color={TIMBER} roughness={0.84} />
        </mesh>
      ))}

      {/* Tapered bronze/iron barrel aiming west (-X) with reinforce rings & cascabel */}
      <mesh position={[-0.08, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.075, 0.105, 0.96, 12]} />
        <meshStandardMaterial color="#f97316" roughness={0.42} metalness={0.38} />
      </mesh>
      {[-0.48, -0.18, 0.14].map((rx) => (
        <mesh key={`ring-${rx}`} position={[rx, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.108, 0.108, 0.045, 12]} />
          <meshStandardMaterial color={IRON} roughness={0.45} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.42, 0.52, 0]} raycast={NO_RAYCAST}>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshStandardMaterial color={IRON} roughness={0.45} metalness={0.6} />
      </mesh>

      {/* Planted linstock (doutnáková hůl) with glowing ember tip at the breech */}
      <mesh position={[0.48, 0.42, 0.34]} rotation={[0.18, 0, -0.1]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.018, 0.02, 0.84, 6]} />
        <meshStandardMaterial color={TIMBER} roughness={0.9} />
      </mesh>
      <mesh position={[0.52, 0.83, 0.41]} raycast={NO_RAYCAST}>
        <sphereGeometry args={[0.042, 6, 6]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

export function PowderYardDressing() {
  const scenario = useGameStore((s) => s.scenario);
  const activeFloor = useGameStore((s) => s.activeFloor);
  const m3 = useGameStore((s) => s.m3);
  if (scenario !== "mission3") return null;

  const roof = continuousGridToWorld(14, 0, 8.5);
  const coal = continuousGridToWorld(28, 8, 6);
  const posts: GridCoord[] = [
    { x: 8, y: 0, z: 12 },
    { x: 15, y: 0, z: 12 },
    { x: 8, y: 0, z: 14 },
    { x: 15, y: 0, z: 14 },
  ];
  const storeCutaway = activeFloor === 0;
  const cartCoord = m3?.cart ? (LANE[m3.cart.laneIndex] ?? LANE[0]!) : null;
  const showStagedCart =
    !m3?.cookedOff && !m3?.cart && Boolean(m3?.spawnQueued) && (m3?.deliveries ?? 0) < 3;

  return (
    <group>
      {/* Coach-house roof slab: cutaway at P0 so the store interior stays readable */}
      <mesh position={[roof[0], roof[1] + 2.55, roof[2]]} raycast={NO_RAYCAST}>
        <boxGeometry args={[4.7, 0.16, 3.1]} />
        <meshStandardMaterial
          color={SAND}
          roughness={0.86}
          metalness={0.02}
          transparent={storeCutaway}
          opacity={storeCutaway ? 0.14 : 1}
          depthWrite={!storeCutaway}
        />
      </mesh>
      {/* Timber roof rafters framing the store eaves */}
      {[-1.48, 1.48].map((rz) => (
        <mesh key={`eave-${rz}`} position={[roof[0], roof[1] + 2.48, roof[2] + rz]} raycast={NO_RAYCAST}>
          <boxGeometry args={[4.75, 0.12, 0.14]} />
          <meshStandardMaterial color={TIMBER} roughness={0.85} />
        </mesh>
      ))}

      {/* Store interior reserve kegs along the north wall */}
      {[-0.36, 0.36].map((kx) => (
        <mesh key={`reserve-${kx}`} position={place({ x: 14, y: 0, z: 8 }, kx, 0.34, -0.4)} raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.24, 0.22, 0.64, 10]} />
          <meshStandardMaterial color="#b45309" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* Battery gate timber posts and iron-strapped arch lintel at (17,0,8) */}
      {[-0.56, 0.56].map((gz) => (
        <mesh key={`gate-post-${gz}`} position={place({ x: 17, y: 0, z: 8 }, 0.54, 1.05, gz)} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.2, 2.1, 0.2]} />
          <meshStandardMaterial color={TIMBER} roughness={0.84} />
        </mesh>
      ))}
      <mesh position={place({ x: 17, y: 0, z: 8 }, 0.54, 2.14, 0)} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.24, 0.24, 1.38]} />
        <meshStandardMaterial color={SAND} roughness={0.88} />
      </mesh>

      {/* Gallery support posts */}
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

      {/* Lodge y=1 half-cover balustrade */}
      <mesh position={continuousGridToWorld(11.5, 1, 12).map((v, i) => (i === 1 ? v + 0.36 : i === 2 ? v - 0.68 : v)) as [number, number, number]} raycast={NO_RAYCAST}>
        <boxGeometry args={[12.6, 0.72, 0.12]} />
        <meshStandardMaterial color={TIMBER} roughness={0.84} />
      </mesh>
      {[8, 15].map((lx) => (
        <mesh
          key={`lodge-rail-${lx}`}
          position={continuousGridToWorld(lx, 1, 13).map((v, i) =>
            i === 0 ? v + (lx === 8 ? -0.68 : 0.68) : i === 1 ? v + 0.36 : v,
          ) as [number, number, number]}
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[0.12, 0.72, 4.6]} />
          <meshStandardMaterial color={TIMBER} roughness={0.84} />
        </mesh>
      ))}

      {/* Live Cart Clock & staged next cart */}
      {!m3?.cookedOff && cartCoord && <PowderCart coord={cartCoord} />}
      {showStagedCart && <PowderCart coord={{ x: 15, y: 0, z: 8 }} dx={0.35} />}

      {/* 1648 Field Falconet at (17,0,10) */}
      <FieldFalconet coord={{ x: 17, y: 0, z: 10 }} />

      {/* Gabion baskets */}
      {[
        { x: 16, y: 0 as const, z: 12 },
        { x: 17, y: 0 as const, z: 11 },
      ].map((coord) => (
        <mesh key={`gabion-${coord.x}-${coord.z}`} position={place(coord, 0, 0.42, 0)} raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.46, 0.5, 0.7, 8]} />
          <meshStandardMaterial color={SAND} roughness={0.92} />
        </mesh>
      ))}

      {/* Store door timber jambs */}
      <mesh position={place({ x: 12, y: 0, z: 10 }, 0.55, 0.85, -0.42)} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 1.5, 0.28]} />
        <meshStandardMaterial color={TIMBER} roughness={0.78} />
      </mesh>
      <mesh position={place({ x: 12, y: 0, z: 10 }, 0.55, 0.85, 0.42)} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 1.5, 0.28]} />
        <meshStandardMaterial color={TIMBER} roughness={0.78} />
      </mesh>

      {/* Rope coil at (8,0,12) */}
      <mesh position={place({ x: 8, y: 0, z: 12 }, -0.48, 0.14, 0.2)} rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <torusGeometry args={[0.16, 0.045, 6, 10]} />
        <meshStandardMaterial color={TIMBER} roughness={0.9} />
      </mesh>

      {/* Stair treads at (10,0,12) */}
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

      {/* Distant Old Town tower coal (emissive only, no pointLight) */}
      <mesh position={[coal[0], coal[1], coal[2]]} raycast={NO_RAYCAST}>
        <sphereGeometry args={[0.55, 10, 8]} />
        <meshStandardMaterial color="#1c140f" emissive="#f97316" emissiveIntensity={1.6} roughness={1} />
      </mesh>
    </group>
  );
}
