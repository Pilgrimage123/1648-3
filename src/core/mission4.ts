/**
 * Mission 4, Jez a mlýnice: dawn of 12 August 1648 at the Old Town Mills.
 * Two parallel victory paths: open both sluices to flood the ford and sweep
 * the Swedish fire-barge clear, or shoot both powder kegs aboard the barge
 * from the granary and water tower. Through-draft portal venting keeps
 * airborne mill flour from igniting when matchlocks discharge.
 */
import {
  applyDamageToUnit,
  checkLineOfSight3D,
  computeEnemyAiDecision,
  evaluateVisibleTargets,
  isUnitFighting,
  type EnemyAiDecision,
} from "./CombatSystem";
import { makeScenarioUnit, paintScenarioTile } from "./missionHelpers";
import { computeReachableTiles, findPathAStar } from "./Pathfinding";
import {
  GridSystem,
  MELEE_CATALOG,
  sameCoord,
  soldierMovePerAp,
  WEAPON_CATALOG,
} from "./GridSystem";
import type {
  CardinalDir,
  FirearmLockType,
  FloorLevel,
  GridCoord,
  UnitData,
} from "./types";

export const SIPEK_ID = "player-sipek";
export const KLARA_ID = "player-klara";
export const MATYAS_ID = "player-matyas";
export const SAPPER_1_ID = "enemy-sapper-1";
export const SAPPER_2_ID = "enemy-sapper-2";
export const BANK_1_ID = "enemy-bank-1";
export const BANK_2_ID = "enemy-bank-2";
export const FIREMASTER_ID = "enemy-firemaster";

export const BARGE_START_X = 4;
export const BARGE_IMPACT_X = 14;
export const BARGE_Z = 12;
export const BARGE_KEG_COUNT = 2;

export const SLUICE_WEST: GridCoord = { x: 10, y: 0, z: 10 };
export const SLUICE_TOWER: GridCoord = { x: 16, y: 1, z: 14 };
export const MILL_DOOR_N: GridCoord = { x: 14, y: 0, z: 9 };
export const MILL_DOOR_W: GridCoord = { x: 11, y: 0, z: 13 };

export const FLOUR_TILES: readonly GridCoord[] = [
  { x: 13, y: 0, z: 12 },
  { x: 14, y: 0, z: 12 },
  { x: 13, y: 0, z: 14 },
];

export const FORD_TILES: readonly GridCoord[] = [
  { x: 8, y: 0, z: 12 },
  { x: 9, y: 0, z: 12 },
  { x: 10, y: 0, z: 12 },
  { x: 8, y: 0, z: 13 },
  { x: 9, y: 0, z: 13 },
  { x: 10, y: 0, z: 13 },
  { x: 8, y: 0, z: 14 },
  { x: 9, y: 0, z: 14 },
  { x: 10, y: 0, z: 14 },
  { x: 8, y: 0, z: 15 },
  { x: 9, y: 0, z: 15 },
  { x: 10, y: 0, z: 15 },
  { x: 8, y: 0, z: 16 },
  { x: 9, y: 0, z: 16 },
  { x: 10, y: 0, z: 16 },
];

export const BANK_GRAPPLE_TILES: readonly GridCoord[] = [
  { x: 10, y: 0, z: 12 },
  { x: 10, y: 0, z: 13 },
  { x: 10, y: 0, z: 14 },
];

export const STAIR_GROUND_HEAD: GridCoord = { x: 16, y: 0, z: 16 };
export const STAIR_LOFT_LANDING: GridCoord = { x: 16, y: 1, z: 16 };
export const STAIR_TOWER_FOOT: GridCoord = { x: 17, y: 1, z: 16 };
export const STAIR_TOWER_CROWN: GridCoord = { x: 17, y: 2, z: 16 };

export type Mission4Loss = "mill_burned" | "sipek" | "wiped" | null;
export type Mission4Victory = "weir_flood" | "barge_sunk" | null;

export interface Mission4Clock {
  bargeX: number;
  bargeZ: number;
  bargeKegsRemaining: number;
  grappleCount: number;
  sluiceWestProgress: number;
  sluiceWestOpen: boolean;
  sluiceTowerProgress: number;
  sluiceTowerOpen: boolean;
  flooded: boolean;
  flourVented: boolean;
  millBurningTurns: number;
  compressChargesRemaining: number;
  loss: Mission4Loss;
}

export interface Mission4Judgement {
  outcome: "ongoing" | "victory" | "defeat";
  victoryReason: Mission4Victory;
  loss: Mission4Loss;
}

export interface Mission4TurnStep {
  clock: Mission4Clock;
  units: UnitData[];
  flourIgnited?: boolean;
}

const HOLD: EnemyAiDecision = {
  movePath: [],
  moveApCost: 0,
  targetId: null,
  doorToOpen: null,
  isCaptureAction: false,
};

export function isMillEnclosedRoofed(x: number, y: number, z: number): boolean {
  const groundMill = y === 0 && x >= 11 && x <= 18 && z >= 9 && z <= 17;
  const loftAndHoist = y === 1 && x >= 13 && x <= 18 && z >= 11 && z <= 17;
  return groundMill || loftAndHoist;
}

export function isFordCoord(c: GridCoord): boolean {
  return c.y === 0 && c.x >= 8 && c.x <= 10 && c.z >= 12 && c.z <= 16;
}

export function isMillInteriorCoord(c: GridCoord): boolean {
  return c.y === 0 && c.x >= 11 && c.x <= 18 && c.z >= 9 && c.z <= 17;
}

function chebyshevSameFloor(a: GridCoord, b: GridCoord): number {
  if (a.y !== b.y) return Infinity;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
}

function copyCoord(c: GridCoord): GridCoord {
  return { x: c.x, y: c.y, z: c.z };
}

function bargeCoord(clock: Mission4Clock): GridCoord {
  return { x: Math.min(BARGE_IMPACT_X, Math.max(BARGE_START_X, clock.bargeX)), y: 0, z: clock.bargeZ };
}

export function freshClock(): Mission4Clock {
  return {
    bargeX: BARGE_START_X,
    bargeZ: BARGE_Z,
    bargeKegsRemaining: BARGE_KEG_COUNT,
    grappleCount: 0,
    sluiceWestProgress: 0,
    sluiceWestOpen: false,
    sluiceTowerProgress: 0,
    sluiceTowerOpen: false,
    flooded: false,
    flourVented: false,
    millBurningTurns: 0,
    compressChargesRemaining: 2,
    loss: null,
  };
}

const paint = (
  grid: GridSystem,
  x: number,
  y: FloorLevel,
  z: number,
  surface: "cobble" | "stone_floor" | "water" | "wood_roof" | "wood_dock",
  walkable: boolean,
): void => paintScenarioTile(grid, x, y, z, surface, walkable, true);

function wall(grid: GridSystem, x: number, y: FloorLevel, z: number): void {
  paint(grid, x, y, z, y === 0 ? "stone_floor" : "wood_roof", false);
  grid.setObstacle({ x, y, z }, "high_wall");
}

export function createMission4Grid(): GridSystem {
  const grid = new GridSystem();
  grid.setRoofMask(isMillEnclosedRoofed, "mill");

  for (const tile of grid.getAllTiles()) {
    tile.hasFloor = false;
    tile.walkable = false;
    tile.obstacle = "none";
    tile.isEscapeZone = false;
    tile.surface = "cobble";
    tile.smokeTurns = 0;
    tile.damageLevel = 0;
  }

  // 1. Vltava millrace channel (x: 2..9, z: 6..20)
  for (let x = 2; x <= 9; x++) {
    for (let z = 6; z <= 20; z++) {
      paint(grid, x, 0, z, "water", false);
    }
  }

  // 2. Sandstone weir piers on west bank for enemy gunners & firemaster
  for (let x = 5; x <= 7; x++) {
    for (let z = 9; z <= 11; z++) {
      paint(grid, x, 0, z, "cobble", true);
    }
    for (let z = 15; z <= 17; z++) {
      paint(grid, x, 0, z, "cobble", true);
    }
  }
  grid.setObstacle({ x: 6, y: 0, z: 9 }, "low_wall");
  grid.setObstacle({ x: 6, y: 0, z: 17 }, "low_wall");

  // 3. Old Town quay & northern approach bank (x: 10..19, z: 7..19)
  for (let x = 10; x <= 19; x++) {
    for (let z = 7; z <= 19; z++) {
      paint(grid, x, 0, z, "cobble", true);
    }
  }

  // 4. Shallow river-weir ford (x: 8..10, z: 12..16) -> floods into deep water later
  for (const coord of FORD_TILES) {
    paint(grid, coord.x, 0, coord.z, "cobble", true);
  }

  // 5. Millhouse ground interior (x: 11..18, z: 9..17)
  for (let x = 11; x <= 18; x++) {
    for (let z = 9; z <= 17; z++) {
      paint(grid, x, 0, z, "stone_floor", true);
    }
  }

  // Millhouse exterior walls with two doors (MILL_DOOR_N, MILL_DOOR_W)
  for (let x = 11; x <= 18; x++) {
    if (x !== MILL_DOOR_N.x) wall(grid, x, 0, 9);
    wall(grid, x, 0, 17);
  }
  for (let z = 10; z <= 16; z++) {
    if (z !== MILL_DOOR_W.z) wall(grid, 11, 0, z);
    wall(grid, 18, 0, z);
  }

  // Interior pillars & flour sack low walls (keep tile centers clear around FLOUR_TILES)
  grid.setObstacle({ x: 14, y: 0, z: 11 }, "pillar");
  grid.setObstacle({ x: 15, y: 0, z: 14 }, "pillar");
  grid.setObstacle({ x: 12, y: 0, z: 11 }, "low_wall");
  grid.setObstacle({ x: 12, y: 0, z: 15 }, "low_wall");
  grid.setObstacle({ x: 15, y: 0, z: 11 }, "low_wall");
  grid.setObstacle({ x: 17, y: 0, z: 12 }, "low_wall");

  // 6. Upper granary & hoist room (y = 1, x: 13..18, z: 11..17)
  for (let x = 13; x <= 18; x++) {
    for (let z = 11; z <= 17; z++) {
      paint(grid, x, 1, z, "wood_roof", true);
    }
  }
  grid.setObstacle({ x: 17, y: 1, z: 12 }, "pillar");
  grid.setObstacle({ x: 15, y: 1, z: 12 }, "low_wall");

  // 7. Water tower open top platform (y = 2, x: 15..18, z: 14..17)
  for (let x = 15; x <= 18; x++) {
    for (let z = 14; z <= 17; z++) {
      paint(grid, x, 2, z, "wood_roof", true);
    }
  }
  grid.setObstacle({ x: 17, y: 2, z: 14 }, "low_wall");

  // 8. Interior stairs connecting y = 0 <-> y = 1 and y = 1 <-> y = 2
  grid.setStairs(16, 16, [0, 1], "straight_stairs", "N", "wood_roof");
  grid.setStairs(17, 16, [1, 2], "spiral_stairs", "W", "wood_roof");

  // 9. Double exterior millhouse doors (sealed against flour venting while closed)
  grid.setDoor({
    id: "mill-door-n",
    coord: copyCoord(MILL_DOOR_N),
    state: "closed",
    axis: "E_W",
    label: "Severní mlýnská vrata",
  });
  grid.setDoor({
    id: "mill-door-w",
    coord: copyCoord(MILL_DOOR_W),
    state: "closed",
    axis: "N_S",
    label: "Západní mlýnská vrata u náhonu",
  });

  grid.bakeCoverFromObstacles();
  grid.applyLocaleLabels();
  return grid;
}

const blankUnit = makeScenarioUnit;

export function createMission4Units(): UnitData[] {
  const sipekGun = WEAPON_CATALOG.sipek_wheellock_pistol!;
  const klaraGun = WEAPON_CATALOG.klara_apothecary_carbine!;
  const matyasGun = WEAPON_CATALOG.matchlock_musket_fork!;
  const sapperGun = WEAPON_CATALOG.harrier_pistol!;
  const swedeMusket = WEAPON_CATALOG.swedish_musket!;

  return [
    blankUnit({
      id: SIPEK_ID,
      name: "Mistr Prokop Šípek",
      roleTitle: "Staroměstský stárka mlynářů (VIP)",
      faction: "player",
      archetype: "commander",
      isVip: true,
      pos: { x: 10, y: 0, z: 11 },
      facing: "W",
      hp: 13,
      armor: 1,
      movePerAp: 5,
      weapon: sipekGun,
      melee: MELEE_CATALOG.mill_pole_hook,
    }),
    blankUnit({
      id: KLARA_ID,
      name: "Klára z Lékárny u Zlatého orla",
      roleTitle: "Apatykářka a bylinkářka",
      faction: "player",
      archetype: "sniper",
      pos: { x: 15, y: 2, z: 15 },
      facing: "W",
      hp: 11,
      armor: 0,
      movePerAp: 5,
      weapon: klaraGun,
      melee: MELEE_CATALOG.apothecary_knife,
    }),
    blankUnit({
      id: MATYAS_ID,
      name: "Matyáš „Hrom“ Kovář",
      roleTitle: "Podkovář vodárenské věže",
      faction: "player",
      archetype: "trooper",
      pos: { x: 13, y: 0, z: 13 },
      facing: "W",
      hp: 15,
      armor: 3,
      movePerAp: soldierMovePerAp(matyasGun),
      weapon: matyasGun,
      melee: MELEE_CATALOG.forge_hammer,
    }),
    blankUnit({
      id: SAPPER_1_ID,
      name: "Říční ženista",
      roleTitle: "Švédský říční ženista",
      faction: "enemy",
      archetype: "ranger",
      pos: { x: 8, y: 0, z: 13 },
      facing: "E",
      hp: 8,
      armor: 0,
      movePerAp: 6,
      weapon: sapperGun,
      melee: MELEE_CATALOG.harrier_blade,
    }),
    blankUnit({
      id: SAPPER_2_ID,
      name: "Druhý říční ženista",
      roleTitle: "Švédský říční ženista",
      faction: "enemy",
      archetype: "ranger",
      pos: { x: 9, y: 0, z: 15 },
      facing: "E",
      hp: 8,
      armor: 0,
      movePerAp: 6,
      weapon: sapperGun,
      melee: MELEE_CATALOG.harrier_blade,
    }),
    blankUnit({
      id: BANK_1_ID,
      name: "Mušketýr břehu",
      roleTitle: "Švédský mušketýr břehu",
      faction: "enemy",
      archetype: "trooper",
      pos: { x: 7, y: 0, z: 10 },
      facing: "E",
      hp: 9,
      armor: 1,
      movePerAp: soldierMovePerAp(swedeMusket),
      weapon: swedeMusket,
      melee: MELEE_CATALOG.swedish_musket_butt,
    }),
    blankUnit({
      id: BANK_2_ID,
      name: "Druhý mušketýr břehu",
      roleTitle: "Švédský mušketýr břehu",
      faction: "enemy",
      archetype: "trooper",
      pos: { x: 7, y: 0, z: 16 },
      facing: "E",
      hp: 9,
      armor: 1,
      movePerAp: soldierMovePerAp(swedeMusket),
      weapon: swedeMusket,
      melee: MELEE_CATALOG.swedish_musket_butt,
    }),
    blankUnit({
      id: FIREMASTER_ID,
      name: "Švédský lodivod-žhář",
      roleTitle: "Velitel zápalného pramu",
      faction: "enemy",
      archetype: "commander",
      pos: { x: 6, y: 0, z: 15 },
      facing: "E",
      hp: 11,
      armor: 1,
      movePerAp: soldierMovePerAp(swedeMusket),
      weapon: swedeMusket,
      melee: MELEE_CATALOG.swedish_musket_butt,
    }),
  ];
}

export function syncFlourVenting(
  clock: Mission4Clock,
  grid: GridSystem,
): Mission4Clock {
  if (clock.flourVented) return clock;
  if (grid.getOpenExteriorDoors().length > 0) {
    return { ...clock, flourVented: true };
  }
  return clock;
}

export function canOperateSluice(
  clock: Mission4Clock,
  unit: UnitData,
): "west" | "tower" | null {
  if (clock.flooded || unit.faction !== "player" || !isUnitFighting(unit)) {
    return null;
  }
  if (!clock.sluiceWestOpen && chebyshevSameFloor(unit.pos, SLUICE_WEST) <= 1) {
    return "west";
  }
  if (!clock.sluiceTowerOpen && chebyshevSameFloor(unit.pos, SLUICE_TOWER) <= 1) {
    return "tower";
  }
  return null;
}

const DRY_DEFENDER_HAVENS: readonly GridCoord[] = [
  { x: 10, y: 0, z: 11 },
  { x: 10, y: 0, z: 17 },
  { x: 10, y: 0, z: 9 },
  { x: 12, y: 0, z: 13 },
  { x: 12, y: 0, z: 12 },
  { x: 12, y: 0, z: 14 },
  { x: 12, y: 0, z: 15 },
];

const DRY_ENEMY_PIER_SPOTS: readonly GridCoord[] = [
  { x: 7, y: 0, z: 11 },
  { x: 7, y: 0, z: 15 },
  { x: 6, y: 0, z: 11 },
  { x: 6, y: 0, z: 16 },
  { x: 5, y: 0, z: 11 },
  { x: 5, y: 0, z: 15 },
];

function findNearestDrySpot(
  candidates: readonly GridCoord[],
  origin: GridCoord,
  occupied: UnitData[],
  grid: GridSystem,
  unitId: string,
): GridCoord | null {
  const valid = candidates.filter((cand) => {
    if (isFordCoord(cand) || sameCoord(cand, SLUICE_WEST)) return false;
    const tile = grid.getTile(cand);
    if (!tile || !tile.walkable || tile.surface === "water") return false;
    return !occupied.some(
      (u) => u.id !== unitId && isUnitFighting(u) && sameCoord(u.pos, cand),
    );
  });
  valid.sort((a, b) => {
    const da = Math.abs(a.x - origin.x) + Math.abs(a.z - origin.z);
    const db = Math.abs(b.x - origin.x) + Math.abs(b.z - origin.z);
    return da - db || a.z - b.z;
  });
  return valid[0] ? copyCoord(valid[0]) : null;
}

export function resolveFlood(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
): Mission4TurnStep {
  let nextUnits = units.map((u) => ({ ...u }));

  for (let i = 0; i < nextUnits.length; i++) {
    const unit = nextUnits[i]!;
    if (!isUnitFighting(unit)) continue;
    const onFord = isFordCoord(unit.pos);
    const onWestSluice = sameCoord(unit.pos, SLUICE_WEST);
    if (!onFord && !onWestSluice) continue;

    if (unit.faction === "player") {
      const safe =
        findNearestDrySpot(DRY_DEFENDER_HAVENS, unit.pos, nextUnits, grid, unit.id) ?? {
          x: 12,
          y: 0,
          z: 13,
        };
      nextUnits[i] = { ...unit, pos: safe };
    } else if (onFord) {
      const washed = findNearestDrySpot(
        DRY_ENEMY_PIER_SPOTS,
        unit.pos,
        nextUnits,
        grid,
        unit.id,
      );
      const damaged = applyDamageToUnit(unit, 4, { armorShred: 1, shaken: true });
      nextUnits[i] = washed ? { ...damaged, pos: washed } : { ...damaged, hp: 0, alive: false };
    }
  }

  for (const coord of FORD_TILES) {
    const tile = grid.getTile(coord);
    if (!tile) continue;
    tile.surface = "water";
    tile.walkable = false;
    tile.smokeTurns = 0;
  }
  grid.bakeCoverFromObstacles();

  return {
    clock: {
      ...clock,
      flooded: true,
      sluiceWestOpen: true,
      sluiceTowerOpen: true,
      grappleCount: 0,
    },
    units: nextUnits,
  };
}

export function operateSluice(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
  actor: UnitData,
): Mission4TurnStep | null {
  if (actor.ap < 1) return null;
  const target = canOperateSluice(clock, actor);
  if (!target) return null;
  const step = actor.id === SIPEK_ID ? 2 : 1;

  let nextClock: Mission4Clock = { ...clock };
  if (target === "west") {
    const nextProgress = Math.min(2, clock.sluiceWestProgress + step);
    nextClock.sluiceWestProgress = nextProgress;
    nextClock.sluiceWestOpen = nextProgress >= 2;
  } else {
    const nextProgress = Math.min(2, clock.sluiceTowerProgress + step);
    nextClock.sluiceTowerProgress = nextProgress;
    nextClock.sluiceTowerOpen = nextProgress >= 2;
  }

  if (nextClock.sluiceWestOpen && nextClock.sluiceTowerOpen) {
    return resolveFlood(nextClock, grid, units);
  }
  return { clock: nextClock, units };
}

export function canBreakGrapple(clock: Mission4Clock, unit: UnitData): boolean {
  if (clock.flooded || clock.grappleCount <= 0) return false;
  if (unit.faction !== "player" || !isUnitFighting(unit)) return false;
  return BANK_GRAPPLE_TILES.some((tile) => chebyshevSameFloor(unit.pos, tile) <= 1);
}

export function breakGrapple(
  clock: Mission4Clock,
  unit: UnitData,
): Mission4Clock | null {
  if (unit.ap < 1 || !canBreakGrapple(clock, unit)) return null;
  return {
    ...clock,
    grappleCount: Math.max(0, clock.grappleCount - 1),
  };
}

export function canShootBargeKeg(
  clock: Mission4Clock,
  grid: GridSystem,
  unit: UnitData,
): boolean {
  if (clock.flooded || clock.bargeKegsRemaining <= 0 || clock.bargeX >= BARGE_IMPACT_X) {
    return false;
  }
  if (unit.faction !== "player" || !isUnitFighting(unit)) return false;
  if (unit.pistolLoaded === false || unit.firearmLoaded === false) return false;

  const target = bargeCoord(clock);
  const dx = unit.pos.x - target.x;
  const dz = unit.pos.z - target.z;
  const dist = Math.hypot(dx, dz);
  if (dist > unit.weapon.maxRange) return false;

  return checkLineOfSight3D(grid, unit.pos, target).clear;
}

export function checkFlourDustIgnition(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
  shooterPos: GridCoord,
  lockType: FirearmLockType,
  targetPos?: GridCoord,
): Mission4TurnStep {
  if (clock.flourVented || grid.getOpenExteriorDoors().length > 0) {
    return {
      clock: grid.getOpenExteriorDoors().length > 0 ? { ...clock, flourVented: true } : clock,
      units,
      flourIgnited: false,
    };
  }
  if (lockType !== "matchlock") {
    return { clock, units, flourIgnited: false };
  }
  const touchesMill =
    isMillInteriorCoord(shooterPos) || (targetPos ? isMillInteriorCoord(targetPos) : false);
  if (!touchesMill) {
    return { clock, units, flourIgnited: false };
  }

  const nextUnits = units.map((unit) => {
    if (!isUnitFighting(unit)) return unit;
    const nearFlour = FLOUR_TILES.some((ft) => chebyshevSameFloor(unit.pos, ft) <= 1);
    if (!nearFlour) return unit;
    return applyDamageToUnit(unit, 3, { shaken: true });
  });

  for (const ft of FLOUR_TILES) {
    grid.addSmoke(ft, 1, 3);
    grid.damageTile(ft, 1);
  }

  return {
    clock: {
      ...clock,
      millBurningTurns: clock.millBurningTurns + 1,
    },
    units: nextUnits,
    flourIgnited: true,
  };
}

export function shootBargeKeg(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
  shooter: UnitData,
): Mission4TurnStep | null {
  const cost = shooter.weapon.fireApCost ?? 1;
  if (shooter.ap < cost || !canShootBargeKeg(clock, grid, shooter)) return null;

  const nextKegs = Math.max(0, clock.bargeKegsRemaining - 1);
  let nextClock: Mission4Clock = {
    ...clock,
    bargeKegsRemaining: nextKegs,
  };

  let nextUnits = units.map((u) =>
    u.id === shooter.id
      ? {
          ...u,
          ap: Math.max(0, u.ap - cost),
          firearmLoaded: false,
          reloadProgress: 0,
        }
      : u,
  );

  const flour = checkFlourDustIgnition(
    nextClock,
    grid,
    nextUnits,
    shooter.pos,
    shooter.weapon.lockType,
  );
  nextClock = flour.clock;
  nextUnits = flour.units;

  return {
    clock: nextClock,
    units: nextUnits,
    flourIgnited: flour.flourIgnited,
  };
}

export function getVinegarCompressTargets(
  clock: Mission4Clock,
  klara: UnitData,
  units: UnitData[],
  grid: GridSystem,
): UnitData[] {
  if (klara.id !== KLARA_ID || !isUnitFighting(klara) || clock.compressChargesRemaining <= 0) {
    return [];
  }
  return units.filter((ally) => {
    if (ally.faction !== "player" || !isUnitFighting(ally)) return false;
    if (chebyshevSameFloor(klara.pos, ally.pos) > 1) return false;
    const smokeOnTile = (grid.getTile(ally.pos)?.smokeTurns ?? 0) > 0;
    return (
      ally.hp < ally.maxHp ||
      Boolean(ally.isChoking) ||
      ally.isShaken ||
      smokeOnTile
    );
  });
}

export function canUseVinegarCompress(
  clock: Mission4Clock,
  klara: UnitData,
  units: UnitData[],
  grid: GridSystem,
): boolean {
  return getVinegarCompressTargets(clock, klara, units, grid).length > 0;
}

export function applyVinegarCompress(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
  klara: UnitData,
  targetId?: string,
): Mission4TurnStep | null {
  if (klara.ap < 1) return null;
  const targets = getVinegarCompressTargets(clock, klara, units, grid);
  if (targets.length === 0) return null;
  const chosen =
    (targetId ? targets.find((t) => t.id === targetId) : undefined) ?? targets[0]!;

  const tile = grid.getTile(chosen.pos);
  if (tile) tile.smokeTurns = 0;

  const nextUnits = units.map((u) => {
    if (u.id === chosen.id) {
      const restoredMove = u.baseMovePerAp ?? u.movePerAp;
      const cleanedBuff = u.buffId === "choking" ? undefined : u.buffId;
      return {
        ...u,
        hp: Math.min(u.maxHp, u.hp + 4),
        isChoking: false,
        isShaken: false,
        movePerAp: restoredMove,
        buffId: cleanedBuff,
        buffTitle: cleanedBuff ? u.buffTitle : undefined,
      };
    }
    return u;
  });

  return {
    clock: {
      ...clock,
      compressChargesRemaining: Math.max(0, clock.compressChargesRemaining - 1),
    },
    units: nextUnits,
  };
}

export function canDouseMillFire(clock: Mission4Clock, unit: UnitData): boolean {
  if (clock.millBurningTurns <= 0) return false;
  if (unit.faction !== "player" || !isUnitFighting(unit)) return false;
  return FLOUR_TILES.some((ft) => chebyshevSameFloor(unit.pos, ft) <= 2);
}

export function douseMillFire(
  clock: Mission4Clock,
  grid: GridSystem,
  unit: UnitData,
): Mission4Clock | null {
  if (unit.ap < 1 || !canDouseMillFire(clock, unit)) return null;
  for (const ft of FLOUR_TILES) {
    const tile = grid.getTile(ft);
    if (tile) tile.smokeTurns = Math.max(0, tile.smokeTurns - 2);
  }
  return { ...clock, millBurningTurns: 0 };
}

export function closePlayerTurn(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
): Mission4TurnStep {
  const vented = syncFlourVenting(clock, grid);
  return { clock: vented, units };
}

export function openSwedishTurn(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
): Mission4TurnStep {
  let nextClock = syncFlourVenting(clock, grid);
  if (nextClock.flooded || nextClock.bargeKegsRemaining <= 0) {
    return { clock: nextClock, units };
  }

  if (nextClock.millBurningTurns >= 2) {
    return { clock: { ...nextClock, loss: "mill_burned" }, units };
  }

  const speed = nextClock.grappleCount > 0 ? 3 : 2;
  const nextX = Math.min(BARGE_IMPACT_X, nextClock.bargeX + speed);
  nextClock = { ...nextClock, bargeX: nextX };

  if (nextX >= BARGE_IMPACT_X) {
    return {
      clock: { ...nextClock, loss: "mill_burned" },
      units,
    };
  }

  return { clock: nextClock, units };
}

export function closeSwedishTurn(
  clock: Mission4Clock,
  units: UnitData[],
): Mission4TurnStep {
  if (clock.flooded || clock.bargeKegsRemaining <= 0) {
    return { clock, units };
  }

  // Living sappers standing on BANK_GRAPPLE_TILES fasten an anchor grapple (up to 2)
  const sappersOnBank = units.filter(
    (u) =>
      u.faction === "enemy" &&
      (u.id === SAPPER_1_ID || u.id === SAPPER_2_ID) &&
      isUnitFighting(u) &&
      BANK_GRAPPLE_TILES.some((bt) => chebyshevSameFloor(u.pos, bt) <= 1),
  ).length;

  const nextGrapples = Math.min(2, Math.max(clock.grappleCount, sappersOnBank));
  const loss: Mission4Loss =
    clock.millBurningTurns >= 2
      ? "mill_burned"
      : clock.bargeX >= BARGE_IMPACT_X
        ? "mill_burned"
        : clock.loss;

  return {
    clock: {
      ...clock,
      grappleCount: nextGrapples,
      loss,
    },
    units,
  };
}

export function resolveSwedishTurn(
  clock: Mission4Clock,
  grid: GridSystem,
  units: UnitData[],
): Mission4TurnStep {
  const opened = openSwedishTurn(clock, grid, units);
  if (opened.clock.loss) return opened;
  return closeSwedishTurn(opened.clock, opened.units);
}

export function computeMission4Ai(
  grid: GridSystem,
  enemy: UnitData,
  units: UnitData[],
  clock: Mission4Clock,
): EnemyAiDecision {
  if (clock.flooded || clock.bargeKegsRemaining <= 0) return HOLD;

  const base = computeEnemyAiDecision(grid, enemy, units, "fog");
  if (enemy.id === SAPPER_1_ID || enemy.id === SAPPER_2_ID) {
    const reach = computeReachableTiles(grid, enemy, units);
    const bankCandidates = Array.from(reach.values()).filter((r) =>
      BANK_GRAPPLE_TILES.some((bt) => sameCoord(bt, r.coord)),
    );
    if (bankCandidates.length > 0 && !BANK_GRAPPLE_TILES.some((bt) => sameCoord(bt, enemy.pos))) {
      bankCandidates.sort((a, b) => a.apCost - b.apCost || a.coord.z - b.coord.z);
      const chosen = bankCandidates[0]!;
      const path = findPathAStar(grid, enemy.pos, chosen.coord, units, enemy.id);
      if (path.length > 0) {
        const moved: UnitData = { ...enemy, pos: chosen.coord };
        const visible = evaluateVisibleTargets(grid, moved, units, "fog");
        return {
          movePath: path,
          moveApCost: chosen.apCost,
          targetId: chosen.apCost === 1 ? visible[0]?.targetId ?? null : null,
          doorToOpen: null,
          isCaptureAction: false,
        };
      }
    }
  }

  return base;
}

export function judgeMission4(
  clock: Mission4Clock,
  units: UnitData[],
): Mission4Judgement {
  const sipek = units.find((u) => u.id === SIPEK_ID);
  const sipekDown = !sipek || !sipek.alive;
  const allPlayersDown = units
    .filter((u) => u.faction === "player")
    .every((u) => !u.alive);

  if (allPlayersDown) {
    return { outcome: "defeat", victoryReason: null, loss: "wiped" };
  }
  if (sipekDown) {
    return { outcome: "defeat", victoryReason: null, loss: "sipek" };
  }
  if (clock.loss === "mill_burned" || clock.millBurningTurns >= 2 || clock.bargeX >= BARGE_IMPACT_X) {
    return { outcome: "defeat", victoryReason: null, loss: "mill_burned" };
  }
  if (clock.flooded) {
    return { outcome: "victory", victoryReason: "weir_flood", loss: null };
  }
  if (clock.bargeKegsRemaining <= 0) {
    return { outcome: "victory", victoryReason: "barge_sunk", loss: null };
  }
  return { outcome: "ongoing", victoryReason: null, loss: null };
}
