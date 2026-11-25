/**
 * Historical 1648 Swedish Army 2D Cut-out Skeletal Rig & Animation State Machine
 * (/src/utils/swedishRig2D.ts).
 *
 * Pure TypeScript module (zero DOM / zero Three.js dependencies) powering:
 * - Authentic 1648 Königsmark / Karl Gustav Swedish brigade liveries & troop classes:
 *   * Modernized M1624 Lightened Musket WITHOUT furketa (fired offhand from shoulder,
 *     waist leather cartridge box `patronkök` with paper cartridges `papperspatroner`,
 *     or transitional bandolier) for Yellow Brigade, Blue Brigade, Green campaign veterans,
 *     and Mission 3 Carolean guards.
 *   * Older Heavy Matchlock WITH wooden furketa + full 12 Apostles bandolier for
 *     heavy parapet/siege marksmen (Belvedere marksman `enemy-sniper-roof`) or any
 *     unit carrying a `supportsRestFork` firearm.
 *   * Officer Buff Coat (`Kolet`) + blackened cuirass + `Zischägge` + yellow/blue sash,
 *     Red Brigade Assault Pikeman (`Morion` + cuirass + tassets + 5m pike),
 *     Artillery Constable (leather spark apron + tool satchel + rammer + glowing `luntstock`),
 *     and Mission 2 Harrier / Field Inquisitor.
 * - Hierarchical skeletal joint state machine with smooth angle lerping:
 *   idle, march, overwatch, fire (offhand M1624 shoulder-raise OR furketa plant ->
 *   cheek weld -> match dip -> pan flash -> +0.10s main muzzle blast -> recoil & climb ->
 *   white black-powder smoke), misfire, melee, reload (paper-cartridge bite/ram vs
 *   apostle powder pouring), hit, collapse.
 * - Analytical 2-bone 2D IK solver for two-handed musket grip.
 * - Damped secondary motion physics for swinging 12 Apostles powder flasks,
 *   coat-hem & heavy wool cloak (`kapp`) inertia, ostrich plume flutter, and
 *   shifting metallic specular highlights.
 */

import type { ScenarioId, UnitArchetype } from "../core/types";

export type SwedishProfileId =
  | "odowalsky_officer"
  | "yellow_brigade"
  | "blue_brigade"
  | "green_veteran"
  | "belvedere_heavy_musketeer"
  | "red_pikeman"
  | "artillery_constable"
  | "m3_carolean"
  | "m2_harrier"
  | "m2_occultist";

export type SwedishHeadgearKind =
  | "slokhatt"
  | "zischagge"
  | "morion"
  | "karpus"
  | "constable_cap"
  | "hood"
  | "mitre";

export type SwedishWeaponKind =
  | "light_musket"
  | "heavy_musket_furketa"
  | "pike_and_musket"
  | "officer_carbine"
  | "constable_luntstock"
  | "harrier_blade"
  | "occultist_censer";

export type SwedishFootwearKind = "skor" | "riding_boots";
export type SwedishSidearmKind = "rapier" | "katzbalger" | "palash" | "dagger" | "none";
export type SwedishBeardKind = "mustache_goatee" | "full_nordic" | "stubble" | "eyepatch";

export interface SwedishSashStyle {
  primary: string;
  secondary: string;
  fringe: string;
}

export interface SwedishTroopProfile {
  id: SwedishProfileId;
  brigadeName: string;
  /** Matte wool vadmal or ochre buff leather (kolet) palette */
  coatBase: string;
  coatLight: string;
  coatShadow: string;
  cuffColor: string;
  liningColor: string;
  buttonColor: string;
  isBuffLeather: boolean;
  /** White linen falling collar & shirt cuffs peeking from coat sleeves */
  hasFallingCollar: boolean;
  hasLaceTrim: boolean;
  shirtColor: string;
  /** Knee-length Pluderhosen / Pumphosen, knitted stockings, footwear */
  breechesColor: string;
  breechesShadow: string;
  stockingsColor: string;
  footwear: SwedishFootwearKind;
  bootColor: string;
  /** Heavy circular rain cloak (kapp) */
  hasCloak: boolean;
  cloakColor: string;
  cloakShadow: string;
  cloakLining: string;
  /** Chest armor / apron / equipment */
  hasCuirass: boolean;
  hasTassets: boolean;
  /** Traditional 12 Apostles leather cross-belt with wooden/tin powder flasks */
  hasBandolier: boolean;
  apostleCount: number;
  apostleColor: string;
  /** Modernized Swedish waist leather cartridge box (`patronkök`) with paper cartridges */
  hasCartridgeBox: boolean;
  /** True for modern M1624 troops reloading via paper cartridges instead of loose apostle flasks */
  usesPaperCartridges: boolean;
  hasLeatherApron: boolean;
  hasToolSatchel: boolean;
  sash: SwedishSashStyle | null;
  /** Headgear & face */
  headgear: SwedishHeadgearKind;
  hatColor: string;
  hatShadow: string;
  ribbonColor: string;
  plumePrimary: string | null;
  plumeSecondary: string | null;
  skinTone: string;
  hairColor: string;
  beard: SwedishBeardKind;
  /** Armaments */
  primaryWeapon: SwedishWeaponKind;
  sidearm: SwedishSidearmKind;
  hasBackBanner: boolean;
  /** 1648 campaign weathering */
  mudIntensity: number;
  scratchSeed: number;
}

const SWEDISH_PROFILES: Record<SwedishProfileId, SwedishTroopProfile> = {
  odowalsky_officer: {
    id: "odowalsky_officer",
    brigadeName: "Königsmarkův důstojník (Kolet & Šerpa)",
    coatBase: "#c79a58",
    coatLight: "#e3c58b",
    coatShadow: "#7a5628",
    cuffColor: "#1d4ed8",
    liningColor: "#1e3a8a",
    buttonColor: "#facc15",
    isBuffLeather: true,
    hasFallingCollar: true,
    hasLaceTrim: true,
    shirtColor: "#f8f4e8",
    breechesColor: "#5e4429",
    breechesShadow: "#332212",
    stockingsColor: "#1e3a8a",
    footwear: "riding_boots",
    bootColor: "#241811",
    hasCloak: true,
    cloakColor: "#1a3566",
    cloakShadow: "#0b1830",
    cloakLining: "#d4a73f",
    hasCuirass: true,
    hasTassets: false,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#6d4c2f",
    hasCartridgeBox: false,
    usesPaperCartridges: false,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: { primary: "#facc15", secondary: "#1d4ed8", fringe: "#fef08a" },
    headgear: "zischagge",
    hatColor: "#334155",
    hatShadow: "#0f172a",
    ribbonColor: "#facc15",
    plumePrimary: "#facc15",
    plumeSecondary: "#2563eb",
    skinTone: "#ecc19b",
    hairColor: "#543722",
    beard: "mustache_goatee",
    primaryWeapon: "officer_carbine",
    sidearm: "palash",
    hasBackBanner: false,
    mudIntensity: 0.52,
    scratchSeed: 17,
  },

  yellow_brigade: {
    id: "yellow_brigade",
    brigadeName: "Žlutá brigáda (Královská garda — M1624 bez furkety)",
    // Elite Royal Guard: modernized lightened M1624 musket fired offhand + waist patronkök
    coatBase: "#d8a528",
    coatLight: "#f4ce5e",
    coatShadow: "#875d10",
    cuffColor: "#1d4ed8",
    liningColor: "#1e3a8a",
    buttonColor: "#e2e8f0",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#f4efe2",
    breechesColor: "#ba891f",
    breechesShadow: "#69480c",
    stockingsColor: "#b91c1c",
    footwear: "skor",
    bootColor: "#2a1d15",
    hasCloak: false,
    cloakColor: "#1e3a8a",
    cloakShadow: "#0f1e47",
    cloakLining: "#d8a528",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#6c4829",
    hasCartridgeBox: true,
    usesPaperCartridges: true,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: null,
    headgear: "slokhatt",
    hatColor: "#29221d",
    hatShadow: "#14100d",
    ribbonColor: "#2563eb",
    plumePrimary: "#facc15",
    plumeSecondary: "#2563eb",
    skinTone: "#ecc19c",
    hairColor: "#b47b34",
    beard: "full_nordic",
    primaryWeapon: "light_musket",
    sidearm: "rapier",
    hasBackBanner: false,
    mudIntensity: 0.65,
    scratchSeed: 31,
  },

  blue_brigade: {
    id: "blue_brigade",
    brigadeName: "Modrá brigáda (Mušketýr — M1624 bez furkety)",
    // Transitional 1648 infantryman: lightened M1624 fired offhand, wearing campaign bandolier + cloak
    coatBase: "#204ca6",
    coatLight: "#3b71d6",
    coatShadow: "#102657",
    cuffColor: "#eab308",
    liningColor: "#ca8a04",
    buttonColor: "#cbd5e1",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#efe9db",
    breechesColor: "#1c3c82",
    breechesShadow: "#0e1f47",
    stockingsColor: "#eab308",
    footwear: "skor",
    bootColor: "#271c15",
    hasCloak: true,
    cloakColor: "#253042",
    cloakShadow: "#111722",
    cloakLining: "#ca8a04",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: true,
    apostleCount: 11,
    apostleColor: "#755132",
    hasCartridgeBox: true,
    usesPaperCartridges: true,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: null,
    headgear: "slokhatt",
    hatColor: "#27211d",
    hatShadow: "#110e0c",
    ribbonColor: "#facc15",
    plumePrimary: "#facc15",
    plumeSecondary: "#f8fafc",
    skinTone: "#ecc39f",
    hairColor: "#6b4728",
    beard: "mustache_goatee",
    primaryWeapon: "light_musket",
    sidearm: "rapier",
    hasBackBanner: false,
    mudIntensity: 0.72,
    scratchSeed: 43,
  },

  green_veteran: {
    id: "green_veteran",
    brigadeName: "Zelená brigáda (Polní vadmal — M1624 bez furkety)",
    // Undyed grey-brown campaign vadmal with Green Brigade cuffs & karpus, modern lightened musket
    coatBase: "#70665a",
    coatLight: "#928778",
    coatShadow: "#3d372f",
    cuffColor: "#2d6a42",
    liningColor: "#1f4d30",
    buttonColor: "#cbd5e1",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#ebe4d4",
    breechesColor: "#574c41",
    breechesShadow: "#302922",
    stockingsColor: "#e2dccf",
    footwear: "skor",
    bootColor: "#291e16",
    hasCloak: false,
    cloakColor: "#354a39",
    cloakShadow: "#19261c",
    cloakLining: "#7d7263",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#5f4127",
    hasCartridgeBox: true,
    usesPaperCartridges: true,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: null,
    headgear: "karpus",
    hatColor: "#2e5e3d",
    hatShadow: "#183321",
    ribbonColor: "#facc15",
    plumePrimary: null,
    plumeSecondary: null,
    skinTone: "#e5b892",
    hairColor: "#4c3828",
    beard: "stubble",
    primaryWeapon: "light_musket",
    sidearm: "rapier",
    hasBackBanner: false,
    mudIntensity: 0.82,
    scratchSeed: 59,
  },

  belvedere_heavy_musketeer: {
    id: "belvedere_heavy_musketeer",
    brigadeName: "Zelená brigáda (Těžký mušketýr s furketou)",
    // Seasoned parapet marksman retaining an older long-barrel heavy matchlock WITH furketa & 12 Apostles
    coatBase: "#685f53",
    coatLight: "#8a7f71",
    coatShadow: "#39332b",
    cuffColor: "#2d6a42",
    liningColor: "#1d4a2d",
    buttonColor: "#cbd5e1",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#e8e0cf",
    breechesColor: "#4f463c",
    breechesShadow: "#2c2620",
    stockingsColor: "#dfd8c8",
    footwear: "skor",
    bootColor: "#261c14",
    hasCloak: true,
    cloakColor: "#314736",
    cloakShadow: "#17241a",
    cloakLining: "#7d7263",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: true,
    apostleCount: 12,
    apostleColor: "#634327",
    hasCartridgeBox: false,
    usesPaperCartridges: false,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: null,
    headgear: "karpus",
    hatColor: "#2a5738",
    hatShadow: "#152e1d",
    ribbonColor: "#facc15",
    plumePrimary: null,
    plumeSecondary: null,
    skinTone: "#e2b58e",
    hairColor: "#483526",
    beard: "full_nordic",
    primaryWeapon: "heavy_musket_furketa",
    sidearm: "rapier",
    hasBackBanner: false,
    mudIntensity: 0.84,
    scratchSeed: 67,
  },

  red_pikeman: {
    id: "red_pikeman",
    brigadeName: "Červená brigáda (Útočný pikenýr-mušketýr)",
    coatBase: "#a12b2b",
    coatLight: "#c84444",
    coatShadow: "#591313",
    cuffColor: "#eab308",
    liningColor: "#78350f",
    buttonColor: "#eab308",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#f0eadc",
    breechesColor: "#632020",
    breechesShadow: "#360e0e",
    stockingsColor: "#d6a42b",
    footwear: "skor",
    bootColor: "#231914",
    hasCloak: false,
    cloakColor: "#3d1818",
    cloakShadow: "#1f0b0b",
    cloakLining: "#eab308",
    hasCuirass: true,
    hasTassets: true,
    hasBandolier: true,
    apostleCount: 11,
    apostleColor: "#6b4728",
    hasCartridgeBox: false,
    usesPaperCartridges: true,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: null,
    headgear: "morion",
    hatColor: "#2a313b",
    hatShadow: "#0e1218",
    ribbonColor: "#facc15",
    plumePrimary: "#facc15",
    plumeSecondary: "#2563eb",
    skinTone: "#e9bc97",
    hairColor: "#8b5a2b",
    beard: "full_nordic",
    primaryWeapon: "pike_and_musket",
    sidearm: "katzbalger",
    hasBackBanner: false,
    mudIntensity: 0.78,
    scratchSeed: 73,
  },

  artillery_constable: {
    id: "artillery_constable",
    brigadeName: "Švédský dělostřelec (Konstábl)",
    coatBase: "#393e4a",
    coatLight: "#545b6b",
    coatShadow: "#1b1e24",
    cuffColor: "#734a29",
    liningColor: "#4a3322",
    buttonColor: "#b48a46",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#dfd7c5",
    breechesColor: "#2d2a27",
    breechesShadow: "#171513",
    stockingsColor: "#78716c",
    footwear: "skor",
    bootColor: "#1e1612",
    hasCloak: false,
    cloakColor: "#292524",
    cloakShadow: "#141110",
    cloakLining: "#57534e",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#5c3b20",
    hasCartridgeBox: false,
    usesPaperCartridges: false,
    hasLeatherApron: true,
    hasToolSatchel: true,
    sash: { primary: "#dc2626", secondary: "#991b1b", fringe: "#f59e0b" },
    headgear: "constable_cap",
    hatColor: "#272320",
    hatShadow: "#12100e",
    ribbonColor: "#dc2626",
    plumePrimary: null,
    plumeSecondary: null,
    skinTone: "#e1b28c",
    hairColor: "#443429",
    beard: "stubble",
    primaryWeapon: "constable_luntstock",
    sidearm: "dagger",
    hasBackBanner: false,
    mudIntensity: 0.86,
    scratchSeed: 89,
  },

  m3_carolean: {
    id: "m3_carolean",
    brigadeName: "Karolinský mušketýr (Prachová hlídka — M1624 bez furkety)",
    coatBase: "#1e4596",
    coatLight: "#396ac9",
    coatShadow: "#0e204a",
    cuffColor: "#dc2626",
    liningColor: "#991b1b",
    buttonColor: "#eab308",
    isBuffLeather: false,
    hasFallingCollar: true,
    hasLaceTrim: false,
    shirtColor: "#f1ebdd",
    breechesColor: "#1c3670",
    breechesShadow: "#0d1b3b",
    stockingsColor: "#e7e1d3",
    footwear: "skor",
    bootColor: "#221812",
    hasCloak: false,
    cloakColor: "#1d2a44",
    cloakShadow: "#0c1321",
    cloakLining: "#dc2626",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#6d4829",
    hasCartridgeBox: true,
    usesPaperCartridges: true,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: { primary: "#dc2626", secondary: "#991b1b", fringe: "#facc15" },
    headgear: "slokhatt",
    hatColor: "#26201c",
    hatShadow: "#120f0d",
    ribbonColor: "#dc2626",
    plumePrimary: "#facc15",
    plumeSecondary: "#dc2626",
    skinTone: "#eabfa0",
    hairColor: "#754f2b",
    beard: "mustache_goatee",
    primaryWeapon: "light_musket",
    sidearm: "rapier",
    hasBackBanner: false,
    mudIntensity: 0.74,
    scratchSeed: 101,
  },

  m2_harrier: {
    id: "m2_harrier",
    brigadeName: "Švédský harcovník",
    coatBase: "#343740",
    coatLight: "#4c505c",
    coatShadow: "#17191e",
    cuffColor: "#991b1b",
    liningColor: "#7f1d1d",
    buttonColor: "#94a3b8",
    isBuffLeather: false,
    hasFallingCollar: false,
    hasLaceTrim: false,
    shirtColor: "#d6cfc2",
    breechesColor: "#27272a",
    breechesShadow: "#121215",
    stockingsColor: "#52525b",
    footwear: "skor",
    bootColor: "#181412",
    hasCloak: true,
    cloakColor: "#242429",
    cloakShadow: "#0d0d10",
    cloakLining: "#991b1b",
    hasCuirass: false,
    hasTassets: false,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#5c3b20",
    hasCartridgeBox: false,
    usesPaperCartridges: false,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: { primary: "#b91c1c", secondary: "#7f1d1d", fringe: "#facc15" },
    headgear: "hood",
    hatColor: "#33363f",
    hatShadow: "#13151a",
    ribbonColor: "#dc2626",
    plumePrimary: null,
    plumeSecondary: null,
    skinTone: "#d8baa0",
    hairColor: "#292524",
    beard: "stubble",
    primaryWeapon: "harrier_blade",
    sidearm: "dagger",
    hasBackBanner: false,
    mudIntensity: 0.68,
    scratchSeed: 113,
  },

  m2_occultist: {
    id: "m2_occultist",
    brigadeName: "Švédský polní inkvizitor",
    coatBase: "#1e326e",
    coatLight: "#314fa8",
    coatShadow: "#0c1533",
    cuffColor: "#eab308",
    liningColor: "#854d0e",
    buttonColor: "#facc15",
    isBuffLeather: false,
    hasFallingCollar: false,
    hasLaceTrim: false,
    shirtColor: "#e7dec8",
    breechesColor: "#172554",
    breechesShadow: "#0a1026",
    stockingsColor: "#1e293b",
    footwear: "riding_boots",
    bootColor: "#13151c",
    hasCloak: true,
    cloakColor: "#172554",
    cloakShadow: "#080d21",
    cloakLining: "#d4a73f",
    hasCuirass: true,
    hasTassets: true,
    hasBandolier: false,
    apostleCount: 0,
    apostleColor: "#5c3b20",
    hasCartridgeBox: false,
    usesPaperCartridges: false,
    hasLeatherApron: false,
    hasToolSatchel: false,
    sash: { primary: "#eab308", secondary: "#1e3a8a", fringe: "#fef08a" },
    headgear: "mitre",
    hatColor: "#1e3a8a",
    hatShadow: "#0a1536",
    ribbonColor: "#facc15",
    plumePrimary: null,
    plumeSecondary: null,
    skinTone: "#e0b38d",
    hairColor: "#2b211a",
    beard: "eyepatch",
    primaryWeapon: "occultist_censer",
    sidearm: "palash",
    hasBackBanner: true,
    mudIntensity: 0.55,
    scratchSeed: 127,
  },
};

/**
 * Resolves a historically authentic 1648 Swedish uniform profile for any Swedish
 * enemy unit across Missions 1, 2, and 3. Returns `null` for Bohemian/Imperial
 * player units so they keep their own distinct baroque sprites.
 */
export function resolveSwedishProfile(
  archetype: UnitArchetype,
  unitId?: string,
  scenario?: ScenarioId,
  faction?: "player" | "enemy",
): SwedishTroopProfile | null {
  if (faction === "player") return null;
  if (unitId?.startsWith("player-")) return null;

  if (unitId === "enemy-odowalsky") return SWEDISH_PROFILES.odowalsky_officer;
  if (unitId === "enemy-musketeer") return SWEDISH_PROFILES.yellow_brigade;
  if (unitId === "enemy-garden-musketeer") return SWEDISH_PROFILES.blue_brigade;
  if (unitId === "enemy-sniper-roof") return SWEDISH_PROFILES.belvedere_heavy_musketeer;
  if (unitId === "enemy-reinforcement-vanguard") return SWEDISH_PROFILES.red_pikeman;
  if (unitId === "enemy-reinforcement-reserve") return SWEDISH_PROFILES.yellow_brigade;
  if (unitId === "enemy-gunner") return SWEDISH_PROFILES.artillery_constable;
  if (unitId?.startsWith("enemy-bearer-")) return SWEDISH_PROFILES.green_veteran;
  if (unitId?.startsWith("enemy-harrier")) return SWEDISH_PROFILES.m2_harrier;
  if (unitId === "enemy-occultist") return SWEDISH_PROFILES.m2_occultist;

  if (scenario === "mission3" && unitId?.startsWith("enemy-")) {
    if (unitId === "enemy-sentry-2" || unitId === "enemy-relief-2") {
      return SWEDISH_PROFILES.yellow_brigade;
    }
    return SWEDISH_PROFILES.m3_carolean;
  }

  if (archetype === "trooper") return SWEDISH_PROFILES.blue_brigade;
  if (archetype === "sectoid") return SWEDISH_PROFILES.m2_occultist;
  if (faction === "enemy") return SWEDISH_PROFILES.blue_brigade;

  return null;
}

/**
 * Determines whether a Swedish unit physically carries & deploys a wooden furketa rest fork.
 * Modernized M1624 Swedish muskets (`light_musket`, `supportsRestFork: false`) do NOT use a furketa;
 * older heavy matchlocks (`heavy_musket_furketa`) or weapons with `supportsRestFork === true` do.
 */
export function resolveUsesFurketa(
  profile: SwedishTroopProfile,
  supportsRestFork?: boolean,
): boolean {
  if (profile.primaryWeapon === "heavy_musket_furketa") return true;
  if (profile.primaryWeapon === "light_musket" && supportsRestFork === true) return true;
  return false;
}

export function getAllSwedishProfiles(): SwedishTroopProfile[] {
  return Object.values(SWEDISH_PROFILES);
}

// ---------------------------------------------------------------------------
// 2-Bone Analytical Inverse Kinematics (for two-handed musket/pike holding)
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

export interface TwoBoneIKResult {
  shoulder: Vec2;
  elbow: Vec2;
  hand: Vec2;
  upperAngle: number;
  lowerAngle: number;
}

/**
 * Solves 2D two-bone inverse kinematics (shoulder -> elbow -> hand) with
 * safe clamping so the elbow never produces NaN even if the target exceeds reach.
 * `bendDir`: +1 bends elbow downward/forward, -1 bends opposite.
 */
export function solveTwoBoneIK(
  shoulder: Vec2,
  target: Vec2,
  upperLen: number,
  lowerLen: number,
  bendDir: 1 | -1 = 1,
): TwoBoneIKResult {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const rawDist = Math.hypot(dx, dy);
  const minDist = Math.abs(upperLen - lowerLen) + 0.001;
  const maxDist = upperLen + lowerLen - 0.001;
  const dist = Math.max(minDist, Math.min(maxDist, rawDist));

  const baseAngle = rawDist > 1e-4 ? Math.atan2(dy, dx) : 0;
  const cosShoulder =
    (upperLen * upperLen + dist * dist - lowerLen * lowerLen) /
    (2 * upperLen * dist);
  const clampedCos = Math.max(-1, Math.min(1, cosShoulder));
  const offsetAngle = Math.acos(clampedCos) * bendDir;
  const upperAngle = baseAngle + offsetAngle;

  const elbow: Vec2 = {
    x: shoulder.x + Math.cos(upperAngle) * upperLen,
    y: shoulder.y + Math.sin(upperAngle) * upperLen,
  };
  const hand: Vec2 = {
    x: shoulder.x + Math.cos(baseAngle) * dist,
    y: shoulder.y + Math.sin(baseAngle) * dist,
  };
  const lowerAngle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);

  return { shoulder, elbow, hand, upperAngle, lowerAngle };
}

// ---------------------------------------------------------------------------
// Animation State Machine & Secondary Motion Physics
// ---------------------------------------------------------------------------

export type SwedishActionState =
  | "idle"
  | "march"
  | "overwatch"
  | "fire"
  | "misfire"
  | "melee"
  | "reload"
  | "hit"
  | "collapse";

export interface SwedishAnimInput {
  isMoving: boolean;
  isOverwatch: boolean;
  isReloading: boolean;
  inCover: boolean;
  isDead: boolean;
  /** True only for older heavy matchlocks braced on a wooden furketa; false for modern M1624 */
  hasFurketa?: boolean;
  /** Seconds since last fire/melee lunge trigger, or null if inactive */
  fireElapsedSec: number | null;
  fireKind: "recoil" | "melee";
  fireMisfired: boolean;
  /** Seconds since hit impact, or null */
  hitElapsedSec: number | null;
  /** Seconds since collapse started, or null */
  collapseElapsedSec: number | null;
  /** Weather wind strength multiplier (1.0 clear, 1.45 rain) */
  windStrength: number;
}

export interface FireSequenceSample {
  /** Active phase label for telemetry & tests */
  phase:
    | "none"
    | "plant_furketa"
    | "shoulder_aim"
    | "pan_flash"
    | "muzzle_blast"
    | "recoil_smoke";
  /** 0..1 furketa planted upright into ground (strictly 0 for modern M1624 without furketa) */
  furketaPlant: number;
  /** 0..1 stock firmly seated into shoulder */
  aimWeight: number;
  /** Head leaning down toward musket sights (radians) */
  headLean: number;
  /** Matchcord lowered onto priming pan (0..1) */
  matchDip: number;
  /** 0..1 bright flash at the priming pan */
  panFlash: number;
  /** 0..1 main barrel muzzle blast (starts strictly +0.10s after pan ignition) */
  muzzleFlash: number;
  /** 0..1 torso & weapon kickback recoil impulse */
  recoilKick: number;
  /** Upward muzzle flip angle (radians) — pronounced on unsupported offhand M1624 shots */
  muzzleClimb: number;
  /** 0..1 expanding billowing white-grey black-powder smoke cloud */
  smokeProgress: number;
  /** 0..1 smoke cloud opacity */
  smokeAlpha: number;
}

/**
 * Evaluates the authentic 17th-century matchlock firing drill in two distinct modes:
 *
 * A) Modernized M1624 Lightened Musket (`hasFurketa === false`, fired offhand):
 *    0.00–0.22s: Snappy offhand shoulder raise & cheek weld (`furketaPlant === 0`)
 *    0.22–0.32s: Matchcord dips -> priming pan flash
 *    0.32–0.52s (+0.10s delay): Main muzzle blast + brisk offhand muzzle climb & recoil
 *    0.32–1.56s: Billowing white black-powder smoke cloud & recovery
 *
 * B) Heavy Matchlock with Furketa (`hasFurketa === true`, braced on fork rest):
 *    0.00–0.18s: Plant wooden furketa into soil (`furketaPlant: 0 -> 1`)
 *    0.18–0.34s: Cradle barrel in brass U-fork, shoulder stock & lean cheek to sights
 *    0.34–0.44s: Matchcord dips -> priming pan flash
 *    0.44–0.64s (+0.10s delay): Main barrel blast + heavy braced rearward torso kick
 *    0.44–1.72s: Dense white black-powder smoke cloud & furketa recovery
 */
export function evaluateFireSequence(
  elapsedSec: number | null,
  isMisfire: boolean,
  hasFurketa = false,
): FireSequenceSample {
  if (elapsedSec === null || elapsedSec < 0 || elapsedSec > 1.78) {
    return {
      phase: "none",
      furketaPlant: 0,
      aimWeight: 0,
      headLean: 0,
      matchDip: 0,
      panFlash: 0,
      muzzleFlash: 0,
      recoilKick: 0,
      muzzleClimb: 0,
      smokeProgress: 0,
      smokeAlpha: 0,
    };
  }

  const smooth = (edge0: number, edge1: number, x: number) => {
    const u = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
    return u * u * (3 - 2 * u);
  };

  // Timing shifts earlier by 0.12s when shooter doesn't have to plant a furketa first!
  const aimStart = hasFurketa ? 0.14 : 0.0;
  const panStart = hasFurketa ? 0.34 : 0.22;
  const blastStart = panStart + 0.1; // Exact +0.10s flint/match pan-to-muzzle ignition delay!
  const blastEnd = blastStart + 0.2;

  // 1. Furketa plant (strictly 0 for modern M1624 lightened muskets!)
  const furketaPlant = hasFurketa
    ? smooth(0.0, 0.18, elapsedSec) * (1 - smooth(1.28, 1.72, elapsedSec))
    : 0;

  // 2. Shoulder stock & lean cheek onto sights
  const aimIn = smooth(aimStart, panStart, elapsedSec);
  const aimOut = 1 - smooth(hasFurketa ? 1.18 : 1.06, hasFurketa ? 1.65 : 1.52, elapsedSec);
  const aimWeight = aimIn * aimOut;
  const headLean = aimWeight * (hasFurketa ? 0.24 : 0.27);

  // 3. Matchcord dips onto priming pan
  const matchDip =
    smooth(panStart - 0.06, panStart + 0.02, elapsedSec) *
    (1 - smooth(blastStart + 0.02, blastStart + 0.18, elapsedSec));

  // 4. Priming pan flash
  let panFlash = 0;
  if (elapsedSec >= panStart && elapsedSec <= panStart + 0.14) {
    const u = (elapsedSec - panStart) / 0.14;
    panFlash = Math.sin(u * Math.PI);
  }

  // 5. Main barrel muzzle blast exactly +0.10s after pan ignition (unless misfire!)
  let muzzleFlash = 0;
  if (!isMisfire && elapsedSec >= blastStart && elapsedSec <= blastEnd) {
    const u = (elapsedSec - blastStart) / (blastEnd - blastStart);
    muzzleFlash = Math.pow(Math.sin(u * Math.PI), 0.7);
  }

  // 6. Full-torso recoil kick & offhand muzzle climb
  let recoilKick = 0;
  let muzzleClimb = 0;
  if (!isMisfire && elapsedSec >= blastStart && elapsedSec <= blastStart + 0.72) {
    const dtKick = elapsedSec - blastStart;
    const attack = smooth(0, 0.055, dtKick);
    const decay = Math.exp(-dtKick * (hasFurketa ? 4.4 : 4.9));
    recoilKick = attack * decay;
    // Freehand M1624 climbs sharply upward without a rest fork; braced furketa stays flatter
    muzzleClimb = recoilKick * (hasFurketa ? 0.14 : 0.34);
  } else if (isMisfire && elapsedSec >= panStart + 0.04 && elapsedSec <= panStart + 0.5) {
    const dtFlinch = elapsedSec - (panStart + 0.04);
    recoilKick = smooth(0, 0.08, dtFlinch) * Math.exp(-dtFlinch * 6.5) * 0.32;
    muzzleClimb = recoilKick * 0.12;
  }

  // 7. Dense white black-powder smoke cloud
  let smokeProgress = 0;
  let smokeAlpha = 0;
  const smokeStart = isMisfire ? panStart + 0.02 : blastStart;
  const smokeDur = isMisfire ? 0.72 : 1.24;
  if (elapsedSec >= smokeStart && elapsedSec <= smokeStart + smokeDur) {
    smokeProgress = (elapsedSec - smokeStart) / smokeDur;
    const fadeIn = smooth(0, 0.12, smokeProgress);
    const fadeOut = 1 - smooth(0.32, 1.0, smokeProgress);
    smokeAlpha = fadeIn * fadeOut * (isMisfire ? 0.52 : 0.94);
  }

  let phase: FireSequenceSample["phase"] = "recoil_smoke";
  if (hasFurketa && elapsedSec < 0.18) phase = "plant_furketa";
  else if (elapsedSec < panStart) phase = "shoulder_aim";
  else if (elapsedSec < blastStart) phase = "pan_flash";
  else if (!isMisfire && elapsedSec < blastEnd) phase = "muzzle_blast";

  return {
    phase,
    furketaPlant,
    aimWeight,
    headLean,
    matchDip,
    panFlash,
    muzzleFlash,
    recoilKick,
    muzzleClimb,
    smokeProgress,
    smokeAlpha,
  };
}

export interface SwedishRigPose {
  state: SwedishActionState;
  time: number;
  stridePhase: number;
  /** Whether the unit is currently using a furketa rest fork */
  hasFurketa: boolean;
  /** 0..1 reload cycle phase (drives paper-cartridge bite -> ramrod drive) */
  reloadCycle: number;
  /** Root center-of-gravity offsets in canvas pixels */
  rootX: number;
  rootY: number;
  /** Torso lean (radians; negative = leaning back in recoil, positive = leaning forward) */
  torsoAngle: number;
  /** Subtle breathing chest expansion (px) */
  chestLift: number;
  /** Head pitch & idle look-around yaw offset */
  headAngle: number;
  headLookX: number;
  /** Leg joint angles (radians; 0 = vertical down) */
  backHip: number;
  backKnee: number;
  frontHip: number;
  frontKnee: number;
  /** Weapon hold target coordinates in torso-local space & barrel angle */
  weaponX: number;
  weaponY: number;
  weaponAngle: number;
  /** Furketa fork rest planting factor (0..1) and tilt */
  furketaPlant: number;
  furketaAngle: number;
  /** Firing drill VFX intensities */
  fireSample: FireSequenceSample;
  /** Hit-flash alpha (0..1) */
  hitFlash: number;
  /** Collapse angle (0 = upright, 1 = fallen) */
  collapseWeight: number;
  /** Secondary motion physics channels */
  apostleSwing: number;
  apostleVel: number;
  coatHemSwing: number;
  coatHemVel: number;
  cloakSwing: number;
  cloakVel: number;
  plumeSwing: number;
  plumeVel: number;
  /** Shifting specular offset (-1..1) across metallic surfaces */
  specularShift: number;
}

export interface SwedishRigState {
  seed: number;
  pose: SwedishRigPose;
  prevState: SwedishActionState;
  prevRootX: number;
  prevTorsoAngle: number;
}

export function createSwedishRigState(seed = 0, hasFurketa = false): SwedishRigState {
  return {
    seed,
    prevState: "idle",
    prevRootX: 0,
    prevTorsoAngle: 0,
    pose: {
      state: "idle",
      time: seed * 1.37,
      stridePhase: seed * 2.1,
      hasFurketa,
      reloadCycle: 0,
      rootX: 0,
      rootY: 0,
      torsoAngle: 0,
      chestLift: 0,
      headAngle: 0,
      headLookX: 0,
      backHip: -0.07,
      backKnee: 0.08,
      frontHip: 0.08,
      frontKnee: 0.06,
      weaponX: 12,
      weaponY: -15,
      weaponAngle: -0.16,
      furketaPlant: 0,
      furketaAngle: 0.14,
      fireSample: evaluateFireSequence(null, false, hasFurketa),
      hitFlash: 0,
      collapseWeight: 0,
      apostleSwing: 0,
      apostleVel: 0,
      coatHemSwing: 0,
      coatHemVel: 0,
      cloakSwing: 0,
      cloakVel: 0,
      plumeSwing: 0,
      plumeVel: 0,
      specularShift: 0,
    },
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function resolveActionState(input: SwedishAnimInput): SwedishActionState {
  if (input.isDead) return "collapse";
  if (input.fireElapsedSec !== null && input.fireElapsedSec >= 0 && input.fireElapsedSec <= 1.78) {
    if (input.fireKind === "melee") return "melee";
    return input.fireMisfired ? "misfire" : "fire";
  }
  if (input.hitElapsedSec !== null && input.hitElapsedSec >= 0 && input.hitElapsedSec < 0.72) {
    return "hit";
  }
  if (input.isMoving) return "march";
  if (input.isReloading) return "reload";
  if (input.isOverwatch) return "overwatch";
  return "idle";
}

/**
 * Advances the skeletal state machine and damped secondary-motion springs by `rawDt` seconds.
 * All computations mutate `rig.pose` in-place (zero allocations inside rAF loop).
 */
export function stepSwedishRig(
  rig: SwedishRigState,
  input: SwedishAnimInput,
  rawDt: number,
): SwedishRigPose {
  const dt = Math.max(0.001, Math.min(0.05, rawDt));
  const p = rig.pose;
  p.time += dt;
  const t = p.time;

  const hasFurketa = Boolean(input.hasFurketa);
  p.hasFurketa = hasFurketa;

  const state = resolveActionState(input);
  p.state = state;

  // Target joint pose for the active state
  let targetRootX = 0;
  let targetRootY = input.inCover ? 7 : 0;
  let targetTorso = input.inCover ? 0.08 : 0.025;
  let targetChest = Math.sin(t * 2.35 + rig.seed) * 2.2;
  let targetHeadAngle = Math.sin(t * 1.15 + rig.seed) * 0.04;
  // Occasional slow guard look-around in idle
  const lookWave = Math.sin(t * 0.65 + rig.seed * 1.9);
  let targetHeadLookX = Math.abs(lookWave) > 0.7 ? Math.sign(lookWave) * 2.8 : 0;
  let targetBackHip = -0.08;
  let targetBackKnee = 0.09;
  let targetFrontHip = 0.09;
  let targetFrontKnee = 0.07;
  // Modern lightened musket held higher & closer at port-arms; heavy furketa musket rests slightly lower
  let targetWeaponX = hasFurketa ? 14 : 11;
  let targetWeaponY = hasFurketa ? -14 : -17;
  let targetWeaponAngle = hasFurketa ? -0.14 : -0.22;
  let targetFurketaPlant = 0;
  let targetFurketaAngle = 0.16;
  let targetCollapse = 0;

  let fireSample = evaluateFireSequence(null, false, hasFurketa);
  let externalImpulse = 0;

  if (state === "march") {
    p.stridePhase += dt * 7.8;
    const s = p.stridePhase;
    const strideSin = Math.sin(s);
    const strideCos = Math.cos(s);
    // Biomechanical center-of-gravity bob: lowest on foot strike, highest at passing mid-stance
    targetRootY = -Math.abs(strideCos) * 7.5 + 3.2;
    targetTorso = 0.13 + Math.sin(s * 2) * 0.035;
    targetChest = Math.sin(s * 2) * 1.6;
    targetHeadAngle = -0.04 + Math.cos(s * 2) * 0.025;
    targetHeadLookX = 1.6;
    targetFrontHip = strideSin * 0.48;
    targetFrontKnee = Math.max(0.05, -strideCos * 0.56 + 0.14);
    targetBackHip = -strideSin * 0.48;
    targetBackKnee = Math.max(0.05, strideCos * 0.56 + 0.14);
    // Modern M1624 carried crisply at port-arms; heavy furketa musket sways lower with fork
    targetWeaponX = (hasFurketa ? 11 : 9) - strideSin * 3.8;
    targetWeaponY = (hasFurketa ? -16 : -20) + Math.abs(strideCos) * 2.4;
    targetWeaponAngle = (hasFurketa ? -0.24 : -0.34) + strideSin * 0.075;
    targetFurketaPlant = 0;
    targetFurketaAngle = 0.26 - strideSin * 0.12;
  } else if (state === "fire" || state === "misfire") {
    fireSample = evaluateFireSequence(input.fireElapsedSec, state === "misfire", hasFurketa);
    const recoil = fireSample.recoilKick;
    const aim = fireSample.aimWeight;
    const climb = fireSample.muzzleClimb;

    targetRootX = -recoil * (hasFurketa ? 11.5 : 9.2);
    targetRootY = (input.inCover ? 8 : 3) + aim * (hasFurketa ? 3.5 : 2.5) - recoil * 2.0;
    // Lean into stock while aiming, then snap backward with full-torso black-powder recoil
    targetTorso = aim * (hasFurketa ? 0.16 : 0.19) - recoil * (hasFurketa ? 0.44 : 0.36);
    targetHeadAngle = fireSample.headLean - recoil * 0.22;
    targetHeadLookX = 3.0 * aim;
    // Braced wide firing stance (offhand M1624 leans forward slightly more into front leg)
    targetBackHip = (hasFurketa ? -0.24 : -0.27) - recoil * 0.08;
    targetBackKnee = 0.18;
    targetFrontHip = hasFurketa ? 0.28 : 0.31;
    targetFrontKnee = hasFurketa ? 0.24 : 0.27;
    // Offhand M1624 raises higher to cheek & climbs sharply on recoil; furketa musket stays anchored lower
    targetWeaponX = (hasFurketa ? 18 : 15) + aim * 7 - recoil * (hasFurketa ? 11 : 9.5);
    targetWeaponY = (hasFurketa ? -21 : -27) - aim * 6 - recoil * (hasFurketa ? 2.5 : 5.5);
    targetWeaponAngle = lerp(hasFurketa ? -0.14 : -0.22, -0.02, aim) - climb;
    targetFurketaPlant = hasFurketa ? fireSample.furketaPlant : 0;
    targetFurketaAngle = lerp(0.16, 0.02, targetFurketaPlant) - recoil * 0.04;
    if (recoil > 0.42) {
      externalImpulse = recoil * 18;
    }
  } else if (state === "melee") {
    const me = input.fireElapsedSec ?? 0;
    const slash = Math.sin(Math.min(1, me / 0.58) * Math.PI);
    targetRootX = slash * 15;
    targetRootY = 2 - slash * 4;
    targetTorso = 0.28 * slash;
    targetHeadAngle = 0.1 * slash;
    targetHeadLookX = 3.0;
    targetBackHip = -0.32 * slash - 0.08;
    targetFrontHip = 0.36 * slash + 0.08;
    targetFrontKnee = 0.22;
    targetWeaponX = 14 + slash * 18;
    targetWeaponY = -18 + slash * 8;
    targetWeaponAngle = -0.65 + slash * 1.15;
  } else if (state === "reload") {
    // Distinct 1648 reload:
    // - Modern M1624 (paper cartridges): faster rhythmic bite cartridge -> ram down barrel
    // - Heavy furketa musket: tilt barrel beside planted furketa, pour powder from apostle
    const cycleRate = hasFurketa ? 3.8 : 4.8;
    p.reloadCycle = ((t * cycleRate * 0.25 + rig.seed * 0.1) % 1 + 1) % 1;
    const cycle = Math.sin(t * cycleRate + rig.seed);
    targetRootY = input.inCover ? 8 : 2;
    targetTorso = 0.1 + cycle * 0.045;
    targetHeadAngle = (hasFurketa ? 0.16 : 0.21) + cycle * 0.05;
    targetHeadLookX = 1.8;
    targetWeaponX = hasFurketa ? 16 : 18;
    targetWeaponY = -6 + cycle * 3.5;
    targetWeaponAngle = (hasFurketa ? -0.92 : -1.08) + cycle * 0.08;
    targetFurketaPlant = hasFurketa ? 0.55 : 0;
    targetFurketaAngle = 0.08;
  } else if (state === "overwatch") {
    // Prepared volley stance: either braced offhand at shoulder OR resting on planted furketa
    targetRootY = input.inCover ? 8 : 3;
    targetTorso = (hasFurketa ? 0.12 : 0.15) + Math.sin(t * 2.1 + rig.seed) * 0.015;
    targetHeadAngle = hasFurketa ? 0.14 : 0.18;
    targetHeadLookX = 2.6;
    targetBackHip = -0.2;
    targetBackKnee = 0.15;
    targetFrontHip = 0.24;
    targetFrontKnee = 0.2;
    targetWeaponX = hasFurketa ? 21 : 17;
    targetWeaponY = hasFurketa ? -22 : -29;
    targetWeaponAngle = -0.03;
    targetFurketaPlant = hasFurketa ? 0.94 : 0;
    targetFurketaAngle = 0.03;
  } else if (state === "hit") {
    const he = input.hitElapsedSec ?? 0;
    const stun = Math.exp(-he * 4.2);
    targetRootX = -stun * 11;
    targetRootY = stun * 4;
    targetTorso = -0.36 * stun;
    targetHeadAngle = -0.28 * stun;
    targetWeaponX = 6;
    targetWeaponY = -10;
    targetWeaponAngle = 0.22 * stun;
    externalImpulse = stun * 14;
  } else if (state === "collapse") {
    const ce = input.collapseElapsedSec ?? 0.5;
    const u = Math.min(1, ce / 0.55);
    targetCollapse = u * u * (3 - 2 * u);
    targetRootY = 26 * targetCollapse;
    targetTorso = -1.25 * targetCollapse;
    targetHeadAngle = -0.4 * targetCollapse;
    targetBackHip = 0.35 * targetCollapse;
    targetFrontHip = -0.2 * targetCollapse;
    targetWeaponAngle = 0.55 * targetCollapse;
  }

  // Smooth blend factor (snappy on fire/hit/melee, silky on idle/march/reload)
  const blendRate =
    state === "fire" || state === "misfire" || state === "hit" || state === "melee"
      ? 23
      : state === "march"
        ? 16
        : 9.5;
  const alpha = 1 - Math.exp(-blendRate * dt);

  p.rootX = lerp(p.rootX, targetRootX, alpha);
  p.rootY = lerp(p.rootY, targetRootY, alpha);
  p.torsoAngle = lerp(p.torsoAngle, targetTorso, alpha);
  p.chestLift = lerp(p.chestLift, targetChest, alpha);
  p.headAngle = lerp(p.headAngle, targetHeadAngle, alpha);
  p.headLookX = lerp(p.headLookX, targetHeadLookX, alpha);
  p.backHip = lerp(p.backHip, targetBackHip, alpha);
  p.backKnee = lerp(p.backKnee, targetBackKnee, alpha);
  p.frontHip = lerp(p.frontHip, targetFrontHip, alpha);
  p.frontKnee = lerp(p.frontKnee, targetFrontKnee, alpha);
  p.weaponX = lerp(p.weaponX, targetWeaponX, alpha);
  p.weaponY = lerp(p.weaponY, targetWeaponY, alpha);
  p.weaponAngle = lerp(p.weaponAngle, targetWeaponAngle, alpha);
  p.furketaPlant = hasFurketa ? lerp(p.furketaPlant, targetFurketaPlant, alpha) : 0;
  p.furketaAngle = lerp(p.furketaAngle, targetFurketaAngle, alpha);
  p.collapseWeight = lerp(p.collapseWeight, targetCollapse, alpha);
  p.fireSample = fireSample;

  p.hitFlash =
    input.hitElapsedSec !== null && input.hitElapsedSec >= 0 && input.hitElapsedSec < 0.75
      ? Math.pow(1 - input.hitElapsedSec / 0.75, 1.6)
      : 0;

  // --- Secondary Motion Physics (Damped Harmonic Oscillators) ---
  // Sudden stop from march -> coat hem & cloak whip forward from inertia!
  if (rig.prevState === "march" && state !== "march") {
    externalImpulse += 12;
  }
  const torsoAngularVel = (p.torsoAngle - rig.prevTorsoAngle) / dt;
  const rootHorizVel = (p.rootX - rig.prevRootX) / dt;
  const wind = Math.max(0.4, input.windStrength);
  const ambientWind =
    (Math.sin(t * 2.6 + rig.seed) * 0.65 + Math.sin(t * 5.1 + rig.seed * 2.3) * 0.35) *
    wind;

  // 1. 12 Apostles powder flasks swinging with stride lag & torso acceleration
  const apostleDrive =
    (state === "march" ? Math.sin(p.stridePhase - 0.65) * 9.5 : 0) -
    torsoAngularVel * 2.2 -
    rootHorizVel * 0.12 +
    ambientWind * 0.9;
  p.apostleVel += (apostleDrive - p.apostleSwing * 28 - p.apostleVel * 5.2) * dt;
  p.apostleSwing = Math.max(-0.52, Math.min(0.52, p.apostleSwing + p.apostleVel * dt));

  // 2. Lower wool coat hem (šosy kabátce) rippling during walk & whipping forward on stop/recoil
  const hemDrive =
    (state === "march" ? Math.sin(p.stridePhase - 0.9) * 7.5 : 0) +
    externalImpulse * 0.9 -
    torsoAngularVel * 3.1 +
    ambientWind * 1.4;
  p.coatHemVel += (hemDrive - p.coatHemSwing * 22 - p.coatHemVel * 4.4) * dt;
  p.coatHemSwing = Math.max(-0.55, Math.min(0.65, p.coatHemSwing + p.coatHemVel * dt));

  // 3. Heavy circular wool cloak (kapp) billowing behind soldier
  const cloakDrive =
    (state === "march" ? -6.5 + Math.sin(p.stridePhase - 1.1) * 4.5 : 0) +
    externalImpulse * 1.15 +
    ambientWind * 3.8;
  p.cloakVel += (cloakDrive - p.cloakSwing * 14 - p.cloakVel * 3.2) * dt;
  p.cloakSwing = Math.max(-0.75, Math.min(0.85, p.cloakSwing + p.cloakVel * dt));

  // 4. Jointed ostrich plume & ribbons fluttering in wind + head inertia
  const plumeDrive =
    ambientWind * 6.5 -
    torsoAngularVel * 2.6 +
    (state === "march" ? Math.sin(p.stridePhase - 0.45) * 5.2 : 0);
  p.plumeVel += (plumeDrive - p.plumeSwing * 26 - p.plumeVel * 4.0) * dt;
  p.plumeSwing = Math.max(-0.48, Math.min(0.48, p.plumeSwing + p.plumeVel * dt));

  // 5. Shifting metallic specular sheen across cuirass, morion, zischägge & brass buckles
  p.specularShift = Math.max(
    -1,
    Math.min(1, p.torsoAngle * 2.4 + Math.sin(t * 1.8 + rig.seed) * 0.18),
  );

  rig.prevState = state;
  rig.prevRootX = p.rootX;
  rig.prevTorsoAngle = p.torsoAngle;

  return p;
}
