/**
 * Mission 3, Doutnák: the night of 27/28 July 1648.
 * One waxed cord, one cart lane, one skiff. The store cooks off only when
 * the spark enters the door. A shot on a single keg does not.
 *
 * One tile is 1.6 m, same as Mission 2. The bridge is not a path.
 */
import {
  applyDamageToUnit,
  bresenham3D,
  checkLineOfSight3D,
  computeEnemyAiDecision,
  isAdjacentForMelee,
  isUnitFighting,
  type EnemyAiDecision,
} from "./CombatSystem";
import { applyPowderBlast } from "./explosions";
import { makeScenarioUnit, paintScenarioTile } from "./missionHelpers";
import {
  coordKey,
  GridSystem,
  MELEE_CATALOG,
  sameCoord,
  soldierMovePerAp,
  WEAPON_CATALOG,
} from "./GridSystem";
import type {
  CardinalDir,
  FloorLevel,
  GridCoord,
  TileData,
  UnitData,
} from "./types";

export const PLACHY_ID = "player-plachy";
export const HAVEL_ID = "player-havel";
export const ONDREJ_ID = "player-ondrej";
export const ZAK1_ID = "player-zak-1";
export const ZAK2_ID = "player-zak-2";
export const GUNNER_ID = "enemy-gunner";
export const BEARER_ID = "enemy-bearer-1";

export const STORE_DOOR: GridCoord = { x: 12, y: 0, z: 10 };
export const LANE: GridCoord[] = [{ x: 16, y: 0, z: 8 }];
export const GATE: GridCoord = { x: 17, y: 0, z: 8 };
export const SHOULDER: GridCoord = { x: 16, y: 0, z: 9 };
export const MUZZLE: GridCoord = { x: 17, y: 0, z: 10 };
export const ROPE_FOOT: GridCoord = { x: 8, y: 0, z: 12 };
export const ROPE_HEAD: GridCoord = { x: 8, y: 1, z: 12 };
export const STAIR_FOOT: GridCoord = { x: 10, y: 0, z: 12 };
export const STAIR_HEAD: GridCoord = { x: 10, y: 1, z: 12 };
export const RELIEF_WEST: GridCoord = { x: 8, y: 0, z: 15 };
export const RELIEF_SOUTH: GridCoord = { x: 12, y: 0, z: 15 };
export const RELIEF_INNER_WEST: GridCoord = { x: 8, y: 0, z: 14 };
export const RELIEF_INNER_SOUTH: GridCoord = { x: 12, y: 0, z: 14 };

export const MAX_CORD = 6;
export const SPARK_STEP = 2;
export const DELIVERY_LIMIT = 3;
export const CANISTER_DAMAGE = 7;
export const CANISTER_SHRED = 1;

export type ConeId = "lane" | "court" | "cord";
export type Mission3Loss = "delivery" | "plachy" | "wiped" | null;
export type ClimbKind = "stair" | "rope" | "down";

export const CONES: Record<ConeId, GridCoord[]> = {
  lane: [
    { x: 16, y: 0, z: 8 },
    { x: 15, y: 0, z: 8 },
    { x: 15, y: 0, z: 9 },
    { x: 14, y: 0, z: 8 },
    { x: 14, y: 0, z: 9 },
  ],
  court: [
    { x: 16, y: 0, z: 11 },
    { x: 15, y: 0, z: 11 },
    { x: 15, y: 0, z: 12 },
    { x: 14, y: 0, z: 11 },
    { x: 14, y: 0, z: 12 },
    { x: 13, y: 0, z: 12 },
    { x: 16, y: 0, z: 10 },
  ],
  cord: [
    { x: 16, y: 0, z: 10 },
    { x: 15, y: 0, z: 10 },
    { x: 14, y: 0, z: 10 },
    { x: 13, y: 0, z: 10 },
    { x: 12, y: 0, z: 10 },
    { x: 11, y: 0, z: 10 },
    { x: 15, y: 0, z: 9 },
    { x: 15, y: 0, z: 11 },
  ],
};

export interface CampaignState {
  oath: {
    havel: "accept" | "refuse" | "fallen";
    ondrej: "accept" | "refuse" | "fallen";
  } | null;
  /** Mission 1 Iron Vigil hero id, if that night produced a survivor. Never spawned here. */
  mission1SurvivorId: string | null;
}

export const TITLE_PRESET_OATH = {
  havel: "accept",
  ondrej: "accept",
} as const;

export interface Mission3Clock {
  silent: boolean;
  silenceBrokenOnRound: number | null;
  cord: GridCoord[];
  lit: boolean;
  sparkIndex: number;
  cookedOff: boolean;
  deliveries: number;
  cart: { bearerId: string; laneIndex: number } | null;
  spawnQueued: boolean;
  nextBearerSerial: number;
  stamperIds: string[];
  stampTile: GridCoord | null;
  cone: ConeId | null;
  coneWarned: boolean;
  coneFired: boolean;
  reliefDoor: "west" | "south" | null;
  reliefSpawned: boolean;
  stairProgress: Record<string, number>;
  climbArmedId: string | null;
  climbKind: ClimbKind | null;
  loss: Mission3Loss;
}

export interface Mission3Judgement {
  outcome: "ongoing" | "victory" | "defeat";
  victoryReason: "skiff" | null;
  loss: Mission3Loss;
}

export interface TurnStep {
  clock: Mission3Clock;
  units: UnitData[];
}

const TORCHES: GridCoord[] = [
  { x: 16, y: 0, z: 10 },
  { x: 11, y: 0, z: 14 },
];

const HOLD: EnemyAiDecision = {
  movePath: [],
  moveApCost: 0,
  targetId: null,
  doorToOpen: null,
  isCaptureAction: false,
};

export function isPowderYardRoofed(x: number, y: number, z: number): boolean {
  const store = y <= 1 && x >= 13 && x <= 15 && z >= 8 && z <= 9;
  const lodge = y === 1 && x >= 8 && x <= 15 && z >= 12 && z <= 14;
  const soffit = y === 0 && x >= 8 && x <= 15 && z >= 12 && z <= 14;
  return store || lodge || soffit;
}

export function isYardScar(c: GridCoord): boolean {
  if (c.y === 0 && c.x >= 7 && c.x <= 17 && c.z >= 8 && c.z <= 15) return true;
  if (c.y === 1 && c.x >= 8 && c.x <= 15 && c.z >= 12 && c.z <= 14) return true;
  return false;
}

/** Chebyshev 1 around the two yard torches. The skiff lantern is not a ring. */
export function isTorchRing(coord: GridCoord): boolean {
  return TORCHES.some(
    (torch) =>
      torch.y === coord.y &&
      Math.max(Math.abs(torch.x - coord.x), Math.abs(torch.z - coord.z)) <= 1,
  );
}

function copyCoord(c: GridCoord): GridCoord {
  return { x: c.x, y: c.y, z: c.z };
}

function orthogonal(a: GridCoord, b: GridCoord): boolean {
  return a.y === b.y && Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1;
}

function chebyshev(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

function livingAt(units: UnitData[], coord: GridCoord, ignoreId?: string): boolean {
  return units.some(
    (unit) =>
      unit.id !== ignoreId &&
      isUnitFighting(unit) &&
      sameCoord(unit.pos, coord),
  );
}

function onLodge(c: GridCoord): boolean {
  return c.y === 1 && c.x >= 8 && c.x <= 15 && c.z >= 12 && c.z <= 14;
}

function cartTile(clock: Mission3Clock): GridCoord | null {
  if (!clock.cart) return null;
  return LANE[clock.cart.laneIndex] ?? LANE[0]!;
}

export function freshClock(): Mission3Clock {
  return {
    silent: true,
    silenceBrokenOnRound: null,
    cord: [],
    lit: false,
    sparkIndex: 0,
    cookedOff: false,
    deliveries: 0,
    cart: { bearerId: BEARER_ID, laneIndex: 0 },
    spawnQueued: false,
    nextBearerSerial: 2,
    stamperIds: [],
    stampTile: null,
    cone: null,
    coneWarned: false,
    coneFired: false,
    reliefDoor: null,
    reliefSpawned: false,
    stairProgress: {},
    climbArmedId: null,
    climbKind: null,
    loss: null,
  };
}

const paint = (
  grid: GridSystem,
  x: number,
  y: FloorLevel,
  z: number,
  surface: "cobble" | "stone_floor" | "water" | "wood_dock",
  walkable: boolean,
): void => paintScenarioTile(grid, x, y, z, surface, walkable, true);

function wall(grid: GridSystem, x: number, z: number): void {
  paint(grid, x, 0, z, "cobble", false);
  grid.setObstacle({ x, y: 0, z }, "high_wall");
}

export function createMission3Grid(): GridSystem {
  const grid = new GridSystem();
  grid.setRoofMask(isPowderYardRoofed, "powder-yard");

  for (const tile of grid.getAllTiles()) {
    tile.hasFloor = false;
    tile.walkable = false;
    tile.obstacle = "none";
    tile.isEscapeZone = false;
    tile.surface = "cobble";
    tile.smokeTurns = 0;
    tile.damageLevel = 0;
  }

  for (let x = 4; x <= 5; x++) {
    for (let z = 8; z <= 14; z++) paint(grid, x, 0, z, "water", false);
  }

  for (const [x, z] of [
    [6, 9],
    [6, 10],
  ] as const) {
    paint(grid, x, 0, z, "wood_dock", true);
    const tile = grid.getTile({ x, y: 0, z });
    if (tile) tile.isEscapeZone = true;
  }

  for (let x = 7; x <= 17; x++) {
    for (let z = 8; z <= 15; z++) paint(grid, x, 0, z, "cobble", true);
  }

  for (const [x, z] of [
    [13, 8],
    [14, 8],
    [15, 8],
    [13, 9],
    [14, 9],
    [15, 9],
  ] as const) {
    paint(grid, x, 0, z, "stone_floor", true);
  }

  for (const [x, z] of [
    [8, 9],
    [9, 9],
    [10, 9],
    [11, 9],
    [12, 9],
    [10, 11],
    [11, 11],
    [12, 11],
    [12, 8],
    [13, 7],
    [14, 7],
    [15, 7],
    [16, 7],
    [13, 10],
    [9, 15],
    [10, 15],
    [11, 15],
    [13, 15],
    [14, 15],
    [15, 15],
  ] as const) {
    wall(grid, x, z);
  }

  grid.setObstacle({ x: 15, y: 0, z: 10 }, "pillar");
  grid.setObstacle({ x: 11, y: 0, z: 13 }, "pillar");
  grid.setObstacle({ x: 16, y: 0, z: 12 }, "low_wall");
  grid.setObstacle({ x: 17, y: 0, z: 11 }, "low_wall");

  for (let x = 8; x <= 15; x++) {
    for (let z = 12; z <= 14; z++) paint(grid, x, 1, z, "stone_floor", true);
  }

  grid.sealedDoorIds.add("relief-west");
  grid.sealedDoorIds.add("relief-south");
  grid.setDoor({
    id: "relief-west",
    coord: copyCoord(RELIEF_WEST),
    state: "closed",
    axis: "E_W",
    label: "Západní vrata",
  });
  grid.setDoor({
    id: "relief-south",
    coord: copyCoord(RELIEF_SOUTH),
    state: "closed",
    axis: "E_W",
    label: "Jižní vrata",
  });

  grid.bakeCoverFromObstacles();
  return grid;
}

const blankUnit = makeScenarioUnit;

function makeBearer(id: string, pos: GridCoord): UnitData {
  const gun = WEAPON_CATALOG.swedish_musket!;
  return blankUnit({
    id,
    name: "Nosič",
    roleTitle: "Nosič",
    faction: "enemy",
    archetype: "ranger",
    pos,
    facing: "W",
    hp: 6,
    armor: 0,
    movePerAp: soldierMovePerAp(gun),
    weapon: gun,
    melee: MELEE_CATALOG.swedish_musket_butt,
    attachedToCart: true,
  });
}

function makeSwede(
  id: string,
  name: string,
  pos: GridCoord,
  facing: CardinalDir,
  hp: number,
): UnitData {
  const gun = WEAPON_CATALOG.swedish_musket!;
  return blankUnit({
    id,
    name,
    roleTitle: name,
    faction: "enemy",
    archetype: "trooper",
    pos,
    facing,
    hp,
    armor: 0,
    movePerAp: soldierMovePerAp(gun),
    weapon: gun,
    melee: MELEE_CATALOG.swedish_musket_butt,
  });
}

export function createMission3Units(campaign: CampaignState): UnitData[] {
  const oath = campaign.oath ?? TITLE_PRESET_OATH;
  const pistol = WEAPON_CATALOG.plachy_pistol!;
  const havelGun = WEAPON_CATALOG.havel_pistol!;
  const ondrejGun = WEAPON_CATALOG.ondrej_pistol!;
  const seat0 =
    oath.havel === "accept"
      ? blankUnit({
          id: HAVEL_ID,
          name: "Havel Řezáč",
          roleTitle: "Řezník od brány",
          faction: "player",
          archetype: "ranger",
          pos: { x: 6, y: 0, z: 10 },
          facing: "E",
          hp: 11,
          armor: 0,
          movePerAp: 6,
          weapon: havelGun,
          melee: MELEE_CATALOG.butcher_cleaver,
        })
      : blankUnit({
          id: ZAK1_ID,
          name: "Žák Klementina",
          roleTitle: "Žák Klementina",
          faction: "player",
          archetype: "trooper",
          pos: { x: 6, y: 0, z: 10 },
          facing: "E",
          hp: 7,
          armor: 0,
          movePerAp: soldierMovePerAp(havelGun),
          weapon: havelGun,
          melee: MELEE_CATALOG.thief_knife,
        });
  const seat1 =
    oath.ondrej === "accept"
      ? blankUnit({
          id: ONDREJ_ID,
          name: "Ondřej Štěrba",
          roleTitle: "Zloděj střech a lan",
          faction: "player",
          archetype: "sniper",
          pos: { x: 7, y: 0, z: 10 },
          facing: "E",
          hp: 8,
          armor: 0,
          movePerAp: 7,
          weapon: ondrejGun,
          melee: MELEE_CATALOG.thief_knife,
        })
      : blankUnit({
        id: ZAK2_ID,
        name: "Druhý žák Klementina",
        roleTitle: "Žák Klementina",
        faction: "player",
        archetype: "trooper",
        pos: { x: 7, y: 0, z: 10 },
        facing: "E",
        hp: 7,
        armor: 0,
        movePerAp: soldierMovePerAp(havelGun),
        weapon: havelGun,
        melee: MELEE_CATALOG.thief_knife,
      });

  return [
    blankUnit({
      id: PLACHY_ID,
      name: "Jiří Plachý",
      roleTitle: "Jezuitský páter",
      faction: "player",
      archetype: "commander",
      isVip: true,
      pos: { x: 6, y: 0, z: 9 },
      facing: "E",
      hp: 12,
      armor: 1,
      movePerAp: 7,
      weapon: pistol,
      melee: MELEE_CATALOG.thief_knife,
    }),
    seat0,
    seat1,
    makeBearer(BEARER_ID, copyCoord(SHOULDER)),
    makeSwede(GUNNER_ID, "Dělmistr", { x: 17, y: 0, z: 12 }, "W", 9),
    makeSwede("enemy-sentry-1", "Švédská hlídka", { x: 12, y: 0, z: 13 }, "S", 7),
    makeSwede("enemy-sentry-2", "Švédská hlídka", { x: 15, y: 0, z: 14 }, "W", 7),
  ];
}

function emptyCobble(
  grid: GridSystem,
  units: UnitData[],
  clock: Mission3Clock,
  tile: GridCoord,
  cord: GridCoord[],
): boolean {
  const found = grid.getTile(tile);
  if (!found || !found.walkable || found.surface !== "cobble" || found.obstacle !== "none") {
    return false;
  }
  if (livingAt(units, tile)) return false;
  const cart = cartTile(clock);
  if (cart && sameCoord(cart, tile)) return false;
  if (cord.some((laid) => sameCoord(laid, tile))) return false;
  return true;
}

export function layCord(
  clock: Mission3Clock,
  layer: UnitData,
  tiles: GridCoord[],
  grid: GridSystem,
  units: UnitData[],
): Mission3Clock | null {
  if (clock.cookedOff || layer.ap < 1 || !isUnitFighting(layer)) return null;
  const allowed = layer.id === ONDREJ_ID ? 2 : 1;
  if (tiles.length < 1 || tiles.length > allowed) return null;
  if (clock.cord.length + tiles.length > MAX_CORD) return null;

  const cord = clock.cord.map(copyCoord);
  let head: GridCoord | null = cord.length === 0 ? null : cord[cord.length - 1]!;
  for (let i = 0; i < tiles.length; i++) {
    const tile = copyCoord(tiles[i]!);
    if (i === 0 && !orthogonal(layer.pos, tile)) return null;
    if (head && !orthogonal(head, tile)) return null;
    if (!emptyCobble(grid, units, clock, tile, cord)) return null;
    cord.push(tile);
    head = tile;
  }
  return { ...clock, cord };
}

export function breakSilence(
  clock: Mission3Clock,
  grid: GridSystem,
  rng: () => number = Math.random,
  round: number | null = null,
): Mission3Clock {
  if (!clock.silent) return clock;
  const reliefDoor = rng() < 0.5 ? "west" : "south";
  const id = reliefDoor === "west" ? "relief-west" : "relief-south";
  const coord = reliefDoor === "west" ? RELIEF_WEST : RELIEF_SOUTH;
  grid.sealedDoorIds.delete(id);
  grid.setDoorState(coord, "open");
  return {
    ...clock,
    silent: false,
    silenceBrokenOnRound: round,
    reliefDoor,
  };
}

/** First light and relight. Relight continues from `sparkIndex` and does not splice the train. */
export function lightCord(
  clock: Mission3Clock,
  plachy: UnitData,
  grid: GridSystem,
  rng: () => number = Math.random,
): Mission3Clock | null {
  if (plachy.id !== PLACHY_ID) return null;
  if (plachy.ap < 1 || !isUnitFighting(plachy)) return null;
  if (clock.cookedOff || clock.lit || clock.cord.length === 0) return null;
  const spark = clock.cord[clock.sparkIndex];
  if (!spark || !isAdjacentForMelee(plachy.pos, spark)) return null;
  const lit: Mission3Clock = { ...clock, lit: true };
  return lit.silent ? breakSilence(lit, grid, rng) : lit;
}

/** Ribbon predicate. AP is the button's enabled state, not whether the verb exists. */
export function canLightCord(clock: Mission3Clock, plachy: UnitData): boolean {
  if (plachy.id !== PLACHY_ID || plachy.faction !== "player") return false;
  if (!isUnitFighting(plachy)) return false;
  if (clock.cookedOff || clock.lit || clock.cord.length === 0) return false;
  const spark = clock.cord[clock.sparkIndex];
  return !!spark && isAdjacentForMelee(plachy.pos, spark);
}

const LAY_STEPS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function layProbe(layer: UnitData): UnitData {
  return layer.ap > 0 ? layer : { ...layer, ap: 1 };
}

/** True when this soldier has at least one legal next cobble. */
export function canOfferCordLay(
  clock: Mission3Clock,
  layer: UnitData,
  grid: GridSystem,
  units: UnitData[],
): boolean {
  if (clock.cookedOff || layer.faction !== "player" || !isUnitFighting(layer)) {
    return false;
  }
  if (clock.cord.length >= MAX_CORD) return false;
  const probe = layProbe(layer);
  for (const [dx, dz] of LAY_STEPS) {
    const tile: GridCoord = { x: layer.pos.x + dx, y: layer.pos.y, z: layer.pos.z + dz };
    if (layCord(clock, probe, [tile], grid, units)) return true;
  }
  return false;
}

/**
 * Tiles a click on `hover` would lay. One tile for anyone. Ondřej may take
 * the straight or corner pair that ends on the hovered cobble.
 */
export function proposeCordLay(
  clock: Mission3Clock,
  layer: UnitData,
  hover: GridCoord,
  grid: GridSystem,
  units: UnitData[],
): GridCoord[] | null {
  if (layCord(clock, layer, [hover], grid, units)) return [copyCoord(hover)];
  if (layer.id !== ONDREJ_ID || clock.cord.length + 2 > MAX_CORD) return null;
  const pairs: GridCoord[][] = [];
  for (const [dx, dz] of LAY_STEPS) {
    const mid: GridCoord = { x: hover.x + dx, y: hover.y, z: hover.z + dz };
    if (layCord(clock, layer, [mid, hover], grid, units)) {
      pairs.push([copyCoord(mid), copyCoord(hover)]);
    }
  }
  if (pairs.length === 0) return null;
  pairs.sort((a, b) => {
    const da = chebyshev(a[0]!, STORE_DOOR);
    const db = chebyshev(b[0]!, STORE_DOOR);
    return da - db || a[0]!.x - b[0]!.x || a[0]!.z - b[0]!.z;
  });
  return pairs[0]!;
}

export function advanceSpark(clock: Mission3Clock): Mission3Clock {
  if (!clock.lit || clock.cookedOff || clock.cord.length === 0) return clock;
  let index = clock.sparkIndex;
  const head = clock.cord.length - 1;
  let cookedOff = false;
  for (let step = 0; step < SPARK_STEP && index < head; step++) {
    index += 1;
    const tile = clock.cord[index];
    if (tile && sameCoord(tile, STORE_DOOR)) {
      cookedOff = true;
      break;
    }
  }
  return { ...clock, sparkIndex: index, cookedOff };
}

export function applyStamp(clock: Mission3Clock, units: UnitData[]): Mission3Clock {
  if (!clock.lit || clock.cookedOff || !clock.stampTile) {
    return { ...clock, stamperIds: [], stampTile: null };
  }
  const tile = clock.stampTile;
  const stillThere = clock.stamperIds.some((id) => {
    const unit = units.find((candidate) => candidate.id === id);
    return !!unit && isUnitFighting(unit) && isAdjacentForMelee(unit.pos, tile);
  });
  if (!stillThere) return { ...clock, stamperIds: [], stampTile: null };
  return { ...clock, lit: false, stamperIds: [], stampTile: null };
}

function yardClip(coord: GridCoord, tile: TileData): boolean {
  if (!isYardScar(coord)) return false;
  if (tile.surface === "water") return false;
  if (tile.isEscapeZone) return false;
  return true;
}

const PUSH_STEPS: Array<[number, number]> = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, -1],
  [1, 1],
  [-1, -1],
  [-1, 1],
];

function tileOpen(grid: GridSystem, units: UnitData[], coord: GridCoord, ignoreId?: string): boolean {
  const tile = grid.getTile(coord);
  if (!tile || !tile.walkable) return false;
  return !livingAt(units, coord, ignoreId);
}

/** A living body left on the blast center steps to the first open tile farther from it. */
export function displaceFromPowderBlast(
  grid: GridSystem,
  units: UnitData[],
  center: GridCoord,
): UnitData[] {
  return units.map((unit) => {
    if (!isUnitFighting(unit) || !sameCoord(unit.pos, center)) return unit;
    const here = chebyshev(unit.pos, center);
    for (const [dx, dz] of PUSH_STEPS) {
      const dest: GridCoord = { x: unit.pos.x + dx, y: unit.pos.y, z: unit.pos.z + dz };
      if (chebyshev(dest, center) <= here) continue;
      if (!tileOpen(grid, units, dest, unit.id)) continue;
      return { ...unit, pos: dest };
    }
    return unit;
  });
}

export function displaceFromMelee(
  grid: GridSystem,
  units: UnitData[],
  attacker: UnitData,
  defenderId: string,
): UnitData[] {
  const defender = units.find((unit) => unit.id === defenderId);
  if (!defender || !isUnitFighting(defender)) return units;
  const dx = Math.sign(defender.pos.x - attacker.pos.x);
  const dz = Math.sign(defender.pos.z - attacker.pos.z);
  if (dx === 0 && dz === 0) return units;
  const dest: GridCoord = {
    x: defender.pos.x + dx,
    y: defender.pos.y,
    z: defender.pos.z + dz,
  };
  if (!tileOpen(grid, units, dest, defender.id)) return units;
  return units.map((unit) => (unit.id === defenderId ? { ...unit, pos: dest } : unit));
}

export function cookOff(grid: GridSystem, units: UnitData[], clock: Mission3Clock): TurnStep {
  for (const tile of grid.getAllTiles()) {
    if (!tile.hasFloor || !isYardScar(tile.coord) || tile.surface === "water") continue;
    grid.damageTile(tile.coord, 2);
  }

  const seeds: GridCoord[] = [copyCoord(STORE_DOOR)];
  const cart = cartTile(clock);
  if (cart) seeds.push(copyCoord(cart));
  for (const tile of grid.getAllTiles()) {
    if (tile.obstacle === "powder_keg" && isYardScar(tile.coord)) seeds.push(copyCoord(tile.coord));
  }

  const seen = new Set<string>();
  let nextUnits = units;
  for (const seed of seeds) {
    const key = coordKey(seed);
    if (seen.has(key)) continue;
    seen.add(key);
    const blasted = applyPowderBlast(grid, nextUnits, seed, {
      damage: 5,
      armorShred: 2,
      shockwave: false,
      clip: yardClip,
    });
    nextUnits = displaceFromPowderBlast(grid, blasted.nextUnits, seed);
  }

  for (const tile of grid.getAllTiles()) {
    if (!tile.hasFloor || !isYardScar(tile.coord) || tile.obstacle === "high_wall") continue;
    const turns = isPowderYardRoofed(tile.coord.x, tile.coord.y, tile.coord.z) ? 3 : 5;
    grid.addSmoke(tile.coord, 0, turns);
  }

  return {
    clock: { ...clock, cart: null, cookedOff: true },
    units: nextUnits,
  };
}

export function closePlayerTurn(
  clock: Mission3Clock,
  grid: GridSystem,
  units: UnitData[],
): TurnStep {
  const advanced = advanceSpark(clock);
  if (advanced.cookedOff && !clock.cookedOff) return cookOff(grid, units, advanced);
  return { clock: advanced, units };
}

export function dropCartAsKeg(clock: Mission3Clock, grid: GridSystem): Mission3Clock {
  if (!clock.cart) return clock;
  const tile = LANE[clock.cart.laneIndex] ?? LANE[0]!;
  const existing = grid.getTile(tile);
  if (existing && existing.obstacle !== "powder_keg") grid.setObstacle(tile, "powder_keg");
  return { ...clock, cart: null, spawnQueued: true };
}

/** Ribbon predicate. AP is the button's enabled state, not whether the verb exists. */
export function canCutTackle(
  clock: Mission3Clock,
  grid: GridSystem,
  ondrej: UnitData,
  units: UnitData[],
): boolean {
  if (ondrej.id !== ONDREJ_ID || !isUnitFighting(ondrej)) return false;
  const probe = ondrej.ap > 0 ? ondrej : { ...ondrej, ap: 1 };
  if (probe.pos.y !== 1 || !onLodge(probe.pos) || !clock.cart) return false;
  const bearer = units.find((unit) => unit.id === clock.cart!.bearerId);
  const seeBearer = bearer ? checkLineOfSight3D(grid, probe.pos, bearer.pos).clear : false;
  const seeCart = checkLineOfSight3D(grid, probe.pos, LANE[0]!).clear;
  return seeBearer || seeCart;
}

export function cutTackle(
  clock: Mission3Clock,
  grid: GridSystem,
  ondrej: UnitData,
  units: UnitData[],
  rng: () => number = Math.random,
): TurnStep | null {
  if (ondrej.id !== ONDREJ_ID) return null;
  if (ondrej.ap < 1 || !isUnitFighting(ondrej)) return null;
  if (ondrej.pos.y !== 1 || !onLodge(ondrej.pos) || !clock.cart) return null;
  const bearer = units.find((unit) => unit.id === clock.cart!.bearerId);
  const seeBearer = bearer ? checkLineOfSight3D(grid, ondrej.pos, bearer.pos).clear : false;
  const seeCart = checkLineOfSight3D(grid, ondrej.pos, LANE[0]!).clear;
  if (!seeBearer && !seeCart) return null;
  const dropped = dropCartAsKeg(clock, grid);
  const broken = dropped.silent ? breakSilence(dropped, grid, rng) : dropped;
  return {
    clock: broken,
    units: units.map((unit) =>
      unit.id === clock.cart!.bearerId ? { ...unit, attachedToCart: false } : unit,
    ),
  };
}

function courtSpot(grid: GridSystem, units: UnitData[], coord: GridCoord): boolean {
  if (coord.y !== 0 || coord.x < 7 || coord.x > 17 || coord.z < 8 || coord.z > 15) return false;
  if (sameCoord(coord, GATE)) return false;
  return tileOpen(grid, units, coord);
}

function findBearerSpot(grid: GridSystem, units: UnitData[]): GridCoord | null {
  const spots: GridCoord[] = [];
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const coord: GridCoord = { x: SHOULDER.x + dx, y: 0, z: SHOULDER.z + dz };
      if (courtSpot(grid, units, coord)) spots.push(coord);
    }
  }
  spots.sort(
    (a, b) => chebyshev(a, SHOULDER) - chebyshev(b, SHOULDER) || a.x - b.x || a.z - b.z,
  );
  return spots[0] ? copyCoord(spots[0]) : null;
}

function spawnBearer(clock: Mission3Clock, grid: GridSystem, units: UnitData[]): TurnStep {
  const spot = findBearerSpot(grid, units);
  if (!spot) return { clock, units };
  const id = `enemy-bearer-${clock.nextBearerSerial}`;
  return {
    clock: {
      ...clock,
      cart: { bearerId: id, laneIndex: 0 },
      nextBearerSerial: clock.nextBearerSerial + 1,
    },
    units: [...units, makeBearer(id, spot)],
  };
}

export function advanceCarts(
  clock: Mission3Clock,
  grid: GridSystem,
  units: UnitData[],
): TurnStep & { delivered: boolean } {
  if (clock.cookedOff) return { clock, units, delivered: false };
  let next = clock;
  let nextUnits = units;
  let delivered = false;

  if (next.spawnQueued && next.cart === null) {
    const spawned = spawnBearer(next, grid, nextUnits);
    next = spawned.clock;
    nextUnits = spawned.units;
  }

  if (next.cart) {
    const bearerId = next.cart.bearerId;
    const bearer = nextUnits.find((unit) => unit.id === bearerId);
    const pushing = !!bearer && isUnitFighting(bearer) && bearer.attachedToCart === true;
    if (!pushing) {
      next = { ...next, cart: null };
    } else if (next.cart.laneIndex + 1 === LANE.length) {
      next = { ...next, cart: null, deliveries: next.deliveries + 1 };
      nextUnits = nextUnits.filter((unit) => unit.id !== bearerId);
      delivered = true;
    } else {
      const lane = LANE[next.cart.laneIndex + 1]!;
      const shoulder: GridCoord = { x: lane.x, y: lane.y, z: lane.z + 1 };
      next = { ...next, cart: { bearerId, laneIndex: next.cart.laneIndex + 1 } };
      nextUnits = nextUnits.map((unit) =>
        unit.id === bearerId ? { ...unit, pos: shoulder } : unit,
      );
    }
  }

  next = { ...next, spawnQueued: next.cart === null };
  return { clock: next, units: nextUnits, delivered };
}

export function canisterHits(grid: GridSystem, origin: GridCoord, tile: GridCoord): boolean {
  const ray = bresenham3D(origin, tile);
  for (let i = 1; i < ray.length - 1; i++) {
    const cell = ray[i]!;
    const found = grid.getTile(cell);
    if (!found) return false;
    if (
      found.obstacle === "pillar" ||
      found.obstacle === "high_wall" ||
      grid.isDoorClosedAt(cell)
    ) {
      return false;
    }
  }
  return true;
}

export function tilesHitByCanister(grid: GridSystem, cone: ConeId): GridCoord[] {
  return CONES[cone].filter((tile) => canisterHits(grid, MUZZLE, tile));
}

export function selectCone(grid: GridSystem, units: UnitData[]): ConeId {
  const players = units.filter((unit) => unit.faction === "player" && isUnitFighting(unit));
  const order: ConeId[] = ["lane", "court", "cord"];
  let best: ConeId = "lane";
  let bestCount = -1;
  for (const cone of order) {
    const count = tilesHitByCanister(grid, cone).filter((tile) =>
      players.some((unit) => sameCoord(unit.pos, tile)),
    ).length;
    if (count > bestCount) {
      best = cone;
      bestCount = count;
    }
  }
  return best;
}

export function applyCanister(
  grid: GridSystem,
  units: UnitData[],
  clock: Mission3Clock,
): TurnStep {
  if (!clock.cone) return { clock, units };
  const hitTiles = tilesHitByCanister(grid, clock.cone);
  const nextUnits = units.map((unit) => {
    if (!isUnitFighting(unit) || unit.pos.y >= 1) return unit;
    if (!hitTiles.some((tile) => sameCoord(tile, unit.pos))) return unit;
    return applyDamageToUnit(unit, CANISTER_DAMAGE, {
      armorShred: CANISTER_SHRED,
      shaken: true,
    });
  });
  for (const tile of hitTiles) {
    const found = grid.getTile(tile);
    if (!found || !found.hasFloor || found.surface === "water") continue;
    grid.damageTile(tile, 1);
  }
  return { clock, units: nextUnits };
}

export function armClimb(clock: Mission3Clock, unit: UnitData): Mission3Clock | null {
  if (unit.ap < 1 || !isUnitFighting(unit) || unit.faction !== "player") return null;
  if (clock.climbArmedId) return null;
  if (sameCoord(unit.pos, ROPE_FOOT)) {
    if (unit.id !== ONDREJ_ID) return null;
    return { ...clock, climbArmedId: unit.id, climbKind: "rope" };
  }
  if (sameCoord(unit.pos, STAIR_FOOT)) {
    return { ...clock, climbArmedId: unit.id, climbKind: "stair" };
  }
  if (sameCoord(unit.pos, ROPE_HEAD) || sameCoord(unit.pos, STAIR_HEAD)) {
    return { ...clock, climbArmedId: unit.id, climbKind: "down" };
  }
  return null;
}

function climbFoot(unit: UnitData, kind: ClimbKind): boolean {
  if (kind === "rope") return sameCoord(unit.pos, ROPE_FOOT);
  if (kind === "stair") return sameCoord(unit.pos, STAIR_FOOT);
  return sameCoord(unit.pos, ROPE_HEAD) || sameCoord(unit.pos, STAIR_HEAD);
}

function climbArrival(pos: GridCoord, kind: ClimbKind): GridCoord {
  if (kind === "rope") return copyCoord(ROPE_HEAD);
  if (kind === "stair") return copyCoord(STAIR_HEAD);
  if (sameCoord(pos, ROPE_HEAD)) return copyCoord(ROPE_FOOT);
  return copyCoord(STAIR_FOOT);
}

export function resolveClimbs(clock: Mission3Clock, units: UnitData[]): TurnStep {
  const id = clock.climbArmedId;
  const kind = clock.climbKind;
  const unit = id ? units.find((candidate) => candidate.id === id) : undefined;
  const ready = !!unit && !!kind && isUnitFighting(unit) && climbFoot(unit, kind);
  if (!ready || !unit || !kind || !id) {
    return {
      clock: { ...clock, stairProgress: {}, climbArmedId: null, climbKind: null },
      units,
    };
  }
  const next = (clock.stairProgress[id] ?? 0) + 1;
  const needed = kind === "stair" ? 2 : 1;
  if (next >= needed) {
    const dest = climbArrival(unit.pos, kind);
    return {
      clock: { ...clock, stairProgress: {}, climbArmedId: null, climbKind: null },
      units: units.map((candidate) =>
        candidate.id === id ? { ...candidate, pos: dest } : candidate,
      ),
    };
  }
  return {
    clock: {
      ...clock,
      stairProgress: { [id]: next },
      climbArmedId: null,
      climbKind: null,
    },
    units,
  };
}

function findReliefSpot(
  grid: GridSystem,
  units: UnitData[],
  prefs: GridCoord[],
  around: GridCoord,
): GridCoord | null {
  const queue: GridCoord[] = [...prefs];
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      queue.push({ x: around.x + dx, y: 0, z: around.z + dz });
    }
  }
  const seen = new Set<string>();
  for (const coord of queue) {
    const key = coordKey(coord);
    if (seen.has(key)) continue;
    seen.add(key);
    if (chebyshev(coord, around) > 2) continue;
    if (!courtSpot(grid, units, coord)) continue;
    return copyCoord(coord);
  }
  return null;
}

function spawnRelief(clock: Mission3Clock, grid: GridSystem, units: UnitData[]): TurnStep {
  if (!clock.reliefDoor || clock.reliefSpawned) return { clock, units };
  const door = clock.reliefDoor === "west" ? RELIEF_WEST : RELIEF_SOUTH;
  const inner = clock.reliefDoor === "west" ? RELIEF_INNER_WEST : RELIEF_INNER_SOUTH;
  let nextUnits = units;
  if (!nextUnits.some((unit) => unit.id === "enemy-relief-1")) {
    const spot = findReliefSpot(grid, nextUnits, [door, inner], door);
    if (spot) nextUnits = [...nextUnits, makeSwede("enemy-relief-1", "Švédská posila", spot, "N", 7)];
  }
  if (!nextUnits.some((unit) => unit.id === "enemy-relief-2")) {
    const spot = findReliefSpot(grid, nextUnits, [inner, door], door);
    if (spot) nextUnits = [...nextUnits, makeSwede("enemy-relief-2", "Švédská posila", spot, "N", 7)];
  }
  const both =
    nextUnits.some((unit) => unit.id === "enemy-relief-1") &&
    nextUnits.some((unit) => unit.id === "enemy-relief-2");
  return { clock: { ...clock, reliefSpawned: both }, units: nextUnits };
}

function writeStamp(clock: Mission3Clock, units: UnitData[]): Mission3Clock {
  if (!clock.lit || clock.cookedOff || clock.cord.length === 0) {
    return { ...clock, stamperIds: [], stampTile: null };
  }
  const tile = clock.cord[clock.sparkIndex];
  if (!tile) return { ...clock, stamperIds: [], stampTile: null };
  const stamperIds = units
    .filter(
      (unit) =>
        unit.faction === "enemy" &&
        isUnitFighting(unit) &&
        isAdjacentForMelee(unit.pos, tile),
    )
    .map((unit) => unit.id);
  return { ...clock, stampTile: copyCoord(tile), stamperIds };
}

function dropDeadCart(clock: Mission3Clock, grid: GridSystem, units: UnitData[]): Mission3Clock {
  if (!clock.cart) return clock;
  const bearer = units.find((unit) => unit.id === clock.cart?.bearerId);
  if (bearer && isUnitFighting(bearer)) return clock;
  return dropCartAsKeg(clock, grid);
}

/**
 * Swedish phase before hunters: stamp, relief, carts.
 * A dead bearer drops his keg here, then the replacement can roll in the same cart call.
 * Delivery of the third cart stops the turn before hunters, climbs, and the cone.
 */
export function openSwedishTurn(
  clock: Mission3Clock,
  grid: GridSystem,
  units: UnitData[],
): TurnStep {
  let next = applyStamp(clock, units);
  let nextUnits = units;

  if (!next.silent && !next.reliefSpawned) {
    const spawned = spawnRelief(next, grid, nextUnits);
    next = spawned.clock;
    nextUnits = spawned.units;
  }

  if (!next.cookedOff) {
    next = dropDeadCart(next, grid, nextUnits);
    const carts = advanceCarts(next, grid, nextUnits);
    next = carts.clock;
    nextUnits = carts.units;
    if (next.deliveries >= DELIVERY_LIMIT && !next.cookedOff) {
      return { clock: { ...next, loss: "delivery" }, units: nextUnits };
    }
  }

  return { clock: next, units: nextUnits };
}

/**
 * Swedish phase after hunters: climb ticks, stamper telegraph, cone last.
 * The first damaging cone is the cone stored on the warning turn.
 */
export function closeSwedishTurn(
  clock: Mission3Clock,
  grid: GridSystem,
  units: UnitData[],
): TurnStep {
  const climbs = resolveClimbs(clock, units);
  let next = writeStamp(climbs.clock, climbs.units);
  let nextUnits = climbs.units;

  if (!next.silent) {
    if (!next.coneWarned) {
      next = { ...next, cone: selectCone(grid, nextUnits), coneWarned: true };
    } else if (!next.coneFired) {
      const fired = applyCanister(grid, nextUnits, next);
      nextUnits = fired.units;
      next = { ...fired.clock, coneFired: true };
    } else {
      const chosen = selectCone(grid, nextUnits);
      const fired = applyCanister(grid, nextUnits, { ...next, cone: chosen });
      nextUnits = fired.units;
      next = { ...fired.clock, cone: chosen, coneFired: true };
    }
  }

  return { clock: next, units: nextUnits };
}

/**
 * Headless Swedish resolution. Hunter shots stay in the store, so the warning
 * turn leaves sentries on their start tiles.
 */
export function resolveSwedishTurn(
  clock: Mission3Clock,
  grid: GridSystem,
  units: UnitData[],
): TurnStep {
  const opened = openSwedishTurn(clock, grid, units);
  if (opened.clock.loss === "delivery" || (opened.clock.deliveries >= DELIVERY_LIMIT && !opened.clock.cookedOff)) {
    return opened;
  }
  return closeSwedishTurn(opened.clock, grid, opened.units);
}

export function computeMission3Ai(
  grid: GridSystem,
  enemy: UnitData,
  units: UnitData[],
  clock: Mission3Clock,
): EnemyAiDecision {
  if (
    enemy.id === GUNNER_ID ||
    enemy.attachedToCart ||
    clock.silent ||
    !clock.coneWarned
  ) {
    return HOLD;
  }
  return computeEnemyAiDecision(grid, enemy, units, "rain");
}

const SKIFF_A: GridCoord = { x: 6, y: 0, z: 9 };
const SKIFF_B: GridCoord = { x: 6, y: 0, z: 10 };

export function judgeMission3(clock: Mission3Clock, units: UnitData[]): Mission3Judgement {
  const plachy = units.find((unit) => unit.id === PLACHY_ID);
  if (!plachy || !isUnitFighting(plachy)) {
    return { outcome: "defeat", victoryReason: null, loss: "plachy" };
  }
  const anyPlayer = units.some(
    (unit) => unit.faction === "player" && isUnitFighting(unit),
  );
  if (!anyPlayer) return { outcome: "defeat", victoryReason: null, loss: "wiped" };
  if (clock.deliveries >= DELIVERY_LIMIT && !clock.cookedOff) {
    return { outcome: "defeat", victoryReason: null, loss: "delivery" };
  }
  const onSkiff = sameCoord(plachy.pos, SKIFF_A) || sameCoord(plachy.pos, SKIFF_B);
  if (clock.cookedOff && clock.deliveries < DELIVERY_LIMIT && onSkiff) {
    return { outcome: "victory", victoryReason: "skiff", loss: null };
  }
  return { outcome: "ongoing", victoryReason: null, loss: null };
}
