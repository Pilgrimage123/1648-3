/**
 * Procedural 1648 Prague Architectural Generator & Geometry Kit
 * (`/src/components/canvas/pragueArchitecture.ts`).
 *
 * Pure, deterministic city-fabric synthesis for Malá Strana, Kampa, and Staré Město
 * in July 1648 (predominantly Bohemian Renaissance & Early Baroque, with surviving Gothic):
 * - Canonical local house coordinate frame:
 *     +Z = street/board-facing front facade (`normal`)
 *     +X = along-street width
 *     +Y = up from ground (`y = 0`)
 * - Smart terraced scale: realistic Prague burgher parcel widths (4.2–9.0 m) and story heights
 *   (2.15–2.45 m, matching the playable FLOOR_HEIGHT = 2.4 m), with a mathematically enforced
 *   camera-sightline height envelope so foreground rows never occlude board edge tiles.
 * - Zero DOM dependencies in data synthesis so all layout & clearance invariants are unit-tested.
 */

import * as THREE from "three";

export type ArchitecturalStyle = "renaissance" | "baroque" | "gothic";
export type FacadeFinish = "sgraffito" | "fresco" | "gothic_plaster" | "baroque_stucco";
export type WindowPediment = "gothic" | "renaissance" | "baroque_tri" | "baroque_seg";
export type DistrictProfile = "mala_strana" | "stare_mesto" | "kampa";
export type RoofForm = "gable" | "mansard";
export type CrownKind =
  | "renaissance_gable"
  | "renaissance_attic"
  | "baroque_gable"
  | "gothic_gable";
export type MissionId = "mission1" | "mission2" | "mission3";

export interface BoardBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RowSpec {
  /** Row start & end along its length axis (world X if alongX, else world Z). */
  from: number;
  to: number;
  /** Fixed world coordinate of the row centerline across its depth. */
  at: number;
  alongX: boolean;
  /** Typical depth of parcels in this row (meters). */
  depth: number;
  /** Unit normal pointing from the row toward the street / playable board. */
  normal: [number, number];
  /** Upper cap on total roof peak height (eaves + roof/gable) for this row. */
  maxTotalH: number;
  /** Desired eaves height range [min, max] before sightline clamping. */
  eavesRange: [number, number];
  /** Architectural district weighting (Old Town has more Gothic; Malá Strana more Renaissance/Baroque). */
  district: DistrictProfile;
}

export interface PragueHouse {
  x: number;
  z: number;
  /** Width along the street (local X). */
  w: number;
  /** Parcel depth perpendicular to street (local Z). */
  d: number;
  /** Eaves wall height above y = 0. */
  h: number;
  /** Roof peak height above eaves. */
  roofH: number;
  /** Story count (2–5). */
  floors: number;
  /** Story height (m). */
  storyH: number;
  /** Y rotation aligning local +Z to `normal`. */
  rotY: number;
  normal: [number, number];
  style: ArchitecturalStyle;
  facadeFinish: FacadeFinish;
  roofForm: RoofForm;
  /** True when the roof ridge runs perpendicular to street (gable faces board). */
  gableFronted: boolean;
  crownKind: CrownKind;
  /** Distance from the near front facade to the playable board rectangle. */
  nearDist: number;
  /** Distance from the house center (roof peak) to the playable board rectangle. */
  centerDist: number;
  /** Facade wall color (calibrated mineral lime/fresco/ochre/terracotta range). */
  facadeColor: string;
  /** Contrasting cornice / pilaster / window-frame limestone or white stucco color. */
  trimColor: string;
  /** Ground-floor rusticated stone plinth color. */
  plinthColor: string;
  /** Weathered Bohemian clay tile / slate roof color. */
  roofColor: string;
  /** Whether the house carries a cantilevered 1st-floor bay oriel (arkýř). */
  hasOriel: boolean;
  /** Whether the house uses Renaissance sgraffito facade finish. */
  hasSgraffito: boolean;
  /** Whether Renaissance upper windows are paired (sdružená okna). */
  hasPairedWindows: boolean;
  /** Whether a painted/relief house sign (domovní znamení) adorns the facade. */
  hasHouseSign: boolean;
  /** Number of dormers (vikýře) along the front roof slope. */
  dormerCount: number;
  /** Number of vertical facade bays (window columns). */
  bays: number;
  /** Chimney lateral offset in [-0.3, +0.3] * w. */
  chimneyOffsetFrac: number;
  /** Whether a stone ground-floor portal sits on the front facade. */
  hasPortal: boolean;
}

export interface WindowInstance {
  x: number;
  y: number;
  z: number;
  rotY: number;
  w: number;
  h: number;
  lit: boolean;
  style: ArchitecturalStyle;
  pediment: WindowPediment;
  floor: number;
  trimColor: string;
  glowColor: string;
}

export interface DetailTransform {
  x: number;
  y: number;
  z: number;
  rotY: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
}

export interface CityInstancePlan {
  houses: PragueHouse[];
  sgraffitoHouses: PragueHouse[];
  frescoHouses: PragueHouse[];
  gothicPlasterHouses: PragueHouse[];
  baroqueStuccoHouses: PragueHouse[];
  gableRoofs: DetailTransform[];
  mansardRoofs: DetailTransform[];
  plinths: DetailTransform[];
  cornices: DetailTransform[];
  pilasters: DetailTransform[];
  renaissanceGables: DetailTransform[];
  renaissanceAttics: DetailTransform[];
  baroqueGables: DetailTransform[];
  gothicGables: DetailTransform[];
  dormers: DetailTransform[];
  oriels: DetailTransform[];
  gothicPortals: DetailTransform[];
  renaissancePortals: DetailTransform[];
  baroquePortals: DetailTransform[];
  gothicDoors: DetailTransform[];
  renaissanceDoors: DetailTransform[];
  baroqueDoors: DetailTransform[];
  gothicGrilles: DetailTransform[];
  basketGrilles: DetailTransform[];
  houseSigns: DetailTransform[];
  chimneys: DetailTransform[];
  finials: DetailTransform[];
  windows: WindowInstance[];
}

export const STANDARD_BOARD_BOUNDS: BoardBounds = {
  minX: -19.2,
  maxX: 19.2,
  minZ: -22.4,
  maxZ: 22.4,
};

/** Playable bounds for Mission 2 (Charles Bridge + Tower + Křižovnické náměstí, clear of Křižovníci/corner cutaways at z = ±12.3). */
export const MISSION2_BOARD_BOUNDS: BoardBounds = {
  minX: -19.2,
  maxX: 19.2,
  minZ: -12.4,
  maxZ: 12.4,
};

/** Tighter playable bounds for Mission 3 (Powder Yard + Čertovka skiff dock). */
export const MISSION3_BOARD_BOUNDS: BoardBounds = {
  minX: -12.8,
  maxX: 10.4,
  minZ: -11.4,
  maxZ: 3.4,
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a world XZ point to an axis-aligned board rectangle (0 inside). */
export function distToBoardBounds(x: number, z: number, bounds: BoardBounds): number {
  const dx = x < bounds.minX ? bounds.minX - x : x > bounds.maxX ? x - bounds.maxX : 0;
  const dz = z < bounds.minZ ? bounds.minZ - z : z > bounds.maxZ ? z - bounds.maxZ : 0;
  return Math.hypot(dx, dz);
}

/**
 * Maximum safe eaves height & total peak height so foreground surrounding houses
 * never occlude playable edge tiles from any of the 4 isometric 52.2° camera angles.
 */
export function maxSafeEavesHeight(nearDist: number): number {
  return Math.max(0, nearDist * 1.12 + 3.45);
}

export function maxSafeTotalHeight(centerDist: number): number {
  return Math.max(0, centerDist * 1.18 + 3.9);
}

/**
 * Transforms a house-local coordinate `(lx, ly, lz)` into world `[wx, wy, wz]`
 * where local `+Z` aligns with `normal` and local `+X` runs right-handed along the facade.
 */
export function localToWorld(
  house: Pick<PragueHouse, "x" | "z" | "rotY">,
  lx: number,
  ly: number,
  lz: number,
): [number, number, number] {
  const cos = Math.cos(house.rotY);
  const sin = Math.sin(house.rotY);
  const wx = house.x + lx * cos + lz * sin;
  const wz = house.z - lx * sin + lz * cos;
  return [wx, ly, wz];
}

// ---------------------------------------------------------------------------
// Historical 1618–1648 Palettes (Colorful Period Pigments + Crisp Architectural Contrast)
// ---------------------------------------------------------------------------

interface StylePalette {
  facades: readonly string[];
  altFacades?: readonly string[]; // e.g., rich fresco mineral pigments for non-sgraffito Renaissance
  trims: readonly string[];
  plinths: readonly string[];
  roofs: readonly string[];
}

const NIGHT_PALETTES: Record<ArchitecturalStyle, StylePalette> = {
  renaissance: {
    // High-contrast bright-ivory multiplier for charcoal-and-white psaníčkové sgrafito
    facades: ["#7e786e", "#767067", "#847c71", "#797369"],
    // Mineral Renaissance frescoes (Venetian red, warm ochre, verdigris sage, muted fresco slate-blue)
    altFacades: ["#683d34", "#705938", "#485848", "#42505c", "#6c4838"],
    trims: ["#918778", "#887e70", "#988e7f"],
    plinths: ["#3a3631", "#35312d", "#403b35"],
    roofs: ["#5f3428", "#552e24", "#68392c", "#4e2b21"],
  },
  baroque: {
    // Early Baroque warm ochre, terracotta, and salmon contrasting sharply against crisp white/sandstone trims
    facades: ["#785c37", "#6f4436", "#7a5345", "#7c6548", "#734e3e"],
    trims: ["#a29a8d", "#999083", "#aaa294"],
    plinths: ["#3d3833", "#38332e", "#443e38"],
    roofs: ["#5c3127", "#522f27", "#64362b", "#4b312d"],
  },
  gothic: {
    // Surviving medieval smooth limewash (off-white, muted ochre, light stone grey)
    facades: ["#605c54", "#61543f", "#56534e", "#5b5851"],
    trims: ["#4f4a43", "#58524a", "#4a4640"],
    plinths: ["#322f2b", "#2f2c29", "#383430"],
    roofs: ["#3a312f", "#452e2a", "#353437", "#4a312b"],
  },
};

const DAY_PALETTES: Record<ArchitecturalStyle, StylePalette> = {
  renaissance: {
    // High-contrast white-lime multiplier so black-charcoal sgraffito reads vividly
    facades: ["#cbc4b6", "#c2baa9", "#d1c9ba", "#c6beb0"],
    // Rich Renaissance fresco pigments (Venetian red, ochre, green, slate-blue)
    altFacades: ["#9d5a4b", "#b08b52", "#6c806a", "#5f7484", "#a36a52"],
    trims: ["#dad1c2", "#d1c7b6", "#e0d8ca"],
    plinths: ["#655d53", "#5d564d", "#6d655a"],
    roofs: ["#8f4f38", "#834733", "#98573e", "#7c4431"],
  },
  baroque: {
    // Warm Early Baroque ochre, terracotta, salmon-apricot paired with bright crisp white/sandstone articles
    facades: ["#b58b4e", "#a8664e", "#b67e66", "#b8996c", "#ab725a"],
    trims: ["#e2dbd0", "#d9d1c4", "#e7e1d6"],
    plinths: ["#686055", "#60584e", "#70685c"],
    roofs: ["#884935", "#7d4533", "#91513b", "#714739"],
  },
  gothic: {
    // Natural medieval limewash (off-white, warm ochre, light grey)
    facades: ["#a49e92", "#a68f68", "#928e86", "#9c978d"],
    trims: ["#827b70", "#8b8377", "#797368"],
    plinths: ["#565048", "#504b44", "#5e574f"],
    roofs: ["#564a47", "#694136", "#4f4e51", "#704437"],
  },
};

const HOUSE_SIGN_TINTS = ["#e8dfd0", "#e2d4be", "#ddd6c8", "#eadbc2"] as const;
const LIT_WINDOW_COLORS = ["#eca84e", "#df9440", "#f2ba62", "#d48638"] as const;

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function pickStyle(district: DistrictProfile, rand: () => number): ArchitecturalStyle {
  const r = rand();
  if (district === "stare_mesto") {
    // Old Town medieval core: stronger Gothic survival alongside Renaissance & Early Baroque
    if (r < 0.42) return "renaissance";
    if (r < 0.72) return "baroque";
    return "gothic";
  }
  if (district === "kampa") {
    // Kampa mill & craft island: predominantly Renaissance + Early Baroque
    if (r < 0.54) return "renaissance";
    if (r < 0.88) return "baroque";
    return "gothic";
  }
  // Malá Strana (1541 Renaissance rebuild overwritten in 1620s–48 by Early Baroque; rare surviving Gothic cores)
  if (r < 0.52) return "renaissance";
  if (r < 0.87) return "baroque";
  return "gothic";
}

// ---------------------------------------------------------------------------
// City Layout Synthesis
// ---------------------------------------------------------------------------

export function buildPragueHouses(
  rows: RowSpec[],
  night: boolean,
  seed: number,
  bounds: BoardBounds = STANDARD_BOARD_BOUNDS,
): PragueHouse[] {
  const rand = mulberry32(seed);
  const palettes = night ? NIGHT_PALETTES : DAY_PALETTES;
  const out: PragueHouse[] = [];

  for (const row of rows) {
    const rotY = Math.atan2(row.normal[0], row.normal[1]);
    let s = row.from;

    while (s < row.to - 3.6) {
      const style = pickStyle(row.district, rand);

      // Authentic Prague parcel widths scaled to TILE_SIZE = 1.6 m (3–5.5 tiles wide)
      let w =
        style === "gothic"
          ? 4.1 + rand() * 1.5
          : style === "baroque"
            ? 6.0 + rand() * 2.8
            : 5.0 + rand() * 2.4;

      const remaining = row.to - s;
      if (remaining < w + 2.6) {
        w = Math.min(w, remaining);
      }
      if (w < 3.6) break;

      // Slight parcel depth jitter so rooflines never look like a sterile extrusion
      const d = row.depth * (0.9 + rand() * 0.22);
      const mid = s + w * 0.5;
      // Narrow Prague alleys / passages between burgher blocks
      const gap = rand() < 0.16 ? 1.5 + rand() * 1.2 : 0.08 + rand() * 0.14;
      s += w + gap;

      // Keep the front facade aligned cleanly along the street line while letting backs vary
      const depthShift = (row.depth - d) * 0.5;
      const x = (row.alongX ? mid : row.at) + row.normal[0] * depthShift;
      const z = (row.alongX ? row.at : mid) + row.normal[1] * depthShift;

      // True near facade is in +normal direction from house center
      const nearX = x + row.normal[0] * (d * 0.5);
      const nearZ = z + row.normal[1] * (d * 0.5);
      const nearDist = distToBoardBounds(nearX, nearZ, bounds);
      const centerDist = distToBoardBounds(x, z, bounds);

      // Never overlap the playable board
      if (nearDist < 0.75) continue;

      const storyH =
        style === "baroque"
          ? 2.42 + rand() * 0.16
          : style === "renaissance"
            ? 2.22 + rand() * 0.15
            : 2.12 + rand() * 0.14;

      const eavesCap = Math.min(row.eavesRange[1], maxSafeEavesHeight(nearDist));
      const totalCap = Math.min(row.maxTotalH, maxSafeTotalHeight(centerDist));

      if (eavesCap < 3.6 || totalCap < 5.4) continue;

      // Decide roof form & orientation by architectural period
      let roofForm: RoofForm = "gable";
      let gableFronted = false;
      let crownKind: CrownKind = "renaissance_attic";

      if (style === "gothic") {
        roofForm = "gable";
        gableFronted = rand() < 0.85; // Classic medieval Prague vertical gable-to-street
        crownKind = "gothic_gable";
      } else if (style === "baroque") {
        if (rand() < 0.58) {
          roofForm = "mansard";
          gableFronted = false;
          crownKind = "baroque_gable";
        } else {
          roofForm = "gable";
          gableFronted = rand() < 0.6;
          crownKind = "baroque_gable";
        }
      } else {
        // Renaissance: high scrolled gables or Prague lunette attics hiding the roofline
        roofForm = "gable";
        if (rand() < 0.54) {
          gableFronted = true;
          crownKind = "renaissance_gable";
        } else {
          gableFronted = false;
          crownKind = rand() < 0.68 ? "renaissance_attic" : "renaissance_gable";
        }
      }

      // Compute roof pitch height
      const span = gableFronted ? w : d;
      const rawRoofH =
        roofForm === "mansard"
          ? Math.min(3.9, Math.max(2.3, d * 0.44))
          : style === "gothic"
            ? Math.min(4.6, Math.max(2.6, span * 0.58))
            : Math.min(3.8, Math.max(2.1, span * 0.46));

      // Desired eaves height within row envelope
      const desiredEaves =
        row.eavesRange[0] + rand() * Math.max(0.2, row.eavesRange[1] - row.eavesRange[0]);
      const maxEavesFromTotal = totalCap - rawRoofH * 0.82;
      const clampedEaves = Math.min(desiredEaves, eavesCap, maxEavesFromTotal);
      if (clampedEaves < 3.6) continue;

      const floors = Math.max(2, Math.min(5, Math.round(clampedEaves / storyH)));
      const h = Math.min(eavesCap, Math.max(4.0, Math.min(totalCap - 1.8, clampedEaves)));
      const roofH = Math.max(1.75, Math.min(rawRoofH, totalCap - h));

      const hasSgraffito = style === "renaissance" && rand() < 0.58;
      const facadeFinish: FacadeFinish =
        style === "gothic"
          ? "gothic_plaster"
          : style === "baroque"
            ? "baroque_stucco"
            : hasSgraffito
              ? "sgraffito"
              : "fresco";

      const pal = palettes[style];
      const facadeColor =
        facadeFinish === "fresco" && pal.altFacades
          ? pick(pal.altFacades, rand)
          : pick(pal.facades, rand);
      const trimColor = pick(pal.trims, rand);
      const plinthColor = pick(pal.plinths, rand);
      const roofColor = pick(pal.roofs, rand);

      const minBayPitch = style === "baroque" ? 1.78 : style === "renaissance" ? 1.55 : 1.42;
      const bays = Math.max(2, Math.min(6, Math.floor((w - 0.4) / minBayPitch)));
      const hasOriel =
        (style === "gothic" && rand() < 0.36) ||
        (style === "renaissance" && rand() < 0.22);
      const hasPairedWindows = style === "renaissance" && w >= 5.2 && rand() < 0.58;
      const hasPortal = w >= 4.2 && rand() < 0.82;
      const hasHouseSign =
        (style === "gothic" && rand() < 0.78) ||
        (style === "renaissance" && rand() < 0.65);

      const dormerCount =
        gableFronted
          ? 0
          : roofForm === "mansard"
            ? Math.max(1, Math.min(3, Math.floor(w / 2.6)))
            : rand() < 0.65
              ? Math.max(1, Math.min(2, Math.floor(w / 3.2)))
              : 0;

      out.push({
        x,
        z,
        w,
        d,
        h,
        roofH,
        floors,
        storyH,
        rotY,
        normal: row.normal,
        style,
        facadeFinish,
        roofForm,
        gableFronted,
        crownKind,
        nearDist,
        centerDist,
        facadeColor,
        trimColor,
        plinthColor,
        roofColor,
        hasOriel,
        hasSgraffito,
        hasPairedWindows,
        hasHouseSign,
        dormerCount,
        bays,
        chimneyOffsetFrac: (rand() - 0.5) * 0.54,
        hasPortal,
      });
    }
  }

  return out;
}

/**
 * Expands a list of `PragueHouse` records into all instanced architectural component transforms.
 * Pure deterministic function — safe to run in unit tests and `useMemo`.
 */
export function buildCityInstancePlan(
  houses: PragueHouse[],
  night: boolean,
  seed: number,
): CityInstancePlan {
  const rand = mulberry32(seed);
  const sgraffitoHouses: PragueHouse[] = [];
  const frescoHouses: PragueHouse[] = [];
  const gothicPlasterHouses: PragueHouse[] = [];
  const baroqueStuccoHouses: PragueHouse[] = [];
  const gableRoofs: DetailTransform[] = [];
  const mansardRoofs: DetailTransform[] = [];
  const plinths: DetailTransform[] = [];
  const cornices: DetailTransform[] = [];
  const pilasters: DetailTransform[] = [];
  const renaissanceGables: DetailTransform[] = [];
  const renaissanceAttics: DetailTransform[] = [];
  const baroqueGables: DetailTransform[] = [];
  const gothicGables: DetailTransform[] = [];
  const dormers: DetailTransform[] = [];
  const oriels: DetailTransform[] = [];
  const gothicPortals: DetailTransform[] = [];
  const renaissancePortals: DetailTransform[] = [];
  const baroquePortals: DetailTransform[] = [];
  const gothicDoors: DetailTransform[] = [];
  const renaissanceDoors: DetailTransform[] = [];
  const baroqueDoors: DetailTransform[] = [];
  const gothicGrilles: DetailTransform[] = [];
  const basketGrilles: DetailTransform[] = [];
  const houseSigns: DetailTransform[] = [];
  const chimneys: DetailTransform[] = [];
  const finials: DetailTransform[] = [];
  const windows: WindowInstance[] = [];

  for (const hs of houses) {
    if (hs.facadeFinish === "sgraffito") sgraffitoHouses.push(hs);
    else if (hs.facadeFinish === "fresco") frescoHouses.push(hs);
    else if (hs.facadeFinish === "gothic_plaster") gothicPlasterHouses.push(hs);
    else baroqueStuccoHouses.push(hs);

    // 1. Ground-floor rusticated stone plinth / sokl (sits cleanly below ground-floor window sills)
    const plinthH = 0.54 + (hs.style === "baroque" ? 0.14 : 0.06);
    plinths.push({
      x: hs.x,
      y: plinthH * 0.5 - 0.28,
      z: hs.z,
      rotY: hs.rotY,
      sx: hs.w + 0.06,
      sy: plinthH + 0.56,
      sz: hs.d + 0.05,
      color: hs.plinthColor,
    });

    // 2. Main eaves crown cornice + prominent Early Baroque / Renaissance belt courses (kordonové římsy)
    cornices.push({
      x: hs.x,
      y: hs.h - 0.04,
      z: hs.z,
      rotY: hs.rotY,
      sx: hs.w + (hs.style === "baroque" ? 0.42 : 0.32),
      sy: hs.style === "baroque" ? 0.34 : 0.22,
      sz: hs.d + (hs.style === "baroque" ? 0.42 : 0.32),
      color: hs.trimColor,
    });

    // Belt courses dividing stories (Early Baroque gets bold plastic stringcourses on every floor)
    if (hs.h > 4.4 && hs.style !== "gothic") {
      const beltFloors = hs.style === "baroque" ? Math.min(3, Math.floor((hs.h - 1.2) / hs.storyH)) : 1;
      for (let bf = 1; bf <= beltFloors; bf++) {
        const beltY = bf * hs.storyH + 0.12;
        if (beltY > hs.h - 0.8) break;
        cornices.push({
          x: hs.x,
          y: beltY,
          z: hs.z,
          rotY: hs.rotY,
          sx: hs.w + (hs.style === "baroque" ? 0.28 : 0.18),
          sy: hs.style === "baroque" ? 0.18 : 0.14,
          sz: hs.d + (hs.style === "baroque" ? 0.28 : 0.18),
          color: hs.trimColor,
        });
      }
    }

    // 3. Plastic Early Baroque pilasters / Renaissance corner lesenes (Gothic uses painted corner quoins)
    if (hs.style !== "gothic") {
      const pilasterCount = hs.style === "baroque" ? Math.min(5, hs.bays + 1) : 2;
      for (let p = 0; p < pilasterCount; p++) {
        const frac = pilasterCount === 1 ? 0 : p / (pilasterCount - 1) - 0.5;
        const lx = frac * (hs.w - 0.28);
        // Never bisect a ground-floor arched portal: central Baroque pilasters begin on the piano nobile belt course
        const baseY = hs.hasPortal && Math.abs(lx) < 1.05 ? hs.storyH + 0.2 : plinthH;
        const pilasterH = hs.h - baseY - 0.18;
        if (pilasterH < 0.9) continue;
        const pilasterY = baseY + pilasterH * 0.5;
        const depth = hs.style === "baroque" ? 0.22 : 0.14;
        const [wx, wy, wz] = localToWorld(hs, lx, pilasterY, hs.d * 0.5 + depth * 0.4);
        pilasters.push({
          x: wx,
          y: wy,
          z: wz,
          rotY: hs.rotY,
          sx: hs.style === "baroque" ? 0.3 : 0.28,
          sy: pilasterH,
          sz: depth,
          color: hs.trimColor,
        });
      }
    }

    // 4. Roof volume (true-pitched gable or 4-sided Early Baroque mansard)
    if (hs.roofForm === "mansard") {
      mansardRoofs.push({
        x: hs.x,
        y: hs.h,
        z: hs.z,
        rotY: hs.rotY,
        sx: hs.w + 0.44,
        sy: hs.roofH,
        sz: hs.d + 0.44,
        color: hs.roofColor,
      });
    } else if (hs.gableFronted) {
      gableRoofs.push({
        x: hs.x,
        y: hs.h,
        z: hs.z,
        rotY: hs.rotY + Math.PI / 2,
        sx: hs.d - 0.12,
        sy: hs.roofH,
        sz: hs.w + 0.36,
        color: hs.roofColor,
      });
    } else {
      const depthSpan = hs.crownKind === "renaissance_attic" ? hs.d - 0.1 : hs.d + 0.42;
      gableRoofs.push({
        x: hs.x,
        y: hs.h,
        z: hs.z,
        rotY: hs.rotY,
        sx: hs.w + 0.34,
        sy: hs.roofH,
        sz: depthSpan,
        color: hs.roofColor,
      });
    }

    // 5. Period Gables & Attics (Renaissance volute/lunette with vases & čučky, Baroque scrolled tympanum, Gothic crow-step)
    const frontZ = hs.d * 0.5 - 0.08;
    if (hs.crownKind === "renaissance_attic") {
      const atticH = Math.min(1.8, hs.roofH * 0.68);
      const [wx, wy, wz] = localToWorld(hs, 0, hs.h + 0.04, frontZ);
      renaissanceAttics.push({
        x: wx,
        y: wy,
        z: wz,
        rotY: hs.rotY,
        sx: hs.w + 0.12,
        sy: atticH,
        sz: 0.36,
        color: hs.facadeColor,
      });
      // Stone vases / ball finials along the Renaissance attic parapet (corners + center)
      for (const side of [-0.48, 0, 0.48] as const) {
        const [fx, fy, fz] = localToWorld(hs, side * hs.w, hs.h + atticH + 0.12, frontZ);
        finials.push({
          x: fx,
          y: fy,
          z: fz,
          rotY: hs.rotY,
          sx: 0.25,
          sy: side === 0 ? 0.48 : 0.38,
          sz: 0.25,
          color: hs.trimColor,
        });
      }
    } else if (hs.gableFronted) {
      const gableH = hs.roofH + (hs.style === "gothic" ? 0.58 : 0.52);
      const gableList =
        hs.crownKind === "baroque_gable"
          ? baroqueGables
          : hs.crownKind === "gothic_gable"
            ? gothicGables
            : renaissanceGables;

      for (const endSign of [1, -1] as const) {
        const [gx, gy, gz] = localToWorld(hs, 0, hs.h - 0.02, endSign * frontZ);
        gableList.push({
          x: gx,
          y: gy,
          z: gz,
          rotY: endSign === 1 ? hs.rotY : hs.rotY + Math.PI,
          sx: hs.w + 0.08,
          sy: gableH,
          sz: 0.38,
          color: hs.style === "baroque" ? hs.trimColor : hs.facadeColor,
        });
      }

      // Apex finial + Renaissance/Baroque flanking gable vases (vázy a čučky)
      const [fx, fy, fz] = localToWorld(hs, 0, hs.h + gableH + 0.16, frontZ);
      finials.push({
        x: fx,
        y: fy,
        z: fz,
        rotY: hs.rotY,
        sx: 0.28,
        sy: hs.style === "gothic" ? 0.64 : 0.52,
        sz: 0.28,
        color: hs.trimColor,
      });
      if (hs.style !== "gothic") {
        for (const side of [-0.46, 0.46] as const) {
          const [sfx, sfy, sfz] = localToWorld(hs, side * hs.w, hs.h + gableH * 0.22, frontZ);
          finials.push({
            x: sfx,
            y: sfy,
            z: sfz,
            rotY: hs.rotY,
            sx: 0.22,
            sy: 0.4,
            sz: 0.22,
            color: hs.trimColor,
          });
        }
      }
    } else {
      // Eave-parallel house with central decorative wall-gable (štítový nástavec)
      const wallGableW = Math.min(hs.w * 0.52, 3.6);
      const wallGableH = Math.min(hs.roofH * 0.92, 2.75);
      const [gx, gy, gz] = localToWorld(hs, 0, hs.h - 0.02, frontZ + 0.06);
      const gableList =
        hs.crownKind === "baroque_gable"
          ? baroqueGables
          : hs.crownKind === "gothic_gable"
            ? gothicGables
            : renaissanceGables;
      gableList.push({
        x: gx,
        y: gy,
        z: gz,
        rotY: hs.rotY,
        sx: wallGableW,
        sy: wallGableH,
        sz: 0.38,
        color: hs.trimColor,
      });
      const [fx, fy, fz] = localToWorld(hs, 0, hs.h + wallGableH + 0.14, frontZ + 0.06);
      finials.push({
        x: fx,
        y: fy,
        z: fz,
        rotY: hs.rotY,
        sx: 0.24,
        sy: 0.44,
        sz: 0.24,
        color: hs.trimColor,
      });
    }

    // 6. Roof Dormers (vikýře) along eave-parallel roof slopes (never colliding with central wall-gable)
    if (hs.dormerCount > 0) {
      const dormerY = hs.h + hs.roofH * 0.36;
      const dormerZ = hs.d * 0.29;
      const dormerXs: number[] = [];
      if (hs.crownKind !== "renaissance_attic") {
        // Central wall-gable occupies the ridge center; flank it symmetrically if roof is wide enough
        const wallGableHalf = Math.min(hs.w * 0.26, 1.8);
        const flankX = Math.max(wallGableHalf + 0.72, hs.w * 0.34);
        if (flankX + 0.62 <= hs.w * 0.5) {
          dormerXs.push(-flankX, flankX);
        }
      } else {
        const spacing = hs.w / (hs.dormerCount + 1);
        for (let di = 0; di < hs.dormerCount; di++) {
          dormerXs.push(-hs.w * 0.5 + spacing * (di + 1));
        }
      }

      for (const lx of dormerXs) {
        const [dx, dy, dz] = localToWorld(hs, lx, dormerY, dormerZ);
        dormers.push({
          x: dx,
          y: dy,
          z: dz,
          rotY: hs.rotY,
          sx: 0.96,
          sy: 1.08,
          sz: 1.12,
          color: hs.trimColor,
        });
        const [dwx, dwy, dwz] = localToWorld(hs, lx, dormerY + 0.36, dormerZ + 0.5);
        windows.push({
          x: dwx,
          y: dwy,
          z: dwz,
          rotY: hs.rotY,
          w: 0.42,
          h: 0.48,
          lit: night && rand() < 0.14,
          style: hs.style,
          pediment: hs.style === "gothic" ? "gothic" : "renaissance",
          floor: hs.floors,
          trimColor: hs.trimColor,
          glowColor: pick(LIT_WINDOW_COLORS, rand),
        });
      }
    }

    // 7. Cantilevered 1st-floor Oriel Bay (arkýř) on select Gothic & Renaissance houses
    if (hs.hasOriel && hs.h >= 4.8) {
      const orielW = Math.min(1.65, hs.w * 0.32);
      const orielH = hs.storyH * 0.86;
      const orielY = hs.storyH + orielH * 0.5 + 0.16;
      const [ox, oy, oz] = localToWorld(hs, 0, orielY, hs.d * 0.5 + 0.32);
      oriels.push({
        x: ox,
        y: oy,
        z: oz,
        rotY: hs.rotY,
        sx: orielW,
        sy: orielH,
        sz: 0.68,
        color: hs.trimColor,
      });
      const [owx, owy, owz] = localToWorld(hs, 0, orielY + 0.04, hs.d * 0.5 + 0.68);
      windows.push({
        x: owx,
        y: owy,
        z: owz,
        rotY: hs.rotY,
        w: Math.min(0.68, orielW * 0.5),
        h: Math.min(0.92, orielH * 0.52),
        lit: night && rand() < 0.28,
        style: hs.style,
        pediment: hs.style === "gothic" ? "gothic" : "renaissance",
        floor: 1,
        trimColor: hs.trimColor,
        glowColor: pick(LIT_WINDOW_COLORS, rand),
      });
    }

    // 8. Period Stone Portals, Period Oak Doors & House Signs (Domovní znamení)
    let portalTopY = 0;
    if (hs.hasPortal) {
      const portalW = hs.style === "baroque" ? 1.68 : hs.style === "renaissance" ? 1.44 : 1.24;
      const portalH =
        hs.style === "baroque"
          ? Math.min(hs.storyH * 0.82, 1.98)
          : Math.min(hs.storyH * 0.88, 2.02);
      portalTopY = portalH;

      const [px, py, pz] = localToWorld(hs, 0, 0, hs.d * 0.5 + 0.095);
      const portalEntry: DetailTransform = {
        x: px,
        y: py,
        z: pz,
        rotY: hs.rotY,
        sx: portalW,
        sy: portalH,
        sz: hs.style === "baroque" ? 0.34 : 0.26,
        color: hs.trimColor,
      };
      if (hs.style === "gothic") gothicPortals.push(portalEntry);
      else if (hs.style === "baroque") baroquePortals.push(portalEntry);
      else renaissancePortals.push(portalEntry);

      // Period-textured oak portal door panel fills 100% of arch opening (no wall plaster crescent leaking at top)
      const doorH = portalH * 0.985;
      const [rx, ry, rz] = localToWorld(hs, 0, doorH * 0.5, hs.d * 0.5 + 0.052);
      const doorEntry: DetailTransform = {
        x: rx,
        y: ry,
        z: rz,
        rotY: hs.rotY,
        sx: portalW * 0.68,
        sy: doorH,
        sz: 1,
        color: night ? "#7c6c5a" : "#c8b69e",
      };
      if (hs.style === "gothic") gothicDoors.push(doorEntry);
      else if (hs.style === "baroque") baroqueDoors.push(doorEntry);
      else renaissanceDoors.push(doorEntry);
    }

    // Painted / relief Prague house sign plaque (Domovní znamení — U Zlatého slunce / lva)
    if (hs.hasHouseSign && hs.h >= 4.4 && !hs.hasOriel) {
      const signY = hs.hasPortal ? portalTopY + 0.42 : hs.storyH + 0.14;
      if (signY < hs.h - 0.8) {
        const [sx, sy, sz] = localToWorld(hs, 0, signY, hs.d * 0.5 + 0.105);
        houseSigns.push({
          x: sx,
          y: sy,
          z: sz,
          rotY: hs.rotY,
          sx: 0.78,
          sy: 0.58,
          sz: 0.1,
          color: night ? "#b4a894" : pick(HOUSE_SIGN_TINTS, rand),
        });
      }
    }

    // 9. Period Chimney Stack with Corbeled Crown
    const chimX = hs.chimneyOffsetFrac * hs.w;
    const chimZ = hs.gableFronted ? (rand() - 0.5) * hs.d * 0.35 : -hs.d * 0.14;
    const chimBaseY = hs.h + hs.roofH * 0.68;
    const [cx, cy, cz] = localToWorld(hs, chimX, chimBaseY, chimZ);
    chimneys.push({
      x: cx,
      y: cy,
      z: cz,
      rotY: hs.rotY,
      sx: 0.56,
      sy: 1.45 + rand() * 0.55,
      sz: 0.56,
      color: hs.plinthColor,
    });

    // 10. Period Windows (Gothic deep bukle + iron bars, Renaissance paired + basket grilles, Baroque tall + tri/seg pediments)
    const usableFloors = Math.max(2, Math.floor((hs.h - 0.45) / hs.storyH));
    const baseWinW = hs.style === "gothic" ? 0.54 : hs.style === "baroque" ? 0.8 : 0.68;
    const groundWinH = hs.style === "gothic" ? 1.06 : hs.style === "baroque" ? 1.18 : 1.1;
    const upperWinH = hs.style === "gothic" ? 1.08 : hs.style === "baroque" ? 1.3 : 1.12;
    const minBayClearance = baseWinW * 1.52;
    const effectiveBays = Math.max(1, Math.min(hs.bays, Math.floor((hs.w - 0.85) / minBayClearance)));
    const bayStep = (hs.w - 0.85) / effectiveBays;

    for (let f = 0; f < usableFloors; f++) {
      const winH = f === 0 ? groundWinH : upperWinH;
      const wy = f === 0 ? 1.48 : f * hs.storyH + (hs.style === "baroque" ? 1.32 : 1.2);
      const topPad = hs.style === "baroque" ? winH * 0.74 : winH * 0.58;
      if (wy + topPad > hs.h - 0.16) continue;

      // Determine window horizontal X coordinates for this floor (supporting paired Renaissance windows with zero hood overlap)
      const bayXs: number[] = [];
      if (hs.hasPairedWindows && f >= 1 && hs.w >= 5.2) {
        const pairCount = hs.w >= 7.0 ? 2 : 1;
        const innerHalf = 0.43;
        if (pairCount === 1) {
          bayXs.push(-innerHalf, innerHalf);
        } else {
          const groupCenter = hs.w * 0.255;
          bayXs.push(
            -groupCenter - innerHalf,
            -groupCenter + innerHalf,
            groupCenter - innerHalf,
            groupCenter + innerHalf,
          );
        }
      } else {
        for (let b = 0; b < effectiveBays; b++) {
          bayXs.push(-((effectiveBays - 1) * 0.5) * bayStep + b * bayStep);
        }
      }

      for (let bi = 0; bi < bayXs.length; bi++) {
        const lx = bayXs[bi]!;
        const winW = hs.hasPairedWindows && f >= 1 ? 0.56 : baseWinW;
        if (Math.abs(lx) + winW * 0.72 > hs.w * 0.5 - 0.22) continue;
        // Skip ground-floor center bay where the arched portal sits
        if (f === 0 && hs.hasPortal && Math.abs(lx) < 0.96) continue;
        // Skip 1st-floor center bay if an oriel occupies it
        if (f === 1 && hs.hasOriel && Math.abs(lx) < 0.85) continue;

        const pediment: WindowPediment =
          hs.style === "gothic"
            ? "gothic"
            : hs.style === "renaissance"
              ? "renaissance"
              : (f + bi) % 2 === 0
                ? "baroque_tri"
                : "baroque_seg";

        const [wx, wwy, wz] = localToWorld(hs, lx, wy, hs.d * 0.5 + 0.08);
        const litChance = night ? (f === 0 ? 0.11 : 0.18) : 0;
        const lit = rand() < litChance;

        windows.push({
          x: wx,
          y: wwy,
          z: wz,
          rotY: hs.rotY,
          w: winW,
          h: winH,
          lit,
          style: hs.style,
          pediment,
          floor: f,
          trimColor: hs.trimColor,
          glowColor: pick(LIT_WINDOW_COLORS, rand),
        });

        // Ground-floor period iron grilles: Gothic heavy crossed iron bars / Renaissance outward-bowed basket grilles (košové mříže)
        if (f === 0 && hs.style === "gothic") {
          const [gx, gy, gz] = localToWorld(hs, lx, wy, hs.d * 0.5 + 0.115);
          gothicGrilles.push({
            x: gx,
            y: gy,
            z: gz,
            rotY: hs.rotY,
            sx: winW * 0.96,
            sy: winH * 0.96,
            sz: 0.06,
            color: "#222428",
          });
        } else if (f === 0 && hs.style === "renaissance") {
          const [gx, gy, gz] = localToWorld(hs, lx, wy, hs.d * 0.5 + 0.12);
          basketGrilles.push({
            x: gx,
            y: gy,
            z: gz,
            rotY: hs.rotY,
            sx: winW * 1.02,
            sy: winH * 0.96,
            sz: 0.24,
            color: "#232529",
          });
        }
      }
    }

    // Attic / gable loft window on gable-fronted houses
    if (hs.gableFronted && hs.roofH >= 2.2) {
      const [wx, wy, wz] = localToWorld(hs, 0, hs.h + hs.roofH * 0.42, hs.d * 0.5 + 0.17);
      windows.push({
        x: wx,
        y: wy,
        z: wz,
        rotY: hs.rotY,
        w: 0.48,
        h: 0.68,
        lit: night && rand() < 0.12,
        style: hs.style,
        pediment: hs.style === "gothic" ? "gothic" : "renaissance",
        floor: hs.floors,
        trimColor: hs.trimColor,
        glowColor: pick(LIT_WINDOW_COLORS, rand),
      });
    }
  }

  return {
    houses,
    sgraffitoHouses,
    frescoHouses,
    gothicPlasterHouses,
    baroqueStuccoHouses,
    gableRoofs,
    mansardRoofs,
    plinths,
    cornices,
    pilasters,
    renaissanceGables,
    renaissanceAttics,
    baroqueGables,
    gothicGables,
    dormers,
    oriels,
    gothicPortals,
    renaissancePortals,
    baroquePortals,
    gothicDoors,
    renaissanceDoors,
    baroqueDoors,
    gothicGrilles,
    basketGrilles,
    houseSigns,
    chimneys,
    finials,
    windows,
  };
}

// ---------------------------------------------------------------------------
// Mission Row Specifications (Enlarged, Terraced, Historically Placed)
// ---------------------------------------------------------------------------

export function getMissionRowSpecs(mission: MissionId): RowSpec[] {
  if (mission === "mission2") {
    // Dawn: Old Town (Staré Město) east/north/south of Křižovnické náměstí,
    // Malá Strana across the Vltava to the west.
    return [
      // Old Town east behind Křižovnické náměstí (3 terraced rows rising toward Staroměstské nám.)
      {
        from: -46,
        to: 46,
        at: 24.4,
        alongX: false,
        depth: 6.6,
        normal: [-1, 0],
        eavesRange: [5.0, 6.4],
        maxTotalH: 10.4,
        district: "stare_mesto",
      },
      {
        from: -48,
        to: 48,
        at: 32.8,
        alongX: false,
        depth: 7.4,
        normal: [-1, 0],
        eavesRange: [7.8, 10.6],
        maxTotalH: 15.0,
        district: "stare_mesto",
      },
      {
        from: -50,
        to: 50,
        at: 41.8,
        alongX: false,
        depth: 7.8,
        normal: [-1, 0],
        eavesRange: [9.8, 13.0],
        maxTotalH: 18.0,
        district: "stare_mesto",
      },
      // Old Town riverside north & south framing Křižovnické náměstí (clear of Křižovníci/corner cutaways at z = ±12.3 and east row at x = 21.1)
      {
        from: 6.2,
        to: 20.6,
        at: -18.5,
        alongX: true,
        depth: 6.6,
        normal: [0, 1],
        eavesRange: [5.2, 6.5],
        maxTotalH: 10.4,
        district: "stare_mesto",
      },
      {
        from: 6.2,
        to: 20.6,
        at: 18.8,
        alongX: true,
        depth: 6.6,
        normal: [0, -1],
        eavesRange: [5.0, 6.4],
        maxTotalH: 10.2,
        district: "stare_mesto",
      },
      {
        from: 6.2,
        to: 20.6,
        at: -27.2,
        alongX: true,
        depth: 7.2,
        normal: [0, 1],
        eavesRange: [7.6, 10.4],
        maxTotalH: 14.8,
        district: "stare_mesto",
      },
      {
        from: 6.2,
        to: 20.6,
        at: 27.5,
        alongX: true,
        depth: 7.2,
        normal: [0, -1],
        eavesRange: [7.6, 10.4],
        maxTotalH: 14.8,
        district: "stare_mesto",
      },
      // Malá Strana riverfront across the Vltava (west bank, clear of Charles Bridge z ∈ [-8, +8])
      {
        from: -48,
        to: -8.5,
        at: -61.8,
        alongX: false,
        depth: 7.4,
        normal: [1, 0],
        eavesRange: [7.5, 10.8],
        maxTotalH: 15.2,
        district: "mala_strana",
      },
      {
        from: 8.5,
        to: 48,
        at: -61.8,
        alongX: false,
        depth: 7.4,
        normal: [1, 0],
        eavesRange: [7.5, 10.8],
        maxTotalH: 15.2,
        district: "mala_strana",
      },
      {
        from: -50,
        to: 50,
        at: -71.0,
        alongX: false,
        depth: 8.2,
        normal: [1, 0],
        eavesRange: [9.8, 13.6],
        maxTotalH: 18.5,
        district: "mala_strana",
      },
    ];
  }

  if (mission === "mission3") {
    // Nocturnal Powder Yard (Doutnák): Kampa across Čertovka west, Malá Strana streets north & south
    return [
      // Kampa burgher & mill houses across Čertovka (west bank, channel at x = -12.8..-9.6)
      {
        from: -24,
        to: 20,
        at: -19.2,
        alongX: false,
        depth: 6.6,
        normal: [1, 0],
        eavesRange: [5.0, 6.8],
        maxTotalH: 10.4,
        district: "kampa",
      },
      {
        from: -28,
        to: 24,
        at: -27.6,
        alongX: false,
        depth: 7.4,
        normal: [1, 0],
        eavesRange: [7.6, 10.4],
        maxTotalH: 14.6,
        district: "kampa",
      },
      // North Malá Strana houses behind the powder store (east of Čertovka)
      {
        from: -8.0,
        to: 16.0,
        at: -18.2,
        alongX: true,
        depth: 6.6,
        normal: [0, 1],
        eavesRange: [5.2, 7.0],
        maxTotalH: 10.6,
        district: "mala_strana",
      },
      {
        from: -8.0,
        to: 22.0,
        at: -26.8,
        alongX: true,
        depth: 7.4,
        normal: [0, 1],
        eavesRange: [7.8, 10.8],
        maxTotalH: 15.0,
        district: "mala_strana",
      },
      // South Malá Strana rows set back generously so default SE camera view stays clear
      {
        from: -8.0,
        to: 16.0,
        at: 11.8,
        alongX: true,
        depth: 6.6,
        normal: [0, -1],
        eavesRange: [5.0, 6.6],
        maxTotalH: 10.0,
        district: "mala_strana",
      },
      {
        from: -8.0,
        to: 22.0,
        at: 20.4,
        alongX: true,
        depth: 7.4,
        normal: [0, -1],
        eavesRange: [7.4, 10.2],
        maxTotalH: 14.4,
        district: "mala_strana",
      },
    ];
  }

  // Mission 1 (night, Malá Strana): Kampa north beyond Čertovka, Maltese Square south,
  // Újezd west, bridge approach east.
  return [
    // Kampa island beyond Čertovka (north)
    {
      from: -48,
      to: 48,
      at: -27.8,
      alongX: true,
      depth: 6.6,
      normal: [0, 1],
      eavesRange: [5.0, 6.8],
      maxTotalH: 10.4,
      district: "kampa",
    },
    {
      from: -50,
      to: 50,
      at: -36.4,
      alongX: true,
      depth: 7.4,
      normal: [0, 1],
      eavesRange: [7.8, 10.8],
      maxTotalH: 15.0,
      district: "kampa",
    },
    // Maltese Square & Lázeňská street (south, leaving gap for Our Lady beneath the Chain at x = -4)
    {
      from: -30,
      to: -11.5,
      at: 27.8,
      alongX: true,
      depth: 6.6,
      normal: [0, -1],
      eavesRange: [5.2, 7.0],
      maxTotalH: 10.6,
      district: "mala_strana",
    },
    {
      from: 3.5,
      to: 30,
      at: 27.8,
      alongX: true,
      depth: 6.6,
      normal: [0, -1],
      eavesRange: [5.2, 7.0],
      maxTotalH: 10.6,
      district: "mala_strana",
    },
    {
      from: -32,
      to: -13.0,
      at: 36.4,
      alongX: true,
      depth: 7.4,
      normal: [0, -1],
      eavesRange: [7.8, 10.8],
      maxTotalH: 15.0,
      district: "mala_strana",
    },
    {
      from: 5.0,
      to: 32,
      at: 36.4,
      alongX: true,
      depth: 7.4,
      normal: [0, -1],
      eavesRange: [7.8, 10.8],
      maxTotalH: 15.0,
      district: "mala_strana",
    },
    // West (towards Újezd) and east (towards bridge) — skip the Čertovka canal band z ∈ [-22.6, -13.5]
    {
      from: -12.8,
      to: 23.0,
      at: -24.8,
      alongX: false,
      depth: 6.6,
      normal: [1, 0],
      eavesRange: [5.2, 7.0],
      maxTotalH: 10.6,
      district: "mala_strana",
    },
    {
      from: -12.8,
      to: 23.0,
      at: 24.8,
      alongX: false,
      depth: 6.6,
      normal: [-1, 0],
      eavesRange: [5.2, 7.0],
      maxTotalH: 10.6,
      district: "mala_strana",
    },
    {
      from: -12.8,
      to: 42.0,
      at: -33.4,
      alongX: false,
      depth: 7.4,
      normal: [1, 0],
      eavesRange: [7.8, 11.0],
      maxTotalH: 15.2,
      district: "mala_strana",
    },
    {
      from: -12.8,
      to: 42.0,
      at: 33.4,
      alongX: false,
      depth: 7.4,
      normal: [-1, 0],
      eavesRange: [7.8, 11.0],
      maxTotalH: 15.2,
      district: "mala_strana",
    },
  ];
}

// ---------------------------------------------------------------------------
// Procedural 3D Architectural Geometries (Built once, shared across instances)
// ---------------------------------------------------------------------------

/** Helper to merge simple non-indexed BufferGeometries with position/normal/uv. */
function mergeSimpleGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let totalVerts = 0;
  for (const g of nonIndexed) {
    totalVerts += g.attributes.position!.count;
  }
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);

  let offset = 0;
  for (const g of nonIndexed) {
    const count = g.attributes.position!.count;
    pos.set(g.attributes.position!.array as Float32Array, offset * 3);
    if (g.attributes.normal) {
      norm.set(g.attributes.normal.array as Float32Array, offset * 3);
    }
    if (g.attributes.uv) {
      uv.set(g.attributes.uv.array as Float32Array, offset * 2);
    }
    offset += count;
    g.dispose();
  }
  for (const g of geoms) g.dispose();

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  merged.computeBoundingSphere();
  return merged;
}

/**
 * True-pitched triangular gable roof with ridge along X (`X ∈ [-0.5, 0.5]`,
 * `Z ∈ [-0.5, 0.5]`, `Y ∈ [0, 1]`) and slope-aligned UVs for scalloped clay tiles.
 */
export function createGableRoofGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    ua: [number, number],
    ub: [number, number],
    uc: [number, number],
  ) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...ua, ...ub, ...uc);
  };

  // Front slope (+Z): eave at z=+0.5, y=0 -> ridge at z=0, y=1
  pushTri([-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0], [0, 0], [2, 0], [2, 1.4]);
  pushTri([-0.5, 0, 0.5], [0.5, 1, 0], [-0.5, 1, 0], [0, 0], [2, 1.4], [0, 1.4]);

  // Back slope (-Z): eave at z=-0.5, y=0 -> ridge at z=0, y=1
  pushTri([0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, 0], [0, 0], [2, 0], [2, 1.4]);
  pushTri([0.5, 0, -0.5], [-0.5, 1, 0], [0.5, 1, 0], [0, 0], [2, 1.4], [0, 1.4]);

  // Right gable end (+X)
  pushTri([0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, 0], [0, 0], [1, 0], [0.5, 1]);
  // Left gable end (-X)
  pushTri([-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0], [0, 0], [1, 0], [0.5, 1]);

  // Bottom soffit cap (prevents hollow view if tilted from below)
  pushTri([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [0, 0], [1, 0], [1, 1]);
  pushTri([-0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [0, 0], [1, 1], [0, 1]);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/**
 * 17th-century Bohemian Baroque 4-sided hipped mansard roof (`X, Z ∈ [-0.5, 0.5]`, `Y ∈ [0, 1]`).
 * Lower steep apron (`y: 0 -> 0.56`) + upper pitched hipped crown (`y: 0.56 -> 1.0`).
 */
export function createMansardRoofGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  const pushQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    uScale: number,
    vScale: number,
  ) => {
    positions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
    uvs.push(0, 0, uScale, 0, uScale, vScale, 0, 0, uScale, vScale, 0, vScale);
  };

  // Ring 0 (eaves): y = 0, x = ±0.5, z = ±0.5
  // Ring 1 (mansard curb): y = 0.56, x = ±0.38, z = ±0.34
  // Ring 2 (hipped ridge): y = 1.0, x = ±0.22, z = ±0.03
  const r0: [number, number, number][] = [
    [-0.5, 0, 0.5],
    [0.5, 0, 0.5],
    [0.5, 0, -0.5],
    [-0.5, 0, -0.5],
  ];
  const r1: [number, number, number][] = [
    [-0.38, 0.56, 0.34],
    [0.38, 0.56, 0.34],
    [0.38, 0.56, -0.34],
    [-0.38, 0.56, -0.34],
  ];
  const r2: [number, number, number][] = [
    [-0.22, 1.0, 0.03],
    [0.22, 1.0, 0.03],
    [0.22, 1.0, -0.03],
    [-0.22, 1.0, -0.03],
  ];

  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const u = i % 2 === 0 ? 2.0 : 1.4;
    pushQuad(r0[i]!, r0[next]!, r1[next]!, r1[i]!, u, 0.9);
    pushQuad(r1[i]!, r1[next]!, r2[next]!, r2[i]!, u * 0.75, 0.7);
  }
  // Narrow ridge cap
  pushQuad(r2[0]!, r2[1]!, r2[2]!, r2[3]!, 1, 0.2);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function extrudeUnitProfile(shape: THREE.Shape): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 3,
  });
  g.translate(0, 0, -0.5);
  // Normalize UVs cleanly into [0, 1] × [0, 1] so centered shapes never create a u=0 vertical seam
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    uv.setXY(i, Math.max(0, Math.min(1, px + 0.5)), Math.max(0, Math.min(1, py)));
  }
  uv.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

/** Bohemian Renaissance scrolled/tiered gable with 3D horizontal tier cornices & mini-pilasters. */
export function createRenaissanceGableGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 0.18);
  s.quadraticCurveTo(0.45, 0.34, 0.35, 0.38);
  s.lineTo(0.35, 0.56);
  s.quadraticCurveTo(0.28, 0.7, 0.18, 0.76);
  s.absarc(0, 0.76, 0.18, 0, Math.PI, false);
  s.quadraticCurveTo(-0.28, 0.7, -0.35, 0.56);
  s.lineTo(-0.35, 0.38);
  s.quadraticCurveTo(-0.45, 0.34, -0.5, 0.18);
  s.closePath();

  const body = extrudeUnitProfile(s);
  const parts: THREE.BufferGeometry[] = [body];

  // Projecting horizontal tier stringcourses (římsy štítu)
  const tier1 = new THREE.BoxGeometry(0.76, 0.055, 1.32);
  tier1.translate(0, 0.38, 0.06);
  parts.push(tier1);
  const tier2 = new THREE.BoxGeometry(0.44, 0.05, 1.3);
  tier2.translate(0, 0.74, 0.06);
  parts.push(tier2);

  // Twin vertical Renaissance gable pilasters framing lower & upper tiers
  for (const side of [-1, 1] as const) {
    const p1 = new THREE.BoxGeometry(0.06, 0.34, 1.24);
    p1.translate(side * 0.28, 0.2, 0.04);
    parts.push(p1);
    const p2 = new THREE.BoxGeometry(0.055, 0.32, 1.24);
    p2.translate(side * 0.16, 0.56, 0.04);
    parts.push(p2);
  }

  return mergeSimpleGeometries(parts);
}

/** Iconic Prague Renaissance lunette attic parapet (lunetová / vlaštovčí atika) with 3D stringcourse & piers. */
export function createRenaissanceAtticGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 0.52);
  const arches = 5;
  const step = 1.0 / arches;
  for (let i = 0; i < arches; i++) {
    const cx = 0.5 - step * (i + 0.5);
    s.absarc(cx, 0.52, step * 0.44, 0, Math.PI, false);
    if (i < arches - 1) {
      s.lineTo(0.5 - step * (i + 1), 0.52);
    }
  }
  s.lineTo(-0.5, 0.52);
  s.closePath();

  const body = extrudeUnitProfile(s);
  const parts: THREE.BufferGeometry[] = [body];

  // Horizontal Renaissance cornice band separating blind lunettes from parapet base
  const band = new THREE.BoxGeometry(1.04, 0.09, 1.3);
  band.translate(0, 0.52, 0.06);
  parts.push(band);

  // Rhythmic vertical mini-pilasters between the swallowtail lunettes
  for (let i = 0; i <= arches; i++) {
    const px = -0.5 + i * step;
    const pier = new THREE.BoxGeometry(0.045, 0.5, 1.22);
    pier.translate(px * 0.96, 0.26, 0.04);
    parts.push(pier);
  }

  return mergeSimpleGeometries(parts);
}

/** Early Baroque scrolled volute gable with 3D triangular tympanum cornice, pilasters & oval oculus. */
export function createBaroqueGableGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 0.14);
  s.bezierCurveTo(0.42, 0.24, 0.36, 0.36, 0.26, 0.56);
  s.lineTo(0.32, 0.62);
  s.lineTo(0.32, 0.68);
  s.lineTo(0, 1.0);
  s.lineTo(-0.32, 0.68);
  s.lineTo(-0.32, 0.62);
  s.lineTo(-0.26, 0.56);
  s.bezierCurveTo(-0.36, 0.36, -0.42, 0.24, -0.5, 0.14);
  s.closePath();

  const body = extrudeUnitProfile(s);
  const parts: THREE.BufferGeometry[] = [body];

  // Projecting horizontal tympanum base cornice
  const cornice = new THREE.BoxGeometry(0.7, 0.065, 1.38);
  cornice.translate(0, 0.63, 0.08);
  parts.push(cornice);

  // Flanking Early Baroque gable pilasters
  for (const side of [-1, 1] as const) {
    const pil = new THREE.BoxGeometry(0.075, 0.58, 1.28);
    pil.translate(side * 0.22, 0.31, 0.05);
    parts.push(pil);
  }

  // Central sculpted oval Baroque cartouche / blind oculus
  const oculus = new THREE.CylinderGeometry(0.09, 0.09, 1.3, 6);
  oculus.rotateX(Math.PI / 2);
  oculus.scale(0.85, 1.15, 1);
  oculus.translate(0, 0.34, 0.06);
  parts.push(oculus);

  return mergeSimpleGeometries(parts);
}

/** Central-European Gothic crow-stepped gable (stupňovitý gotický štít) with stepped stone coping. */
export function createGothicGableGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 0.2);
  s.lineTo(0.39, 0.2);
  s.lineTo(0.39, 0.42);
  s.lineTo(0.28, 0.42);
  s.lineTo(0.28, 0.64);
  s.lineTo(0.16, 0.64);
  s.lineTo(0.16, 0.84);
  s.lineTo(0.06, 0.84);
  s.lineTo(0, 1.0);
  s.lineTo(-0.06, 0.84);
  s.lineTo(-0.16, 0.84);
  s.lineTo(-0.16, 0.64);
  s.lineTo(-0.28, 0.64);
  s.lineTo(-0.28, 0.42);
  s.lineTo(-0.39, 0.42);
  s.lineTo(-0.39, 0.2);
  s.lineTo(-0.5, 0.2);
  s.closePath();
  return extrudeUnitProfile(s);
}

/** Period roof dormer (vikýř): plaster cheek box + projecting pitched gable hood. */
export function createDormerGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.76, 0.66, 0.86);
  body.translate(0, 0.33, 0);

  const hood = createGableRoofGeometry();
  hood.rotateY(Math.PI / 2);
  hood.scale(0.96, 0.42, 1.04);
  hood.translate(0, 0.64, 0.04);

  return mergeSimpleGeometries([body, hood]);
}

/** Cantilevered 1st-floor bay oriel (arkýř) with corbel underside & pitched mini-roof. */
export function createOrielGeometry(): THREE.BufferGeometry {
  const main = new THREE.BoxGeometry(1.0, 0.72, 1.0);
  main.translate(0, 0.02, 0);

  const corbel = new THREE.CylinderGeometry(0.54, 0.16, 0.26, 4);
  corbel.rotateY(Math.PI / 4);
  corbel.scale(1.18, 1, 1.12);
  corbel.translate(0, -0.45, -0.06);

  const cap = new THREE.BoxGeometry(1.12, 0.14, 1.12);
  cap.translate(0, 0.44, 0);

  return mergeSimpleGeometries([main, corbel, cap]);
}

/** Gothic pointed/saddle stone portal with stepped molding & flanking stone benches (kamenná sedátka). */
export function createGothicPortalGeometry(): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  outer.moveTo(-0.52, 0);
  outer.lineTo(0.52, 0);
  outer.lineTo(0.52, 0.72);
  outer.quadraticCurveTo(0.46, 0.92, 0, 1.04);
  outer.quadraticCurveTo(-0.46, 0.92, -0.52, 0.72);
  outer.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-0.34, 0);
  hole.lineTo(0.34, 0);
  hole.lineTo(0.34, 0.64);
  hole.quadraticCurveTo(0.28, 0.8, 0, 0.88);
  hole.quadraticCurveTo(-0.28, 0.8, -0.34, 0.64);
  hole.closePath();
  outer.holes.push(hole);

  const arch = new THREE.ExtrudeGeometry(outer, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 3,
  });
  arch.translate(0, 0, -0.5);

  const parts: THREE.BufferGeometry[] = [arch];
  // Flanking medieval stone benches (kamenná sedátka po stranách portálu)
  for (const side of [-1, 1] as const) {
    const bench = new THREE.BoxGeometry(0.24, 0.24, 1.35);
    bench.translate(side * 0.56, 0.12, 0.35);
    parts.push(bench);
  }
  return mergeSimpleGeometries(parts);
}

/** Renaissance semicircular stone portal with 3D rusticated bosáž blocks & top inscribed tablet. */
export function createRenaissancePortalGeometry(): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  outer.moveTo(-0.5, 0);
  outer.lineTo(0.5, 0);
  outer.lineTo(0.5, 0.68);
  outer.absarc(0, 0.68, 0.5, 0, Math.PI, false);
  outer.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-0.34, 0);
  hole.lineTo(0.34, 0);
  hole.lineTo(0.34, 0.64);
  hole.absarc(0, 0.64, 0.34, 0, Math.PI, false);
  hole.closePath();
  outer.holes.push(hole);

  const arch = new THREE.ExtrudeGeometry(outer, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 4,
  });
  arch.translate(0, 0, -0.5);

  const parts: THREE.BufferGeometry[] = [arch];

  // Alternating rusticated bosáž stone blocks stepping out along both jambs
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.BoxGeometry(0.22, 0.16, 1.24);
      b.translate(side * 0.49, 0.14 + i * 0.24, 0.08);
      parts.push(b);
    }
  }
  // Keystone & top carved date / alliance coat-of-arms stone tablet
  const keystone = new THREE.BoxGeometry(0.18, 0.24, 1.32);
  keystone.translate(0, 1.12, 0.1);
  parts.push(keystone);

  const hood = new THREE.BoxGeometry(1.18, 0.1, 1.28);
  hood.translate(0, 1.24, 0.08);
  parts.push(hood);

  return mergeSimpleGeometries(parts);
}

/**
 * Early Baroque columned portal supporting a projecting balcony (altán),
 * dynamically broken pediment (rozeklaný fronton) & sculpted heraldic cartouche/maskaron.
 * Total balustrade top sits at y = 1.26 so it clears every 1st-floor window sill cleanly.
 */
export function createBaroquePortalGeometry(): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  outer.moveTo(-0.48, 0);
  outer.lineTo(0.48, 0);
  outer.lineTo(0.48, 0.68);
  outer.absarc(0, 0.68, 0.48, 0, Math.PI, false);
  outer.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-0.34, 0);
  hole.lineTo(0.34, 0);
  hole.lineTo(0.34, 0.64);
  hole.absarc(0, 0.64, 0.34, 0, Math.PI, false);
  hole.closePath();
  outer.holes.push(hole);

  const arch = new THREE.ExtrudeGeometry(outer, {
    depth: 0.9,
    bevelEnabled: false,
    curveSegments: 4,
  });
  arch.translate(0, 0, -0.45);

  const parts: THREE.BufferGeometry[] = [arch];

  // Twin flanking classical columns + plinth bases + Ionic/Tuscan capitals
  for (const side of [-1, 1] as const) {
    const col = new THREE.CylinderGeometry(0.085, 0.095, 0.86, 6);
    col.translate(side * 0.56, 0.48, 0.68);
    parts.push(col);

    const base = new THREE.BoxGeometry(0.24, 0.12, 0.48);
    base.translate(side * 0.56, 0.06, 0.68);
    parts.push(base);

    const cap = new THREE.BoxGeometry(0.26, 0.09, 0.5);
    cap.translate(side * 0.56, 0.94, 0.68);
    parts.push(cap);
  }

  // Dynamically broken pediment volutes & keystone maskaron crowning the arch beneath the altán soffit
  for (const side of [-1, 1] as const) {
    const wing = new THREE.BoxGeometry(0.34, 0.065, 0.32);
    wing.rotateZ(side * -0.42);
    wing.translate(side * 0.3, 0.92, 0.52);
    parts.push(wing);
  }
  const maskaron = new THREE.BoxGeometry(0.16, 0.2, 0.36);
  maskaron.translate(0, 0.92, 0.54);
  parts.push(maskaron);

  // Projecting balcony slab (altán) resting cleanly on the twin column capitals
  const slab = new THREE.BoxGeometry(1.46, 0.09, 1.48);
  slab.translate(0, 1.01, 0.68);
  parts.push(slab);

  // Compact Baroque stone balustrade (y: 1.05 -> 1.26, clear of 1st-floor sills)
  const rail = new THREE.BoxGeometry(1.42, 0.055, 0.14);
  rail.translate(0, 1.23, 1.34);
  parts.push(rail);
  for (const bx of [-0.64, -0.34, 0.34, 0.64]) {
    const bal = new THREE.BoxGeometry(0.08, 0.18, 0.1);
    bal.translate(bx, 1.13, 1.34);
    parts.push(bal);
  }
  for (const side of [-1, 1] as const) {
    const sideRail = new THREE.BoxGeometry(0.1, 0.055, 1.26);
    sideRail.translate(side * 0.66, 1.23, 0.72);
    parts.push(sideRail);
  }

  // Heraldic coat-of-arms cartouche mounted prominently on the front balustrade center (catches sunlight)
  const cartouche = new THREE.BoxGeometry(0.24, 0.22, 0.2);
  cartouche.rotateZ(Math.PI / 4);
  cartouche.translate(0, 1.14, 1.38);
  parts.push(cartouche);

  return mergeSimpleGeometries(parts);
}

/** Gothic deeply recessed chamfered stone window surround (hluboko zapuštěné kamenné ostění). */
export function createGothicWindowSurroundGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const frame = new THREE.BoxGeometry(1.22, 1.12, 0.12);
  frame.translate(0, 0, -0.075);
  parts.push(frame);
  for (const side of [-1, 1] as const) {
    const jamb = new THREE.BoxGeometry(0.14, 1.1, 0.18);
    jamb.translate(side * 0.54, 0, 0.02);
    parts.push(jamb);
  }
  const lintel = new THREE.BoxGeometry(1.26, 0.14, 0.2);
  lintel.translate(0, 0.56, 0.03);
  parts.push(lintel);
  const sill = new THREE.BoxGeometry(1.26, 0.12, 0.22);
  sill.translate(0, -0.56, 0.04);
  parts.push(sill);
  return mergeSimpleGeometries(parts);
}

/** Renaissance moulded stone šambrána with 3D side jambs & crisp horizontal cornice hood (nadokenní římsa). */
export function createWindowSurroundGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const frame = new THREE.BoxGeometry(1.16, 1.06, 0.06);
  frame.translate(0, 0, -0.045);
  parts.push(frame);

  // Recessed 3D stone side jambs framing the leaded glass
  for (const side of [-1, 1] as const) {
    const jamb = new THREE.BoxGeometry(0.11, 1.06, 0.14);
    jamb.translate(side * 0.535, 0, 0.02);
    parts.push(jamb);
  }

  // Projecting horizontal Renaissance lintel cornice hood
  const hood = new THREE.BoxGeometry(1.4, 0.15, 0.26);
  hood.translate(0, 0.57, 0.06);
  parts.push(hood);

  // Projecting stone sill (parapet)
  const sill = new THREE.BoxGeometry(1.26, 0.11, 0.2);
  sill.translate(0, -0.55, 0.045);
  parts.push(sill);

  return mergeSimpleGeometries(parts);
}

/** Early Baroque tall sculpted window surround with eared šambrána jambs, triangular or segmental suprafenestra + apron. */
export function createBaroqueWindowSurroundGeometry(pediment: "tri" | "seg"): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Moulded stone šambrána backing
  const frame = new THREE.BoxGeometry(1.18, 1.08, 0.08);
  frame.translate(0, 0, -0.055);
  parts.push(frame);

  // 3D profiled side jambs + signature Baroque upper "eared" shoulders (uši šambrány)
  for (const side of [-1, 1] as const) {
    const jamb = new THREE.BoxGeometry(0.11, 1.08, 0.16);
    jamb.translate(side * 0.545, 0, 0.025);
    parts.push(jamb);

    const ear = new THREE.BoxGeometry(0.16, 0.14, 0.18);
    ear.translate(side * 0.59, 0.45, 0.035);
    parts.push(ear);
  }

  // Base lintel cornice + central keystone boss under the pediment
  const lintel = new THREE.BoxGeometry(1.38, 0.1, 0.24);
  lintel.translate(0, 0.55, 0.06);
  parts.push(lintel);
  const key = new THREE.BoxGeometry(0.14, 0.14, 0.22);
  key.translate(0, 0.53, 0.075);
  parts.push(key);

  if (pediment === "tri") {
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-0.68, 0);
    pedShape.lineTo(0.68, 0);
    pedShape.lineTo(0, 0.22);
    pedShape.closePath();
    const ped = new THREE.ExtrudeGeometry(pedShape, {
      depth: 0.24,
      bevelEnabled: false,
      curveSegments: 1,
    });
    ped.translate(0, 0.58, -0.06);
    parts.push(ped);
  } else {
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-0.66, 0);
    pedShape.lineTo(0.66, 0);
    pedShape.quadraticCurveTo(0, 0.34, -0.66, 0);
    pedShape.closePath();
    const ped = new THREE.ExtrudeGeometry(pedShape, {
      depth: 0.24,
      bevelEnabled: false,
      curveSegments: 4,
    });
    ped.translate(0, 0.58, -0.06);
    parts.push(ped);
  }

  // Sill + decorative stucco sill apron (parapetní výplň)
  const sill = new THREE.BoxGeometry(1.32, 0.11, 0.22);
  sill.translate(0, -0.55, 0.05);
  parts.push(sill);
  const apron = new THREE.BoxGeometry(1.04, 0.1, 0.12);
  apron.translate(0, -0.63, 0.02);
  parts.push(apron);

  return mergeSimpleGeometries(parts);
}

/** Heavy medieval wrought-iron ground-floor grille (provlékaná železná mříž). */
export function createGothicGrilleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.26, 0.26]) {
    const v = new THREE.BoxGeometry(0.08, 1.0, 0.45);
    v.translate(x, 0, 0);
    parts.push(v);
  }
  for (const y of [-0.25, 0.25]) {
    const h = new THREE.BoxGeometry(1.0, 0.08, 0.45);
    h.translate(0, y, 0);
    parts.push(h);
  }
  return mergeSimpleGeometries(parts);
}

/** Renaissance outward-bowed wrought-iron basket grille (košová mříž). */
export function createBasketGrilleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const y of [-0.42, 0.42]) {
    const front = new THREE.BoxGeometry(1.02, 0.06, 0.18);
    front.translate(0, y, 0.85);
    parts.push(front);
    for (const side of [-0.5, 0.5]) {
      const arm = new THREE.BoxGeometry(0.06, 0.06, 0.9);
      arm.translate(side, y, 0.44);
      parts.push(arm);
    }
  }
  for (const x of [-0.36, 0, 0.36]) {
    const bar = new THREE.BoxGeometry(0.055, 0.9, 0.16);
    bar.translate(x, 0, 0.85);
    parts.push(bar);
  }
  return mergeSimpleGeometries(parts);
}

/** Plastered Prague chimney stack with stepped brick/stone crown (komínová hlava). */
export function createChimneyGeometry(): THREE.BufferGeometry {
  const shaft = new THREE.BoxGeometry(0.76, 0.82, 0.76);
  shaft.translate(0, 0.41, 0);

  const collar = new THREE.BoxGeometry(0.96, 0.1, 0.96);
  collar.translate(0, 0.84, 0);

  const cap = new THREE.BoxGeometry(1.04, 0.08, 1.04);
  cap.translate(0, 0.94, 0);

  return mergeSimpleGeometries([shaft, collar, cap]);
}

/** Sculpted Renaissance/Baroque stone vase / baluster finial crowning gables (vázy a čučky). */
export function createFinialGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(0.68, 0.22, 0.68);
  base.translate(0, 0.11, 0);

  const neck = new THREE.CylinderGeometry(0.18, 0.28, 0.14, 6);
  neck.translate(0, 0.29, 0);

  const belly = new THREE.CylinderGeometry(0.32, 0.18, 0.28, 6);
  belly.translate(0, 0.5, 0);

  const crown = new THREE.ConeGeometry(0.28, 0.36, 6);
  crown.translate(0, 0.82, 0);

  return mergeSimpleGeometries([base, neck, belly, crown]);
}

export interface PragueArchitectureGeometries {
  gableRoof: THREE.BufferGeometry;
  mansardRoof: THREE.BufferGeometry;
  renaissanceGable: THREE.BufferGeometry;
  renaissanceAttic: THREE.BufferGeometry;
  baroqueGable: THREE.BufferGeometry;
  gothicGable: THREE.BufferGeometry;
  dormer: THREE.BufferGeometry;
  oriel: THREE.BufferGeometry;
  gothicPortal: THREE.BufferGeometry;
  renaissancePortal: THREE.BufferGeometry;
  baroquePortal: THREE.BufferGeometry;
  gothicWindowSurround: THREE.BufferGeometry;
  renaissanceWindowSurround: THREE.BufferGeometry;
  baroqueWindowSurroundTri: THREE.BufferGeometry;
  baroqueWindowSurroundSeg: THREE.BufferGeometry;
  gothicGrille: THREE.BufferGeometry;
  basketGrille: THREE.BufferGeometry;
  chimney: THREE.BufferGeometry;
  finial: THREE.BufferGeometry;
}

export function createPragueArchitectureGeometries(): PragueArchitectureGeometries {
  return {
    gableRoof: createGableRoofGeometry(),
    mansardRoof: createMansardRoofGeometry(),
    renaissanceGable: createRenaissanceGableGeometry(),
    renaissanceAttic: createRenaissanceAtticGeometry(),
    baroqueGable: createBaroqueGableGeometry(),
    gothicGable: createGothicGableGeometry(),
    dormer: createDormerGeometry(),
    oriel: createOrielGeometry(),
    gothicPortal: createGothicPortalGeometry(),
    renaissancePortal: createRenaissancePortalGeometry(),
    baroquePortal: createBaroquePortalGeometry(),
    gothicWindowSurround: createGothicWindowSurroundGeometry(),
    renaissanceWindowSurround: createWindowSurroundGeometry(),
    baroqueWindowSurroundTri: createBaroqueWindowSurroundGeometry("tri"),
    baroqueWindowSurroundSeg: createBaroqueWindowSurroundGeometry("seg"),
    gothicGrille: createGothicGrilleGeometry(),
    basketGrille: createBasketGrilleGeometry(),
    chimney: createChimneyGeometry(),
    finial: createFinialGeometry(),
  };
}

export function disposePragueArchitectureGeometries(
  geoms: PragueArchitectureGeometries,
): void {
  Object.values(geoms).forEach((g) => g.dispose());
}
