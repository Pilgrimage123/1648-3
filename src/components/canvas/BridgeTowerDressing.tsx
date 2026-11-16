/**
 * Old Town Bridge Tower & Charles Bridge 1648 architectural dressing (`/src/components/canvas/BridgeTowerDressing.tsx`).
 *
 * Historical accuracy & ADR-0007 / ADR-0016 / ADR-0017 constraints:
 * - Petr Parler's 1370s sandstone Gothic tower with steep ridged wedge roof (dlatkova strecha) & 4 corner bartizans
 *   (no 1874 Mocker neo-Gothic roof, no 1621 executed-lords heads).
 * - Charles Bridge deck kept bare stone (no ~1700 Baroque saint statues), supported by Gothic sandstone arches,
 *   cutwater piers, and upstream oak timber icebreakers (ledolamy).
 * - East facade Parler sculptural program (Charles IV, St. Vitus on the bridge model, Wenceslas IV + kingfisher,
 *   St. Adalbert, St. Sigismund) mounted outside x=18 so walkable interior floors stay unobstructed.
 * - P2 roof cutaway: never renders an opaque roof slab over y=2; keeps roof geometry ghosted above wy=7.2.
 * - Zero fake barricades on walkable tiles; Marian stela sits at the east perimeter of (16, 2, 14).
 */

import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  continuousGridToWorld,
  TILE_SIZE,
} from "./worldCoords";
import { getTileVisibility } from "../../core/FogOfWar";
import { useGameStore } from "../../store/useGameStore";

function at(x: number, floorY: number, z: number): [number, number, number] {
  return continuousGridToWorld(x, floorY, z);
}

const NO_RAYCAST = () => null;

const PALETTE = {
  sandstone: "#786c5b",
  sandstoneDark: "#5e5345",
  sandstoneTrim: "#8f826f",
  sandstoneLight: "#9c8f7a",
  slateRoof: "#3b4743",
  timberOak: "#4a3322",
  timberDark: "#332216",
  wroughtIron: "#24272c",
  ironBright: "#525861",
  heraldicGold: "#d4a73f",
  heraldicCrimson: "#8c2323",
  heraldicCobalt: "#25416e",
  stuccoWarm: "#857a6c",
  emberGlow: "#f97316",
};

/** Carved 1370s Gothic heraldic shield triplet set above gateway arches. */
function GatewayHeraldry({ rotationY }: { rotationY: number }) {
  return (
    <group rotation={[0, rotationY, 0]}>
      {/* Bohemian Lion escutcheon */}
      <mesh position={[0, 0, -1.1]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.12, 0.34, 0.28]} />
        <meshStandardMaterial color={PALETTE.heraldicCrimson} roughness={0.75} />
      </mesh>
      <mesh position={[0.04, 0.02, -1.1]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 0.18, 0.14]} />
        <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.65} />
      </mesh>

      {/* Center Imperial Eagle escutcheon */}
      <mesh position={[0, 0.06, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.14, 0.4, 0.34]} />
        <meshStandardMaterial color={PALETTE.heraldicGold} roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[0.05, 0.06, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 0.24, 0.18]} />
        <meshStandardMaterial color={PALETTE.wroughtIron} roughness={0.6} />
      </mesh>

      {/* Old Town Prague escutcheon */}
      <mesh position={[0, 0, 1.1]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.12, 0.34, 0.28]} />
        <meshStandardMaterial color={PALETTE.heraldicCobalt} roughness={0.75} />
      </mesh>
      <mesh position={[0.04, -0.02, 1.1]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.08, 0.16, 0.18]} />
        <meshStandardMaterial color={PALETTE.heraldicGold} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Pointed Gothic stone gateway archway fitted strictly inside P0 (0 .. 2.34m) spanning z=12..16 (8m). */
function GothicGatewayPortal({
  gridX,
  facingEast,
}: {
  gridX: number;
  facingEast: boolean;
}) {
  const spanZ = 8.4;
  return (
    <group position={at(gridX, 0, 14)}>
      {/* North & South Ashlar Jamb Piers mounted against z=11 & z=17 wall flanks (leaving z=12..16 clear) */}
      {[-4.35, 4.35].map((pz) => (
        <group key={`jamb-${pz}`} position={[0, 0, pz]}>
          <mesh position={[0, 1.05, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[0.56, 2.1, 0.72]} />
            <meshStandardMaterial color={PALETTE.sandstone} roughness={0.85} />
          </mesh>
          {/* Plinth base */}
          <mesh position={[0, 0.14, 0]} receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[0.68, 0.28, 0.84]} />
            <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.9} />
          </mesh>
          {/* Gothic capital & impost cornice */}
          <mesh position={[0, 1.88, 0]} castShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[0.66, 0.16, 0.82]} />
            <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Pointed Gothic Arch Spandrels & Lintel Crown (bounded strictly <= 2.34m) */}
      <mesh position={[0, 2.14, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.52, 0.36, spanZ]} />
        <meshStandardMaterial color={PALETTE.sandstone} roughness={0.82} />
      </mesh>
      {/* Left & Right Haunch Ribs curving down to imposts */}
      <mesh
        position={[0, 1.9, -3.45]}
        rotation={[0.42, 0, 0]}
        castShadow
        raycast={NO_RAYCAST}
      >
        <boxGeometry args={[0.56, 0.24, 1.55]} />
        <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
      </mesh>
      <mesh
        position={[0, 1.9, 3.45]}
        rotation={[-0.42, 0, 0]}
        castShadow
        raycast={NO_RAYCAST}
      >
        <boxGeometry args={[0.56, 0.24, 1.55]} />
        <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
      </mesh>

      {/* Carved Sandstone Keystone Boss at apex */}
      <mesh position={[0, 2.12, 0]} castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.64, 0.3, 0.36]} />
        <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.75} />
      </mesh>

      {/* Outer Heraldry Frieze */}
      <group position={[facingEast ? 0.28 : -0.28, 2.12, 0]}>
        <GatewayHeraldry rotationY={facingEast ? 0 : Math.PI} />
      </group>
    </group>
  );
}

/** Single Parler sandstone canopy niche + royal/saint figure mounted on outer East facade (x = 18.48). */
function ParlerNicheStatue({
  zGrid,
  floorY,
  variant,
}: {
  zGrid: number;
  floorY: number;
  variant: "charles" | "vitus" | "wenceslas" | "adalbert" | "sigismund";
}) {
  const isVitus = variant === "vitus";
  const isSeated = variant === "charles" || variant === "wenceslas";
  const isBishop = variant === "vitus" || variant === "adalbert";

  return (
    <group position={at(18.5, floorY, zGrid)}>
      {/* Corbel console under niche */}
      <mesh position={[0, 0.24, 0]} castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.44, 0.26, 0.92]} />
        <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.88} />
      </mesh>

      {/* Mini Charles Bridge arch pedestal beneath St. Vitus */}
      {isVitus && (
        <mesh position={[0.04, 0.44, 0]} castShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[0.4, 0.16, 0.88]} />
          <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.8} />
        </mesh>
      )}

      {/* Gothic niche frame pilasters */}
      {[-0.4, 0.4].map((nz) => (
        <mesh key={nz} position={[-0.04, 1.15, nz]} castShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[0.26, 1.65, 0.14]} />
          <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
        </mesh>
      ))}

      {/* Sculpted Figure Silhouette */}
      <group position={[0.06, isVitus ? 0.54 : 0.4, 0]}>
        {/* Torso / Draped Mantle */}
        <mesh position={[0, isSeated ? 0.42 : 0.5, 0]} castShadow raycast={NO_RAYCAST}>
          <cylinderGeometry
            args={[0.16, 0.23, isSeated ? 0.84 : 1.0, 8]}
          />
          <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.78} />
        </mesh>
        {/* Head */}
        <mesh position={[0, isSeated ? 0.96 : 1.12, 0]} castShadow raycast={NO_RAYCAST}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.75} />
        </mesh>
        {/* Crown or Bishop Mitre */}
        <mesh
          position={[0, isSeated ? 1.1 : 1.28, 0]}
          castShadow
          raycast={NO_RAYCAST}
        >
          {isBishop ? (
            <coneGeometry args={[0.12, 0.26, 6]} />
          ) : (
            <cylinderGeometry args={[0.12, 0.11, 0.12, 8]} />
          )}
          <meshStandardMaterial color={PALETTE.heraldicGold} roughness={0.55} metalness={0.35} />
        </mesh>
        {/* Sceptre / Crozier / Halberd vertical attribute */}
        <mesh position={[0.08, 0.72, 0.18]} castShadow raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.02, 0.02, 1.15, 6]} />
          <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.75} />
        </mesh>
      </group>

      {/* Wenceslas Kingfisher-in-Torus (Lednacek v tocenici) carved roundel */}
      {variant === "wenceslas" && (
        <group position={[0.08, 0.85, 0.56]} rotation={[0, Math.PI / 2, 0]}>
          <mesh raycast={NO_RAYCAST}>
            <torusGeometry args={[0.16, 0.04, 8, 16]} />
            <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.72} />
          </mesh>
          <mesh raycast={NO_RAYCAST}>
            <boxGeometry args={[0.12, 0.1, 0.08]} />
            <meshStandardMaterial color={PALETTE.heraldicCobalt} roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* Pointed Gothic Baldachin Canopy above statue (<= 2.25m floor offset) */}
      <mesh position={[0.02, 2.02, 0]} castShadow raycast={NO_RAYCAST}>
        <coneGeometry args={[0.48, 0.44, 4]} />
        <meshStandardMaterial color={PALETTE.sandstone} roughness={0.82} />
      </mesh>
    </group>
  );
}

/** Animated wrought-iron & oak Portcullis (Mriz) anchored cleanly inside P0 gateway vault. */
function PortcullisMesh({ seated }: { seated: boolean }) {
  const grateRef = useRef<THREE.Group>(null);
  const posYRef = useRef(seated ? 1.12 : 2.18);
  const scaleYRef = useRef(seated ? 1.0 : 0.14);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const targetY = seated ? 1.12 : 2.18;
    const targetScaleY = seated ? 1.0 : 0.14;
    posYRef.current = THREE.MathUtils.lerp(posYRef.current, targetY, dt * 6.5);
    scaleYRef.current = THREE.MathUtils.lerp(scaleYRef.current, targetScaleY, dt * 6.5);
    if (grateRef.current) {
      grateRef.current.position.y = posYRef.current;
      grateRef.current.scale.y = scaleYRef.current;
    }
  });

  const barOffsets = [-3.6, -2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7, 3.6];
  const crossbarHeights = [-0.72, -0.22, 0.28, 0.78];

  return (
    <group position={at(9.72, 0, 14)}>
      {/* Stone deck lock-groove sill under portcullis spanning z=12..16 */}
      <mesh position={[0, 0.015, 0]} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.32, 0.03, 7.9]} />
        <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.95} />
      </mesh>

      {/* Vault portcullis slot lintel (just under P1 floor at y=2.34) */}
      <mesh position={[0, 2.31, 0]} raycast={NO_RAYCAST}>
        <boxGeometry args={[0.38, 0.12, 8.1]} />
        <meshStandardMaterial color={PALETTE.wroughtIron} roughness={0.85} />
      </mesh>

      <group
        ref={grateRef}
        position={[0, seated ? 1.12 : 2.18, 0]}
        scale={[1, seated ? 1.0 : 0.14, 1]}
      >
        {barOffsets.map((zOff) => (
          <group key={`bar-${zOff}`} position={[0, 0, zOff]}>
            {/* Iron-shod oak vertical stave */}
            <mesh castShadow receiveShadow raycast={NO_RAYCAST}>
              <boxGeometry args={[0.1, 2.04, 0.1]} />
              <meshStandardMaterial
                color={PALETTE.timberDark}
                roughness={0.7}
                metalness={0.25}
              />
            </mesh>
            {/* Wrought iron face strap */}
            <mesh position={[-0.04, 0, 0]} raycast={NO_RAYCAST}>
              <boxGeometry args={[0.04, 2.04, 0.06]} />
              <meshStandardMaterial
                color={PALETTE.wroughtIron}
                roughness={0.45}
                metalness={0.85}
              />
            </mesh>
            {/* Forged iron bottom spike */}
            <mesh
              position={[0, -1.12, 0]}
              rotation={[Math.PI, 0, 0]}
              castShadow
              raycast={NO_RAYCAST}
            >
              <coneGeometry args={[0.065, 0.24, 4]} />
              <meshStandardMaterial
                color={PALETTE.ironBright}
                roughness={0.35}
                metalness={0.9}
              />
            </mesh>
          </group>
        ))}

        {/* Horizontal wrought-iron crossbars spanning z=12..16 */}
        {crossbarHeights.map((yOff) => (
          <mesh key={`cross-${yOff}`} position={[0, yOff, 0]} castShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[0.14, 0.085, 7.8]} />
            <meshStandardMaterial
              color={PALETTE.wroughtIron}
              roughness={0.42}
              metalness={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** P1 Windlass & Hoisting Cable at (11, 1, 14) and (12, 1, 14), anchored at wy = FLOOR_HEIGHT. */
function WindlassAssembly({
  pawlUnpinned,
  ropeSevered,
  burning,
}: {
  pawlUnpinned: boolean;
  ropeSevered: boolean;
  burning: boolean;
}) {
  return (
    <group position={at(11, 1, 13.56)} scale={[0.78, 0.88, 0.72]}>
      {/* Heavy oak bed-sill bolted to P1 masonry floor */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[1.18, 0.12, 1.32]} />
        <meshStandardMaterial
          color={burning ? "#4a2414" : PALETTE.timberDark}
          roughness={0.88}
        />
      </mesh>

      {/* Twin A-frame oak trestle standards */}
      {[-0.48, 0.48].map((sz) => (
        <mesh
          key={`stand-${sz}`}
          position={[0, 0.56, sz]}
          castShadow
          receiveShadow
          raycast={NO_RAYCAST}
        >
          <boxGeometry args={[0.24, 0.96, 0.16]} />
          <meshStandardMaterial color={PALETTE.timberOak} roughness={0.85} />
        </mesh>
      ))}

      {/* Winding drum shaft & braided cable wraps */}
      <mesh
        position={[0, 0.72, 0]}
        rotation={[Math.PI * 0.5, 0, 0]}
        castShadow
        raycast={NO_RAYCAST}
      >
        <cylinderGeometry args={[0.24, 0.24, 0.88, 12]} />
        <meshStandardMaterial
          color={burning ? "#7c2d12" : "#6b5539"}
          emissive={burning ? PALETTE.emberGlow : "#000000"}
          emissiveIntensity={burning ? 0.55 : 0}
          roughness={0.85}
        />
      </mesh>

      {/* Iron ratchet gear & objective pawl pin */}
      <mesh
        position={[0, 0.72, 0.42]}
        rotation={[Math.PI * 0.5, 0, 0]}
        castShadow
        raycast={NO_RAYCAST}
      >
        <cylinderGeometry args={[0.31, 0.31, 0.07, 12]} />
        <meshStandardMaterial color={PALETTE.wroughtIron} metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh
        position={[0.22, pawlUnpinned ? 0.88 : 0.64, 0.44]}
        rotation={[0, 0, pawlUnpinned ? 0.9 : -0.35]}
        castShadow
        raycast={NO_RAYCAST}
      >
        <boxGeometry args={[0.28, 0.06, 0.08]} />
        <meshStandardMaterial
          color={pawlUnpinned ? PALETTE.ironBright : PALETTE.heraldicGold}
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      {/* Radial handspoke bars */}
      <mesh position={[0, 0.72, -0.52]} rotation={[0, 0, 0.4]} castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.92, 0.07, 0.07]} />
        <meshStandardMaterial color={PALETTE.timberOak} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.72, -0.52]} rotation={[0, 0, -1.17]} castShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.92, 0.07, 0.07]} />
        <meshStandardMaterial color={PALETTE.timberOak} roughness={0.82} />
      </mesh>

      {/* Floor hawsehole west toward Portcullis shaft */}
      <mesh position={[-0.68, 0.03, 0]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 10]} />
        <meshStandardMaterial color={PALETTE.wroughtIron} metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[-0.44, 0.42, 0]} rotation={[0, 0, -0.62]} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[0.032, 0.032, 0.85, 8]} />
        <meshStandardMaterial color={ropeSevered ? "#3f2e1e" : "#b89c72"} roughness={0.95} />
      </mesh>

      {/* Hoisting Rope extending East onto tile (12, 1, 14) + Iron Mooring Cleat */}
      <group position={[TILE_SIZE, 0, 0]}>
        {/* Anchoring iron mooring bollard/cleat on (12, 1, 14) */}
        <mesh position={[0.38, 0.16, 0]} castShadow raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.09, 0.12, 0.32, 8]} />
          <meshStandardMaterial color={PALETTE.wroughtIron} metalness={0.82} roughness={0.4} />
        </mesh>
        {!ropeSevered ? (
          <mesh
            position={[-0.58, 0.46, 0]}
            rotation={[0, 0, 1.32]}
            castShadow
            raycast={NO_RAYCAST}
          >
            <cylinderGeometry args={[0.036, 0.036, 1.98, 8]} />
            <meshStandardMaterial
              color={pawlUnpinned ? PALETTE.heraldicGold : "#c2a878"}
              roughness={0.85}
            />
          </mesh>
        ) : (
          <>
            {/* Two slack severed cable halves resting on floorboards */}
            <mesh
              position={[-0.96, 0.06, 0.12]}
              rotation={[0, 0.35, Math.PI * 0.5]}
              raycast={NO_RAYCAST}
            >
              <cylinderGeometry args={[0.032, 0.032, 0.9, 8]} />
              <meshStandardMaterial color="#8f7854" roughness={0.95} />
            </mesh>
            <mesh
              position={[0.14, 0.06, -0.08]}
              rotation={[0, -0.4, Math.PI * 0.5]}
              raycast={NO_RAYCAST}
            >
              <cylinderGeometry args={[0.032, 0.032, 0.65, 8]} />
              <meshStandardMaterial color="#8f7854" roughness={0.95} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

/** Marian Palindrome Votive Stela & Lamps at east perimeter of (16, 2, 14), leaving center clear. */
function MarianInscriptionStela({
  knelt,
  noted,
}: {
  knelt: boolean;
  noted: boolean;
}) {
  const glow = knelt || noted ? 0.55 : 0.25;
  return (
    <group position={at(16, 2, 14)}>
      {/* Perimeter offset (+0.52m East) keeps walkable center [-0.35..+0.35] open */}
      <group position={[0.52, 0, 0]}>
        {/* Carved sandstone stepped plinth */}
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[0.4, 0.24, 0.98]} />
          <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.56, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[0.3, 0.68, 0.82]} />
          <meshStandardMaterial color={PALETTE.sandstone} roughness={0.82} />
        </mesh>
        {/* Gothic gable coping */}
        <mesh position={[0, 0.98, 0]} castShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[0.34, 0.16, 0.9]} />
          <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.78} />
        </mesh>

        {/* West-facing Bronze & Gold Palindrome Inscription Tablet */}
        <mesh position={[-0.16, 0.6, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[0.04, 0.44, 0.64]} />
          <meshStandardMaterial color={PALETTE.wroughtIron} roughness={0.5} metalness={0.6} />
        </mesh>
        {[-0.12, 0, 0.12].map((ly) => (
          <mesh key={`line-${ly}`} position={[-0.185, 0.6 + ly, 0]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.02, 0.045, 0.48]} />
            <meshStandardMaterial
              color={PALETTE.heraldicGold}
              emissive={PALETTE.heraldicGold}
              emissiveIntensity={glow}
              roughness={0.4}
              metalness={0.5}
            />
          </mesh>
        ))}

        {/* Twin brass votive candlesticks on plinth shoulders */}
        {[-0.36, 0.36].map((cz) => (
          <group key={`candle-${cz}`} position={[-0.08, 0.9, cz]}>
            <mesh raycast={NO_RAYCAST}>
              <cylinderGeometry args={[0.035, 0.055, 0.14, 8]} />
              <meshStandardMaterial color={PALETTE.heraldicGold} metalness={0.65} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.11, 0]} raycast={NO_RAYCAST}>
              <coneGeometry args={[0.028, 0.09, 6]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive={PALETTE.emberGlow}
                emissiveIntensity={knelt ? 1.4 : 0.85}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Charles Bridge sub-deck Gothic sandstone arches, triangular cutwater piers & upstream oak ledolamy. */
function CharlesBridgeStructure() {
  const piers = [2.5, 5.5, 8.5];
  const archSpans = [
    { xMid: 1.4, w: 2.2 },
    { xMid: 4.0, w: 3.1 },
    { xMid: 7.0, w: 3.1 },
    { xMid: 9.2, w: 1.6 },
  ];

  return (
    <group>
      {/* Continuous outer sandstone parapet fascia along North (z=10.42) & South (z=16.58) deck edges */}
      {[10.42, 16.58].map((pz) => (
        <group key={`parapet-${pz}`} position={at(5, 0, pz)}>
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[9 * TILE_SIZE + 0.4, 0.28, 0.24]} />
            <meshStandardMaterial color={PALETTE.sandstone} roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[9 * TILE_SIZE + 0.5, 0.06, 0.28]} />
            <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.78} />
          </mesh>
          {/* Under-deck ashlar stringcourse fascia */}
          <mesh position={[0, -0.18, 0]} receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[9 * TILE_SIZE + 0.4, 0.28, 0.34]} />
            <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Sub-deck Gothic ashlar bridge vault spandrels (clamped strictly <= -0.22m below deck) */}
      {archSpans.map(({ xMid, w }) => (
        <group key={`span-${xMid}`} position={at(xMid, 0, 13.5)}>
          <mesh position={[0, -0.44, 0]} receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[w * TILE_SIZE, 0.44, 6.2 * TILE_SIZE]} />
            <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.92} />
          </mesh>
          {/* Compressed Gothic arch soffit strictly underneath deck (maxY = -0.32) */}
          <mesh
            position={[0, -1.05, 0]}
            rotation={[Math.PI * 0.5, 0, 0]}
            scale={[1, 1, 0.32]}
            receiveShadow
            raycast={NO_RAYCAST}
          >
            <cylinderGeometry
              args={[w * TILE_SIZE * 0.42, w * TILE_SIZE * 0.42, 6.0 * TILE_SIZE, 14, 1, false, 0, Math.PI]}
            />
            <meshStandardMaterial color="#453d34" roughness={0.94} />
          </mesh>
        </group>
      ))}

      {/* Massive Ashlar Bridge Piers with Upstream (South) & Downstream (North) Cutwaters + Oak Ledolamy */}
      {piers.map((px) => (
        <group key={`pier-${px}`} position={at(px, 0, 13.5)}>
          {/* Main submerged stone pier (kept strictly <= -0.12m) */}
          <mesh position={[0, -1.25, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[1.38, 2.25, 6.5 * TILE_SIZE]} />
            <meshStandardMaterial color={PALETTE.sandstone} roughness={0.88} />
          </mesh>

          {/* Triangular cutwater prow upstream (South, +z) */}
          <mesh
            position={[0, -0.95, 3.65 * TILE_SIZE]}
            rotation={[0, Math.PI * 0.25, 0]}
            castShadow
            receiveShadow
            raycast={NO_RAYCAST}
          >
            <boxGeometry args={[1.08, 1.85, 1.08]} />
            <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.84} />
          </mesh>

          {/* Downstream cutwater nose (North, -z) */}
          <mesh
            position={[0, -1.02, -3.55 * TILE_SIZE]}
            rotation={[0, Math.PI * 0.25, 0]}
            castShadow
            receiveShadow
            raycast={NO_RAYCAST}
          >
            <boxGeometry args={[0.96, 1.72, 0.96]} />
            <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.88} />
          </mesh>

          {/* Historic Prague Oak Timber Icebreaker (Ledolam) rising out of water upstream (South) */}
          <group position={[0, 0.04, 4.55 * TILE_SIZE]}>
            {/* Sloped main oak breaker beam pointing into current */}
            <mesh
              position={[0, 0.08, 0.35]}
              rotation={[-0.45, 0, 0]}
              castShadow
              raycast={NO_RAYCAST}
            >
              <boxGeometry args={[0.34, 0.28, 2.4]} />
              <meshStandardMaterial color={PALETTE.timberOak} roughness={0.86} />
            </mesh>
            {/* Iron ice-splitting nose cap */}
            <mesh
              position={[0, -0.32, 1.25]}
              rotation={[-0.45, 0, 0]}
              raycast={NO_RAYCAST}
            >
              <boxGeometry args={[0.38, 0.32, 0.4]} />
              <meshStandardMaterial color={PALETTE.wroughtIron} metalness={0.75} roughness={0.45} />
            </mesh>
            {/* Paired vertical timber piles anchoring into riverbed */}
            {[-0.36, 0.36].map((tx) => (
              <mesh key={`pile-${tx}`} position={[tx, -0.24, -0.25]} castShadow raycast={NO_RAYCAST}>
                <cylinderGeometry args={[0.12, 0.14, 1.25, 8]} />
                <meshStandardMaterial color={PALETTE.timberOak} roughness={0.9} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Off-grid Old Town embankment walls, Klementinum/St. Salvator portico base & distant banks (zero camera occlusion). */
function OldTownSurroundings() {
  return (
    <group>
      {/* Old Town Vltava Ashlar Quay Retaining Wall flush at pavement top (+0.04m, descending to -1.2m) */}
      <mesh position={at(14.6, 0, 5.1)} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.56, 0.06, 9.2 * TILE_SIZE]} />
        <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.88} />
      </mesh>
      <mesh position={[continuousGridToWorld(14.6, 0, 5.1)[0], -0.62, continuousGridToWorld(14.6, 0, 5.1)[2]]} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.5, 1.24, 9.2 * TILE_SIZE]} />
        <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.92} />
      </mesh>
      <mesh position={at(14.6, 0, 22.6)} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.56, 0.06, 8.6 * TILE_SIZE]} />
        <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.88} />
      </mesh>
      <mesh position={[continuousGridToWorld(14.6, 0, 22.6)[0], -0.62, continuousGridToWorld(14.6, 0, 22.6)[2]]} receiveShadow raycast={NO_RAYCAST}>
        <boxGeometry args={[0.5, 1.24, 8.6 * TILE_SIZE]} />
        <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.92} />
      </mesh>

      {/* Klementinum / Church of St. Salvator Early-Baroque Portico Base (East edge x=23.6, kept low so 360 camera orbits never clip) */}
      <group position={at(23.6, 0, 14)}>
        {/* Three entrance stone steps */}
        <mesh position={[-0.65, 0.12, 0]} receiveShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[0.55, 0.24, 8.6]} />
          <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.86} />
        </mesh>
        {/* Cutaway Corinthian Portico Plinth & Pilasters */}
        <mesh position={[0.15, 0.8, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[1.1, 1.6, 9.4]} />
          <meshStandardMaterial color={PALETTE.stuccoWarm} roughness={0.84} />
        </mesh>
        {[-3.4, -1.6, 1.6, 3.4].map((pz) => (
          <mesh key={`salv-pil-${pz}`} position={[-0.4, 0.84, pz]} castShadow raycast={NO_RAYCAST}>
            <boxGeometry args={[0.26, 1.68, 0.36]} />
            <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.78} />
          </mesh>
        ))}
        {/* Recessed arched portal bays between Corinthian pilasters */}
        {[-2.5, 0, 2.5].map((bz) => (
          <mesh key={`salv-bay-${bz}`} position={[-0.42, 0.72, bz]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.08, 1.18, 0.92]} />
            <meshStandardMaterial color="#3a322a" roughness={0.92} />
          </mesh>
        ))}
        {/* Twin Baroque Sandstone Obelisk Pedestals with Gilded Flame Finials */}
        {[-4.2, 4.2].map((oz) => (
          <group key={`salv-ob-${oz}`} position={[-0.42, 0, oz]}>
            <mesh position={[0, 0.45, 0]} castShadow raycast={NO_RAYCAST}>
              <boxGeometry args={[0.42, 0.9, 0.42]} />
              <meshStandardMaterial color={PALETTE.sandstone} roughness={0.82} />
            </mesh>
            <mesh position={[0, 1.24, 0]} castShadow raycast={NO_RAYCAST}>
              <coneGeometry args={[0.14, 0.72, 4]} />
              <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.75} />
            </mesh>
            <mesh position={[0, 1.66, 0]} raycast={NO_RAYCAST}>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial color={PALETTE.heraldicGold} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        ))}
        {/* Carved Jesuit IHS Portal Plaque */}
        <mesh position={[-0.42, 1.15, 0]} raycast={NO_RAYCAST}>
          <cylinderGeometry args={[0.28, 0.28, 0.08, 12]} />
          <meshStandardMaterial color={PALETTE.heraldicGold} roughness={0.48} metalness={0.45} />
        </mesh>
      </group>

      {/* North: Knights of the Cross (Krizovnici s cervenou hvezdou) Monastery Cutaway Wing (z=6.8, x=19.8) */}
      <group position={at(19.8, 0, 6.8)}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[7.4, 1.44, 3.2]} />
          <meshStandardMaterial color="#736658" roughness={0.88} />
        </mesh>
        <mesh position={[0, 1.46, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[7.7, 0.16, 3.4]} />
          <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
        </mesh>
        {/* Cloister arched window reveals facing Krizovnicke namesti */}
        {[-2.4, -1.2, 1.2, 2.4].map((wx) => (
          <group key={`kriz-win-${wx}`} position={[wx, 0.78, 1.62]}>
            <mesh raycast={NO_RAYCAST}>
              <boxGeometry args={[0.62, 0.88, 0.08]} />
              <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.03]} raycast={NO_RAYCAST}>
              <planeGeometry args={[0.42, 0.68]} />
              <meshStandardMaterial color="#2a241e" roughness={0.92} />
            </mesh>
          </group>
        ))}
        {/* Knights of the Cross Red Star & Cross Heraldic Cartouche */}
        <group position={[0, 1.05, 1.64]}>
          <mesh raycast={NO_RAYCAST}>
            <boxGeometry args={[0.72, 0.68, 0.08]} />
            <meshStandardMaterial color={PALETTE.heraldicGold} roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.06, 0.04]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.16, 0.38, 0.04]} />
            <meshStandardMaterial color={PALETTE.heraldicCrimson} roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.1, 0.04]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.32, 0.12, 0.04]} />
            <meshStandardMaterial color={PALETTE.heraldicCrimson} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.18, 0.04]} rotation={[0, 0, Math.PI * 0.25]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.15, 0.15, 0.04]} />
            <meshStandardMaterial color={PALETTE.heraldicCrimson} roughness={0.65} />
          </mesh>
        </group>
      </group>

      {/* South: Old Town Corner Burgher House Cutaway Plinth (z=20.2, x=20.4) */}
      <group position={at(20.4, 0, 20.2)}>
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
          <boxGeometry args={[6.4, 1.36, 3.0]} />
          <meshStandardMaterial color="#5e5449" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.38, 0]} raycast={NO_RAYCAST}>
          <boxGeometry args={[6.6, 0.14, 3.2]} />
          <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.86} />
        </mesh>
      </group>
    </group>
  );
}

/** Petr Parler alternating sandstone corner quoins for a tower storey (keeps foreground SE/SW stubbed). */
function TowerCornerQuoins({ floorY }: { floorY: 0 | 1 | 2 }) {
  const corners: { x: number; z: number; full: boolean }[] = [
    { x: 9.46, z: 9.96, full: true },
    { x: 18.54, z: 9.96, full: true },
    { x: 9.46, z: 18.04, full: false },
    { x: 18.54, z: 18.04, full: false },
  ];
  const tiers = [0.22, 0.72, 1.22, 1.72, 2.16];
  return (
    <group>
      {corners.map(({ x, z, full }, ci) => (
        <group key={`quoin-${floorY}-${ci}`} position={at(x, floorY, z)}>
          {(full ? tiers : [0.2]).map((qy, qi) => (
            <mesh key={qi} position={[0, qy, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
              <boxGeometry
                args={qi % 2 === 0 ? [0.46, 0.24, 0.34] : [0.34, 0.24, 0.46]}
              />
              <meshStandardMaterial
                color={qi % 2 === 0 ? PALETTE.sandstoneLight : PALETTE.sandstoneTrim}
                roughness={0.8}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Gothic sandstone vaulting shafts & net-vault springer ribs along the P0 inner North gateway wall (z=11.52). */
function GatewayVaultRibs() {
  return (
    <group>
      {[11, 13, 15, 17].map((gx) => (
        <group key={`vrib-${gx}`} position={at(gx, 0, 11.52)}>
          {/* Engaged half-column vault shaft */}
          <mesh position={[0, 0.88, 0]} castShadow receiveShadow raycast={NO_RAYCAST}>
            <cylinderGeometry args={[0.11, 0.13, 1.76, 8]} />
            <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
          </mesh>
          {/* Bell capital at springline */}
          <mesh position={[0, 1.8, 0]} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.3, 0.14, 0.3]} />
            <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.78} />
          </mesh>
          {/* Transverse & diagonal net-vault springer ribs curving high (y=2.04..2.28m) */}
          <mesh
            position={[0, 2.06, 0.32]}
            rotation={[-0.65, 0, 0]}
            castShadow
            raycast={NO_RAYCAST}
          >
            <boxGeometry args={[0.12, 0.12, 0.82]} />
            <meshStandardMaterial color={PALETTE.sandstoneLight} roughness={0.78} />
          </mesh>
          <mesh
            position={[-0.22, 2.04, 0.26]}
            rotation={[-0.55, -0.5, 0]}
            raycast={NO_RAYCAST}
          >
            <boxGeometry args={[0.09, 0.1, 0.72]} />
            <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
          </mesh>
          <mesh
            position={[0.22, 2.04, 0.26]}
            rotation={[-0.55, 0.5, 0]}
            raycast={NO_RAYCAST}
          >
            <boxGeometry args={[0.09, 0.1, 0.72]} />
            <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
          </mesh>
          {/* Gilded Luxembourg vault boss */}
          <mesh position={[0, 2.24, 0.58]} raycast={NO_RAYCAST}>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
            <meshStandardMaterial color={PALETTE.heraldicGold} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Ghosted 1370s Petr Parler Wedge Roof (Dlatkova strecha) & 4 Corner Bartizans strictly ABOVE P2 (wy=7.2). */
function GhostedTowerRoof() {
  const bartizanOffsets: [number, number][] = [
    [-6.6, -6.6],
    [6.6, -6.6],
    [-6.6, 6.6],
    [6.6, 6.6],
  ];

  return (
    <group position={at(14, 3, 14)}>
      {/* Authentic North-South Steep Wedge Roof Ridge above wy=7.2 (opacity 0.04, depthWrite=false) */}
      <mesh position={[0, 1.85, 0]} rotation={[0, Math.PI * 0.25, 0]} raycast={NO_RAYCAST}>
        <coneGeometry args={[9.4, 3.7, 4]} />
        <meshStandardMaterial
          color={PALETTE.slateRoof}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>
      {/* 4 Slender Octagonal Corner Bartizans (Vezicky) */}
      {bartizanOffsets.map(([bx, bz]) => (
        <group key={`bart-${bx}-${bz}`} position={[bx, 0, bz]}>
          <mesh position={[0, 0.65, 0]} raycast={NO_RAYCAST}>
            <cylinderGeometry args={[0.72, 0.62, 1.3, 8]} />
            <meshStandardMaterial
              color={PALETTE.sandstone}
              transparent
              opacity={0.05}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 2.15, 0]} raycast={NO_RAYCAST}>
            <coneGeometry args={[0.84, 1.8, 8]} />
            <meshStandardMaterial
              color={PALETTE.slateRoof}
              transparent
              opacity={0.05}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function BridgeTowerDressing() {
  const scenario = useGameStore((s) => s.scenario);
  const m2 = useGameStore((s) => s.m2);
  const activeFloor = useGameStore((s) => s.activeFloor);
  const fogSnapshot = useGameStore((s) => s.fogSnapshot);
  const fogOfWarEnabled = useGameStore((s) => s.fogOfWarEnabled);

  if (scenario !== "mission2") return null;

  const isExplored = (x: number, y: 0 | 1 | 2, z: number) =>
    getTileVisibility({ x, y, z }, fogSnapshot, fogOfWarEnabled) !== "unexplored";

  const seated = m2?.seated ?? false;
  const pawlUnpinned = m2?.pawlUnpinned ?? false;
  const ropeSevered = m2?.ropeSevered ?? false;
  const windlassBurning = m2?.windlassBurning ?? false;
  const knelt = m2?.knelt ?? false;
  const inscriptionNoted = m2?.inscriptionNoted ?? false;

  const galleryHeight = 9 * TILE_SIZE;

  return (
    <group>
      {/* 1. Always-visible Vltava / Charles Bridge / Surroundings & P0 Vault Architecture */}
      <CharlesBridgeStructure />
      <OldTownSurroundings />

      {/* West & East Gothic Pointed Gateway Portals (strictly bounded <= 2.34m inside P0) */}
      <GothicGatewayPortal gridX={9.52} facingEast={false} />
      <GothicGatewayPortal gridX={18.48} facingEast={true} />

      {/* Iron-Shod Oak Portcullis at West Gateway Threshold */}
      <PortcullisMesh seated={seated} />

      {/* P0 Petr Parler Corner Quoins & North Gateway Net-Vault Springer Ribs */}
      <TowerCornerQuoins floorY={0} />
      <GatewayVaultRibs />

      {/* Horizontal Petr Parler Sandstone Cornice Stringcourses dividing P0 / P1 / P2 */}
      {activeFloor >= 1 && (
        <group position={at(14, 1, 14)}>
          {/* Thin perimeter cornice band around x:10..18, z:10..18 at y=0 (wy=2.4) */}
          {[-7.28, 7.28].map((zEdge) => (
            <mesh key={`c1z-${zEdge}`} position={[0, -0.06, zEdge]} raycast={NO_RAYCAST}>
              <boxGeometry args={[galleryHeight + 0.36, 0.14, 0.22]} />
              <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
            </mesh>
          ))}
          {[-7.28, 7.28].map((xEdge) => (
            <mesh key={`c1x-${xEdge}`} position={[xEdge, -0.06, 0]} raycast={NO_RAYCAST}>
              <boxGeometry args={[0.22, 0.14, galleryHeight + 0.36]} />
              <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
            </mesh>
          ))}
        </group>
      )}

      {activeFloor >= 2 && (
        <group position={at(14, 2, 14)}>
          {[-7.28, 7.28].map((zEdge) => (
            <mesh key={`c2z-${zEdge}`} position={[0, -0.06, zEdge]} raycast={NO_RAYCAST}>
              <boxGeometry args={[galleryHeight + 0.36, 0.16, 0.24]} />
              <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
            </mesh>
          ))}
          {[-7.28, 7.28].map((xEdge) => (
            <mesh key={`c2x-${xEdge}`} position={[xEdge, -0.06, 0]} raycast={NO_RAYCAST}>
              <boxGeometry args={[0.24, 0.16, galleryHeight + 0.36]} />
              <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.82} />
            </mesh>
          ))}
        </group>
      )}

      {/* 2. P1 (Windlass Hall) Architecture & Mechanics — shown when activeFloor >= 1 */}
      {activeFloor >= 1 && (
        <group>
          {isExplored(11, 1, 14) && (
            <WindlassAssembly
              pawlUnpinned={pawlUnpinned}
              ropeSevered={ropeSevered}
              burning={windlassBurning}
            />
          )}

          {/* Western Parler Machicolation Embrasures on exterior West sill of (10, 1, 12..16) */}
          {[12, 13, 14, 15, 16].map((mz) => (
            <group key={`mach1-${mz}`} position={at(9.46, 1, mz)}>
              <mesh position={[0, 0.24, 0]} castShadow raycast={NO_RAYCAST}>
                <boxGeometry args={[0.22, 0.48, 1.38]} />
                <meshStandardMaterial color={PALETTE.sandstone} roughness={0.85} />
              </mesh>
              <mesh position={[0.02, -0.14, 0]} rotation={[0, 0, -0.35]} raycast={NO_RAYCAST}>
                <boxGeometry args={[0.3, 0.28, 0.46]} />
                <meshStandardMaterial color={PALETTE.sandstoneDark} roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* East Facade Lower Parler Sculptural Trio: Charles IV, St. Vitus on Bridge, Wenceslas IV */}
          <ParlerNicheStatue zGrid={13} floorY={1} variant="charles" />
          <ParlerNicheStatue zGrid={14} floorY={1} variant="vitus" />
          <ParlerNicheStatue zGrid={15} floorY={1} variant="wenceslas" />
          <TowerCornerQuoins floorY={1} />
        </group>
      )}

      {/* 3. P2 (Roof Gallery) Architecture, Inscription & Upper Statues — shown when activeFloor >= 2 */}
      {activeFloor >= 2 && (
        <group>
          {isExplored(16, 2, 14) && (
            <MarianInscriptionStela knelt={knelt} noted={inscriptionNoted} />
          )}

          {/* Western P2 Machicolation Battlement Merlons (exterior edge x=9.46) */}
          {[12, 13, 14, 15, 16].map((mz) => (
            <group key={`mach2-${mz}`} position={at(9.46, 2, mz)}>
              <mesh position={[0, 0.34, 0]} castShadow raycast={NO_RAYCAST}>
                <boxGeometry args={[0.24, 0.68, 1.12]} />
                <meshStandardMaterial color={PALETTE.sandstone} roughness={0.84} />
              </mesh>
              <mesh position={[0, 0.72, 0]} castShadow raycast={NO_RAYCAST}>
                <boxGeometry args={[0.28, 0.1, 1.2]} />
                <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.78} />
              </mesh>
            </group>
          ))}

          {/* East Facade Upper Parler Saints & Bohemian Heraldic Crest */}
          <ParlerNicheStatue zGrid={13} floorY={2} variant="adalbert" />
          <group position={at(18.54, 2, 14)}>
            <mesh position={[0, 1.05, 0]} castShadow raycast={NO_RAYCAST}>
              <boxGeometry args={[0.26, 0.82, 0.92]} />
              <meshStandardMaterial color={PALETTE.sandstoneTrim} roughness={0.8} />
            </mesh>
            <mesh position={[0.1, 1.05, 0]} raycast={NO_RAYCAST}>
              <boxGeometry args={[0.12, 0.5, 0.52]} />
              <meshStandardMaterial color={PALETTE.heraldicCrimson} roughness={0.72} />
            </mesh>
          </group>
          <ParlerNicheStatue zGrid={15} floorY={2} variant="sigismund" />
          <TowerCornerQuoins floorY={2} />

          {/* Ghosted 1370s Wedge Roof above wy=7.2 (never occludes P2 playable floor) */}
          <GhostedTowerRoof />
        </group>
      )}
    </group>
  );
}
