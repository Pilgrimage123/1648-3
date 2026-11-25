/**
 * Mission 3. The clock and the yard are headless. The last section drives the store.
 */
import assert from "node:assert/strict";
import {
  applyBlackPowderChoking,
  bresenham3D,
  calculateShot,
  checkLineOfSight3D,
  computeEnemyAiDecision,
} from "../src/core/CombatSystem.ts";
import { applyPowderBlast } from "../src/core/explosions.ts";
import { createInitialGrid } from "../src/core/GridSystem.ts";
import { createMission2Grid } from "../src/core/mission2.ts";
import { computeReachableTiles, findPathAStar } from "../src/core/Pathfinding.ts";
import { checkMissionOutcome, useGameStore } from "../src/store/useGameStore.ts";
import {
  advanceCarts,
  advanceSpark,
  applyCanister,
  applyDisruptFalconet,
  applyStamp,
  armClimb,
  breakSilence,
  canDisruptFalconet,
  closePlayerTurn,
  computeMission3Ai,
  cookOff,
  COURTYARD_KEG,
  createMission3Grid,
  createMission3Units,
  cutTackle,
  dropCartAsKeg,
  freshClock,
  GUNNER_ID,
  HAVEL_ID,
  isTorchRing,
  judgeMission3,
  canOfferCordLay,
  layCord,
  proposeCordLay,
  lightCord,
  ONDREJ_ID,
  PLACHY_ID,
  RELIEF_SOUTH,
  RELIEF_WEST,
  resolveClimbs,
  resolveSwedishTurn,
  selectCone,
  SHOULDER,
  STAIR_FOOT,
  STAIR_HEAD,
  STORE_DOOR,
  ZAK1_ID,
  ZAK2_ID,
  type Mission3Clock,
} from "../src/core/mission3.ts";
import type { GridCoord, UnitData } from "../src/core/types.ts";

const cold = { oath: null, mission1SurvivorId: null };
const grid = createMission3Grid();
const preset = createMission3Units(cold);

function tile(x: number, y: 0 | 1 | 2, z: number, source = grid) {
  const found = source.getTile({ x, y, z });
  assert.ok(found, `missing tile ${x},${y},${z}`);
  return found;
}

function unit(units: UnitData[], id: string): UnitData {
  const found = units.find((candidate) => candidate.id === id);
  assert.ok(found, id);
  return found;
}

function move(units: UnitData[], id: string, pos: GridCoord, hp?: number): UnitData[] {
  return units.map((candidate) =>
    candidate.id === id
      ? { ...candidate, pos, ...(hp === undefined ? {} : { hp, alive: hp > 0 }) }
      : candidate,
  );
}

function reachAp(source: ReturnType<typeof createMission3Grid>, actor: UnitData, units: UnitData[], dest: GridCoord) {
  const hit = computeReachableTiles(source, actor, units).get(`${dest.x},${dest.y},${dest.z}`);
  assert.ok(hit, `no path onto ${dest.x},${dest.y},${dest.z} for ${actor.id}`);
  return hit.apCost;
}

assert.equal(tile(4, 0, 10).surface, "water");
assert.equal(tile(4, 0, 10).walkable, false);
assert.equal(tile(5, 0, 12).surface, "water");
assert.equal(tile(5, 0, 12).walkable, false);
assert.equal(tile(6, 0, 9).surface, "wood_dock");
assert.equal(tile(6, 0, 9).walkable, true);
assert.equal(tile(6, 0, 9).isEscapeZone, true);
assert.equal(tile(6, 0, 10).surface, "wood_dock");
assert.equal(tile(6, 0, 10).isEscapeZone, true);
assert.equal(tile(6, 0, 8).hasFloor, false);
assert.equal(tile(6, 0, 11).hasFloor, false);
assert.equal(
  grid.getAllTiles().filter((found) => found.isEscapeZone).length,
  2,
);

let walkableEast = 0;
let walkableHigh = 0;
for (const found of grid.getAllTiles()) {
  if (found.walkable && found.coord.x >= 18) walkableEast += 1;
  if (found.walkable && found.coord.y === 2) walkableHigh += 1;
}
assert.equal(walkableEast, 0);
assert.equal(walkableHigh, 0);

for (const x of [9, 10, 11, 12]) {
  const cord = tile(x, 0, 10);
  assert.equal(cord.surface, "cobble");
  assert.equal(cord.walkable, true);
  assert.equal(cord.obstacle, "none");
}
for (const [x, z] of [
  [12, 11],
  [12, 9],
  [11, 11],
  [13, 10],
] as const) {
  assert.equal(tile(x, 0, z).obstacle, "high_wall");
}
assert.equal(tile(11, 0, 10).walkable, true);
assert.equal(tile(14, 0, 8).surface, "stone_floor");
assert.equal(tile(14, 0, 8).walkable, true);
assert.equal(tile(13, 0, 9).walkable, true);
assert.notEqual(tile(13, 0, 9).obstacle, "high_wall");
assert.equal(tile(15, 0, 10).obstacle, "pillar");
assert.equal(tile(11, 0, 13).obstacle, "pillar");
assert.equal(tile(16, 0, 12).obstacle, "low_wall");
assert.equal(tile(15, 1, 10).hasFloor, false);
assert.equal(tile(15, 1, 11).hasFloor, false);

assert.equal(grid.isEnclosedRoofed(14, 0, 8), true);
assert.equal(grid.isEnclosedRoofed(12, 1, 13), true);
assert.equal(grid.isEnclosedRoofed(10, 0, 13), true);
assert.equal(grid.isEnclosedRoofed(9, 0, 10), false);
assert.equal(grid.isEnclosedRoofed(6, 0, 9), false);
assert.equal(grid.isEnclosedRoofed(16, 0, 8), false);
assert.equal(grid.getRoofParapetCover({ x: 10, y: 1, z: 12 }, "S"), "half");
assert.equal(grid.getRoofParapetCover({ x: 5, y: 0, z: 11 }, "N"), "none");
assert.equal(isTorchRing(SHOULDER), true);
assert.equal(isTorchRing({ x: 9, y: 0, z: 10 }), false);
assert.equal(isTorchRing({ x: 6, y: 0, z: 9 }), false);

assert.deepEqual(
  findPathAStar(grid, { x: 10, y: 0, z: 12 }, { x: 10, y: 1, z: 12 }, preset),
  [],
);
assert.equal(
  checkLineOfSight3D(grid, { x: 8, y: 0, z: 10 }, { x: 16, y: 0, z: 9 }).clear,
  true,
);
assert.equal(
  checkLineOfSight3D(grid, { x: 9, y: 0, z: 11 }, { x: 16, y: 0, z: 9 }).clear,
  true,
);
assert.equal(
  checkLineOfSight3D(grid, { x: 8, y: 0, z: 10 }, { x: 16, y: 0, z: 8 }).clear,
  false,
);
assert.equal(
  checkLineOfSight3D(grid, { x: 9, y: 0, z: 11 }, { x: 16, y: 0, z: 8 }).clear,
  false,
);
assert.equal(
  checkLineOfSight3D(grid, { x: 14, y: 1, z: 12 }, { x: 16, y: 0, z: 9 }).clear,
  true,
);
const laneRay = bresenham3D({ x: 14, y: 1, z: 12 }, { x: 16, y: 0, z: 8 });
const pillarAt = laneRay.findIndex((cell) => cell.x === 15 && cell.y === 0 && cell.z === 10);
assert.ok(pillarAt > 1 && pillarAt < laneRay.length - 2);

assert.equal(grid.isDoorClosedAt(RELIEF_WEST), true);
assert.equal(grid.isDoorClosedAt(RELIEF_SOUTH), true);
assert.deepEqual(
  findPathAStar(grid, { x: 8, y: 0, z: 14 }, RELIEF_WEST, preset, PLACHY_ID),
  [],
);
assert.deepEqual(
  findPathAStar(grid, { x: 12, y: 0, z: 14 }, RELIEF_SOUTH, preset, PLACHY_ID),
  [],
);

const players = preset.filter((candidate) => candidate.faction === "player").map((candidate) => candidate.id);
assert.deepEqual(players, [PLACHY_ID, HAVEL_ID, ONDREJ_ID]);
assert.equal(unit(preset, PLACHY_ID).isVip, true);
for (const id of ["player-jan", "player-bartolomej", "player-vaclav", "player-odowalsky", "player-colloredo"]) {
  assert.equal(preset.some((candidate) => candidate.id.startsWith(id)), false);
}
assert.notEqual(unit(preset, GUNNER_ID).archetype, "sectoid");
assert.equal(preset.some((candidate) => candidate.id.includes("occultist") || candidate.id.includes("harrier")), false);
assert.equal(unit(preset, "enemy-bearer-1").weapon.id, "swedish_musket");
assert.equal(unit(preset, "enemy-bearer-1").attachedToCart, true);

function party(havel: "accept" | "refuse" | "fallen", ondrej: "accept" | "refuse" | "fallen") {
  return createMission3Units({ oath: { havel, ondrej }, mission1SurvivorId: null })
    .filter((candidate) => candidate.faction === "player")
    .map((candidate) => candidate.id);
}
assert.deepEqual(party("accept", "refuse"), [PLACHY_ID, HAVEL_ID, ZAK2_ID]);
assert.deepEqual(party("fallen", "accept"), [PLACHY_ID, ZAK1_ID, ONDREJ_ID]);
assert.deepEqual(party("refuse", "refuse"), [PLACHY_ID, ZAK1_ID, ZAK2_ID]);
assert.deepEqual(party("fallen", "fallen"), [PLACHY_ID, ZAK1_ID, ZAK2_ID]);
const bothStudents = createMission3Units({
  oath: { havel: "refuse", ondrej: "refuse" },
  mission1SurvivorId: null,
});
for (const id of [ZAK1_ID, ZAK2_ID]) {
  const student = unit(bothStudents, id);
  assert.equal(student.weapon.id, "havel_pistol");
  assert.equal(student.archetype, "trooper");
  assert.equal(student.grenades, 0);
  assert.equal(student.ability, undefined);
  assert.equal(student.movePerAp, 7);
}

const havelChoked = applyBlackPowderChoking(preset, grid);
assert.equal(unit(havelChoked, HAVEL_ID).movePerAp, 6);
const smoked = createMission3Grid();
smoked.addSmoke({ x: 14, y: 0, z: 8 }, 0, 3);
const choking = applyBlackPowderChoking(move(preset, HAVEL_ID, { x: 14, y: 0, z: 8 }), smoked);
assert.equal(unit(choking, HAVEL_ID).movePerAp, 5);

function yard() {
  return {
    grid: createMission3Grid(),
    units: createMission3Units({
      oath: { havel: "accept", ondrej: "refuse" },
      mission1SurvivorId: null,
    }),
    clock: freshClock(),
  };
}

{
  const scene = yard();
  const student = unit(scene.units, ZAK2_ID);
  const ondrejParty = createMission3Units(cold);
  const ondrej = unit(ondrejParty, ONDREJ_ID);
  assert.equal(reachAp(scene.grid, { ...student, pos: { x: 8, y: 0, z: 10 } }, scene.units, { x: 9, y: 0, z: 10 }), 1);
  const two = layCord(
    scene.clock,
    { ...ondrej, pos: { x: 8, y: 0, z: 10 } },
    [
      { x: 9, y: 0, z: 10 },
      { x: 10, y: 0, z: 10 },
    ],
    scene.grid,
    ondrejParty,
  );
  assert.ok(two);
  assert.equal(two!.cord.length, 2);
  assert.equal(
    layCord(
      scene.clock,
      student,
      [
        { x: 9, y: 0, z: 10 },
        { x: 10, y: 0, z: 10 },
      ],
      scene.grid,
      scene.units,
    ),
    null,
  );
  const laying: UnitData = { ...ondrej, pos: { x: 8, y: 0, z: 10 } };
  const laidTiles = (hover: GridCoord) =>
    proposeCordLay(scene.clock, laying, hover, scene.grid, ondrejParty)?.map((coord) => [
      coord.x,
      coord.y,
      coord.z,
    ]);
  assert.deepEqual(laidTiles({ x: 9, y: 0, z: 10 }), [[9, 0, 10]]);
  assert.deepEqual(laidTiles({ x: 10, y: 0, z: 10 }), [
    [9, 0, 10],
    [10, 0, 10],
  ]);
  assert.equal(
    proposeCordLay(
      scene.clock,
      { ...student, pos: { x: 8, y: 0, z: 10 } },
      { x: 10, y: 0, z: 10 },
      scene.grid,
      scene.units,
    ),
    null,
  );
  assert.equal(proposeCordLay(scene.clock, laying, { x: 6, y: 0, z: 9 }, scene.grid, ondrejParty), null);
  const broke: UnitData = { ...laying, ap: 0 };
  assert.equal(proposeCordLay(scene.clock, broke, { x: 9, y: 0, z: 10 }, scene.grid, ondrejParty), null);
  assert.equal(canOfferCordLay(scene.clock, broke, scene.grid, ondrejParty), true);
  const full: Mission3Clock = {
    ...scene.clock,
    cord: Array.from({ length: 6 }, (_, index) => ({ x: 9 + index, y: 0 as const, z: 10 })),
  };
  assert.equal(layCord(full, student, [{ x: 8, y: 0, z: 10 }], scene.grid, scene.units), null);
  assert.equal(layCord(scene.clock, { ...student, pos: { x: 6, y: 0, z: 9 } }, [{ x: 6, y: 0, z: 10 }], scene.grid, scene.units), null);
  assert.equal(layCord(scene.clock, { ...student, pos: { x: 14, y: 0, z: 8 } }, [{ x: 14, y: 0, z: 9 }], scene.grid, scene.units), null);
  assert.equal(layCord(scene.clock, { ...student, pos: { x: 11, y: 0, z: 10 } }, [{ x: 12, y: 0, z: 9 }], scene.grid, scene.units), null);
  scene.grid.setObstacle({ x: 16, y: 0, z: 8 }, "powder_keg");
  assert.equal(layCord(scene.clock, { ...student, pos: { x: 16, y: 0, z: 9 } }, [{ x: 16, y: 0, z: 8 }], scene.grid, scene.units), null);

  let clock = layCord(scene.clock, { ...student, pos: { x: 8, y: 0, z: 10 } }, [{ x: 9, y: 0, z: 10 }], scene.grid, scene.units);
  assert.ok(clock);
  assert.equal(clock!.silent, true);
  assert.equal(clock!.reliefDoor, null);
  const lit = lightCord(clock!, { ...unit(scene.units, PLACHY_ID), pos: { x: 9, y: 0, z: 11 } }, scene.grid, () => 0);
  assert.ok(lit);
  assert.equal(lit!.silent, false);
  assert.equal(lit!.reliefDoor, "west");
  assert.equal(scene.grid.isDoorClosedAt(RELIEF_WEST), false);
  assert.equal(scene.grid.isDoorClosedAt(RELIEF_SOUTH), true);
  let sparked = advanceSpark(lit!);
  assert.equal(sparked.sparkIndex, 0);
  assert.equal(sparked.cord.length, 1);
  clock = layCord(sparked, { ...student, pos: { x: 9, y: 0, z: 10 } }, [{ x: 10, y: 0, z: 10 }], scene.grid, scene.units);
  clock = layCord(clock!, { ...student, pos: { x: 10, y: 0, z: 10 } }, [{ x: 11, y: 0, z: 10 }], scene.grid, scene.units);
  sparked = advanceSpark(clock!);
  assert.equal(sparked.sparkIndex, 2);
  clock = layCord(sparked, { ...student, pos: { x: 11, y: 0, z: 10 } }, [STORE_DOOR], scene.grid, scene.units);
  sparked = advanceSpark(clock!);
  assert.equal(sparked.cookedOff, true);
  assert.equal(sparked.cord.length, 4);

  const stamped = applyStamp(
    {
      ...sparked,
      lit: true,
      cookedOff: false,
      sparkIndex: 2,
      stampTile: { x: 9, y: 0, z: 10 },
      stamperIds: ["enemy-sentry-1"],
    },
    move(scene.units, "enemy-sentry-1", { x: 9, y: 0, z: 11 }),
  );
  assert.equal(stamped.lit, false);
  assert.equal(stamped.cord.length, sparked.cord.length);
  assert.equal(stamped.sparkIndex, 2);
  const stranger = applyStamp(
    { ...stamped, lit: true, stampTile: { x: 9, y: 0, z: 10 }, stamperIds: [] },
    move(scene.units, "enemy-sentry-1", { x: 9, y: 0, z: 11 }),
  );
  assert.equal(stranger.lit, true);
  const dead = applyStamp(
    { ...stamped, lit: true, stampTile: { x: 9, y: 0, z: 10 }, stamperIds: ["enemy-sentry-1"] },
    move(scene.units, "enemy-sentry-1", { x: 9, y: 0, z: 11 }, 0),
  );
  assert.equal(dead.lit, true);
  const relit = lightCord(
    stamped,
    { ...unit(scene.units, PLACHY_ID), pos: { x: 10, y: 0, z: 10 } },
    scene.grid,
    () => 0,
  );
  assert.ok(relit);
  assert.equal(relit!.lit, true);
  assert.equal(relit!.sparkIndex, 2);
}

{
  const scene = yard();
  let clock = scene.clock;
  let units = scene.units;
  let carts = advanceCarts(clock, scene.grid, units);
  assert.equal(carts.clock.deliveries, 1);
  assert.equal(carts.clock.cart, null);
  assert.equal(carts.clock.spawnQueued, true);
  carts = advanceCarts(carts.clock, scene.grid, carts.units);
  assert.equal(carts.clock.deliveries, 2);
  carts = advanceCarts(carts.clock, scene.grid, carts.units);
  assert.equal(carts.clock.deliveries, 3);
  assert.equal(judgeMission3(carts.clock, carts.units).loss, "delivery");

  const line = yard();
  units = line.units;
  clock = line.clock;
  const seat1 = unit(units, ZAK2_ID);
  const seat0 = unit(units, HAVEL_ID);
  const plachy = unit(units, PLACHY_ID);
  assert.equal(reachAp(line.grid, seat1, units, { x: 8, y: 0, z: 10 }), 1);
  units = move(units, ZAK2_ID, { x: 8, y: 0, z: 10 });
  clock = layCord(clock, unit(units, ZAK2_ID), [{ x: 9, y: 0, z: 10 }], line.grid, units)!;
  assert.equal(reachAp(line.grid, unit(units, HAVEL_ID), units, { x: 9, y: 0, z: 10 }), 1);
  units = move(units, HAVEL_ID, { x: 9, y: 0, z: 10 });
  clock = layCord(clock, unit(units, HAVEL_ID), [{ x: 10, y: 0, z: 10 }], line.grid, units)!;
  assert.equal(layCord(clock, unit(units, HAVEL_ID), [STORE_DOOR], line.grid, units), null);
  assert.equal(reachAp(line.grid, plachy, units, { x: 9, y: 0, z: 11 }), 1);
  units = move(units, PLACHY_ID, { x: 9, y: 0, z: 11 });
  clock = lightCord(clock, unit(units, PLACHY_ID), line.grid, () => 0)!;
  let step = closePlayerTurn(clock, line.grid, units);
  assert.equal(step.clock.sparkIndex, 1);
  assert.equal(step.clock.cord.length, 2);
  carts = advanceCarts(step.clock, line.grid, step.units);
  assert.equal(carts.clock.deliveries, 1);

  units = move(carts.units, HAVEL_ID, { x: 10, y: 0, z: 10 });
  clock = layCord(carts.clock, unit(units, HAVEL_ID), [{ x: 11, y: 0, z: 10 }], line.grid, units)!;
  assert.equal(layCord(clock, unit(units, HAVEL_ID), [STORE_DOOR], line.grid, units), null);
  step = closePlayerTurn(clock, line.grid, units);
  assert.equal(step.clock.sparkIndex, 2);
  carts = advanceCarts(step.clock, line.grid, step.units);
  assert.equal(carts.clock.deliveries, 2);

  units = move(carts.units, HAVEL_ID, { x: 11, y: 0, z: 10 });
  clock = layCord(carts.clock, unit(units, HAVEL_ID), [STORE_DOOR], line.grid, units)!;
  step = closePlayerTurn(clock, line.grid, units);
  assert.equal(step.clock.cookedOff, true);
  carts = advanceCarts(step.clock, line.grid, step.units);
  assert.equal(carts.clock.deliveries, 2);

  const waiting = yard();
  carts = advanceCarts(waiting.clock, waiting.grid, waiting.units);
  carts = advanceCarts(carts.clock, waiting.grid, carts.units);
  units = move(carts.units, ZAK2_ID, { x: 8, y: 0, z: 10 });
  clock = layCord(carts.clock, unit(units, ZAK2_ID), [{ x: 9, y: 0, z: 10 }], waiting.grid, units)!;
  units = move(units, HAVEL_ID, { x: 9, y: 0, z: 10 });
  clock = layCord(clock, unit(units, HAVEL_ID), [{ x: 10, y: 0, z: 10 }], waiting.grid, units)!;
  units = move(units, PLACHY_ID, { x: 9, y: 0, z: 11 });
  clock = lightCord(clock, unit(units, PLACHY_ID), waiting.grid, () => 0)!;
  step = closePlayerTurn(clock, waiting.grid, units);
  units = move(step.units, HAVEL_ID, { x: 10, y: 0, z: 10 });
  clock = layCord(step.clock, unit(units, HAVEL_ID), [{ x: 11, y: 0, z: 10 }], waiting.grid, units)!;
  step = closePlayerTurn(clock, waiting.grid, units);
  assert.equal(step.clock.cord.some((cell) => cell.x === 12 && cell.z === 10), false);
  carts = advanceCarts(step.clock, waiting.grid, step.units);
  assert.equal(carts.clock.deliveries, 3);
  assert.equal(judgeMission3(carts.clock, carts.units).loss, "delivery");

  const sworn = createMission3Units(cold);
  const rope = createMission3Grid();
  let oathClock = freshClock();
  carts = advanceCarts(oathClock, rope, sworn);
  units = move(carts.units, ONDREJ_ID, { x: 8, y: 0, z: 10 });
  oathClock = layCord(
    carts.clock,
    unit(units, ONDREJ_ID),
    [
      { x: 9, y: 0, z: 10 },
      { x: 10, y: 0, z: 10 },
    ],
    rope,
    units,
  )!;
  units = move(units, PLACHY_ID, { x: 9, y: 0, z: 11 });
  oathClock = lightCord(oathClock, unit(units, PLACHY_ID), rope, () => 0)!;
  step = closePlayerTurn(oathClock, rope, units);
  carts = advanceCarts(step.clock, rope, step.units);
  assert.equal(
    layCord(
      carts.clock,
      unit(carts.units, ONDREJ_ID),
      [
        { x: 11, y: 0, z: 10 },
        STORE_DOOR,
      ],
      rope,
      carts.units,
    ),
    null,
  );
  assert.equal(reachAp(rope, unit(carts.units, ONDREJ_ID), carts.units, { x: 10, y: 0, z: 10 }), 1);
  units = move(carts.units, ONDREJ_ID, { x: 10, y: 0, z: 10 });
  oathClock = layCord(
    carts.clock,
    unit(units, ONDREJ_ID),
    [
      { x: 11, y: 0, z: 10 },
      STORE_DOOR,
    ],
    rope,
    units,
  )!;
  step = closePlayerTurn(oathClock, rope, units);
  assert.equal(step.clock.cookedOff, true);
  carts = advanceCarts(step.clock, rope, step.units);
  assert.equal(carts.clock.deliveries, 2);
}

{
  const scene = yard();
  const killed = move(scene.units, "enemy-bearer-1", SHOULDER, 0);
  let clock = dropCartAsKeg(scene.clock, scene.grid);
  assert.equal(scene.grid.getTile({ x: 16, y: 0, z: 8 })?.obstacle, "powder_keg");
  assert.equal(clock.deliveries, 0);
  let carts = advanceCarts(clock, scene.grid, killed);
  assert.equal(carts.clock.deliveries, 1);
  assert.equal(scene.grid.getTile({ x: 16, y: 0, z: 8 })?.obstacle, "powder_keg");
  carts = advanceCarts(carts.clock, scene.grid, carts.units);
  carts = advanceCarts(carts.clock, scene.grid, carts.units);
  assert.equal(carts.clock.deliveries, 3);

  const cutGrid = createMission3Grid();
  const cutUnits = move(createMission3Units(cold), ONDREJ_ID, { x: 14, y: 1, z: 12 });
  assert.equal(checkLineOfSight3D(cutGrid, { x: 14, y: 1, z: 12 }, SHOULDER).clear, true);
  const cut = cutTackle(freshClock(), cutGrid, unit(cutUnits, ONDREJ_ID), cutUnits, () => 0);
  assert.ok(cut);
  assert.equal(cut!.clock.silent, false);
  assert.equal(unit(cut!.units, "enemy-bearer-1").alive, true);
  assert.equal(unit(cut!.units, "enemy-bearer-1").attachedToCart, false);
  assert.equal(cutGrid.getTile({ x: 16, y: 0, z: 8 })?.obstacle, "powder_keg");
  carts = advanceCarts(cut!.clock, cutGrid, cut!.units);
  assert.equal(carts.clock.deliveries, 1);
  carts = advanceCarts(carts.clock, cutGrid, carts.units);
  carts = advanceCarts(carts.clock, cutGrid, carts.units);
  assert.equal(carts.clock.deliveries, 3);

  const blastGrid = createMission3Grid();
  blastGrid.setObstacle({ x: 16, y: 0, z: 8 }, "powder_keg");
  const quiet = freshClock();
  applyPowderBlast(blastGrid, preset, { x: 16, y: 0, z: 8 }, { shockwave: true, weather: "rain" });
  assert.equal(quiet.cookedOff, false);
}

{
  const scene = yard();
  const clock = freshClock();
  assert.equal(clock.coneWarned, false);
  assert.equal(clock.coneFired, false);
  const gunner = unit(scene.units, GUNNER_ID);
  const beside = move(scene.units, PLACHY_ID, { x: 16, y: 0, z: 12 });
  const plan = computeMission3Ai(scene.grid, gunner, beside, clock);
  assert.equal(plan.movePath.length, 0);
  assert.equal(clock.cone, null);

  const warned = breakSilence(clock, scene.grid, () => 0.9);
  assert.equal(warned.reliefDoor, "south");
  assert.equal(scene.grid.isDoorClosedAt(RELIEF_SOUTH), false);
  assert.equal(scene.grid.isDoorClosedAt(RELIEF_WEST), true);
  assert.equal(scene.units.some((candidate) => candidate.id.startsWith("enemy-relief")), false);
  const standing = move(beside, PLACHY_ID, { x: 15, y: 0, z: 8 });
  const hpBefore = unit(standing, PLACHY_ID).hp;
  const first = resolveSwedishTurn(warned, scene.grid, standing);
  assert.equal(first.clock.cone, "lane");
  assert.equal(first.clock.coneWarned, true);
  assert.equal(first.clock.coneFired, false);
  assert.equal(unit(first.units, PLACHY_ID).hp, hpBefore);
  assert.equal(unit(first.units, "enemy-sentry-1").pos.z, 13);
  assert.equal(unit(first.units, "enemy-sentry-2").pos.x, 15);
  assert.equal(first.units.some((candidate) => candidate.id === "enemy-relief-1"), true);
  assert.equal(first.units.some((candidate) => candidate.id === "enemy-relief-2"), true);
  assert.deepEqual(
    findPathAStar(scene.grid, { x: 8, y: 0, z: 14 }, RELIEF_WEST, first.units, PLACHY_ID),
    [],
  );
  const hunter = {
    ...unit(first.units, "enemy-sentry-2"),
    pos: { x: 8, y: 0 as const, z: 14 },
  };
  const hunt = computeEnemyAiDecision(scene.grid, hunter, first.units, "rain");
  assert.ok(!hunt.doorToOpen || hunt.doorToOpen.x !== RELIEF_WEST.x);

  const shifted = move(first.units, PLACHY_ID, { x: 16, y: 0, z: 11 });
  const marked = move(shifted, HAVEL_ID, { x: 15, y: 0, z: 8 });
  const second = resolveSwedishTurn(first.clock, scene.grid, marked);
  assert.equal(second.clock.cone, "lane");
  assert.equal(second.clock.coneFired, true);
  assert.equal(unit(second.units, HAVEL_ID).hp, unit(marked, HAVEL_ID).hp - 7);
  assert.equal(tile(15, 0, 8, scene.grid).damageLevel, 1);
  assert.equal(tile(15, 0, 8, scene.grid).walkable, true);
  assert.equal(unit(second.units, PLACHY_ID).hp, unit(marked, PLACHY_ID).hp);

  const direct = createMission3Grid();
  const body = move(createMission3Units(cold), PLACHY_ID, { x: 16, y: 0, z: 11 });
  const raked = applyCanister(direct, body, { ...freshClock(), cone: "court", coneWarned: true });
  assert.equal(unit(raked.units, PLACHY_ID).hp, unit(body, PLACHY_ID).hp - 7);
  const blocked = applyCanister(
    direct,
    move(body, PLACHY_ID, { x: 12, y: 0, z: 10 }),
    { ...freshClock(), cone: "cord", coneWarned: true },
  );
  assert.equal(unit(blocked.units, PLACHY_ID).hp, 12);
  for (const cone of ["lane", "court", "cord"] as const) {
    const high = applyCanister(
      direct,
      move(body, PLACHY_ID, { x: 12, y: 1, z: 13 }),
      { ...freshClock(), cone, coneWarned: true },
    );
    assert.equal(unit(high.units, PLACHY_ID).hp, 12);
  }
  assert.equal(selectCone(direct, body), "court");
  assert.equal(selectCone(direct, createMission3Units(cold)), "lane");
}

{
  const scene = yard();
  let clock = freshClock();
  let units = move(createMission3Units(cold), ONDREJ_ID, { x: 8, y: 0, z: 12 });
  const armed = armClimb(clock, unit(units, ONDREJ_ID));
  assert.ok(armed);
  let climbed = resolveClimbs(armed!, units);
  assert.deepEqual(unit(climbed.units, ONDREJ_ID).pos, { x: 8, y: 1, z: 12 });
  assert.equal(
    armClimb(clock, { ...unit(scene.units, ZAK2_ID), pos: { x: 8, y: 0, z: 12 } }),
    null,
  );

  units = move(scene.units, PLACHY_ID, STAIR_FOOT);
  clock = armClimb(freshClock(), unit(units, PLACHY_ID))!;
  climbed = resolveClimbs(clock, units);
  assert.deepEqual(unit(climbed.units, PLACHY_ID).pos, STAIR_FOOT);
  assert.equal(climbed.clock.stairProgress[PLACHY_ID], 1);
  units = climbed.units.map((candidate) =>
    candidate.id === PLACHY_ID ? { ...candidate, hp: candidate.hp - 1 } : candidate,
  );
  assert.equal(climbed.clock.stairProgress[PLACHY_ID], 1);
  clock = armClimb(climbed.clock, unit(units, PLACHY_ID))!;
  climbed = resolveClimbs(clock, units);
  assert.deepEqual(unit(climbed.units, PLACHY_ID).pos, STAIR_HEAD);

  units = move(scene.units, PLACHY_ID, STAIR_FOOT);
  clock = armClimb(freshClock(), unit(units, PLACHY_ID))!;
  climbed = resolveClimbs(clock, units);
  units = move(climbed.units, PLACHY_ID, { x: 9, y: 0, z: 12 });
  climbed = resolveClimbs(climbed.clock, units);
  assert.equal(climbed.clock.stairProgress[PLACHY_ID], undefined);

  units = move(scene.units, PLACHY_ID, STAIR_HEAD);
  clock = armClimb(freshClock(), unit(units, PLACHY_ID))!;
  climbed = resolveClimbs(clock, units);
  assert.deepEqual(unit(climbed.units, PLACHY_ID).pos, STAIR_FOOT);
}

{
  const scene = yard();
  let units = move(scene.units, PLACHY_ID, { x: 8, y: 0, z: 10 });
  let clock = { ...freshClock(), cookedOff: true, deliveries: 2 };
  assert.equal(judgeMission3(clock, units).outcome, "ongoing");
  units = move(units, PLACHY_ID, { x: 6, y: 0, z: 9 });
  assert.equal(judgeMission3(clock, units).victoryReason, "skiff");
  assert.equal(judgeMission3({ ...clock, deliveries: 0 }, units).outcome, "victory");
  assert.equal(judgeMission3({ ...clock, deliveries: 2 }, units).outcome, "victory");
  assert.notEqual(judgeMission3({ ...clock, deliveries: 3 }, units).outcome, "victory");
  const fallen = move(units, PLACHY_ID, { x: 6, y: 0, z: 9 }, 0);
  assert.equal(judgeMission3(clock, fallen).loss, "plachy");
  const removed = fallen.filter((candidate) => candidate.id !== PLACHY_ID);
  assert.equal(judgeMission3(clock, removed).loss, "plachy");
  assert.equal(judgeMission3(clock, units).outcome, "victory");
}

{
  const scene = yard();
  const cooked = cookOff(scene.grid, scene.units, freshClock());
  assert.equal(tile(9, 0, 10, scene.grid).damageLevel, 2);
  assert.equal(tile(9, 0, 10, scene.grid).walkable, true);
  assert.equal(tile(9, 0, 10, scene.grid).surface, "scorched_ruin");
  assert.equal(tile(5, 0, 10, scene.grid).surface, "water");
  assert.ok((tile(5, 0, 10, scene.grid).damageLevel ?? 0) === 0);
  assert.equal(tile(6, 0, 9, scene.grid).surface, "wood_dock");
  assert.equal(tile(15, 0, 10, scene.grid).obstacle, "pillar");
  assert.equal(tile(16, 0, 12, scene.grid).obstacle, "none");
  assert.equal(tile(16, 0, 12, scene.grid).walkable, true);
  assert.ok((tile(9, 0, 10, scene.grid).smokeTurns ?? 0) >= 5);
  assert.ok((tile(12, 1, 13, scene.grid).smokeTurns ?? 0) >= 3);
  scene.grid.decaySmoke("rain");
  assert.equal(tile(9, 0, 10, scene.grid).smokeTurns, 3);
  assert.equal(cooked.clock.cookedOff, true);
  assert.equal(cooked.clock.deliveries, 0);

  const south = createMission3Grid();
  cookOff(south, createMission3Units(cold), freshClock());
  const southCourt = tile(10, 0, 14, south).smokeTurns;
  const southLodge = tile(8, 0, 12, south).smokeTurns;
  south.setDoorState(RELIEF_SOUTH, "open");
  south.decaySmoke("rain");
  assert.equal(southCourt - tile(10, 0, 14, south).smokeTurns, 2);
  assert.equal(southLodge - tile(8, 0, 12, south).smokeTurns, 1);

  const west = createMission3Grid();
  cookOff(west, createMission3Units(cold), freshClock());
  const westCourt = tile(10, 0, 14, west).smokeTurns;
  const westLodge = tile(8, 0, 12, west).smokeTurns;
  west.setDoorState(RELIEF_WEST, "open");
  west.decaySmoke("rain");
  assert.equal(westCourt - tile(10, 0, 14, west).smokeTurns, 2);
  assert.equal(westLodge - tile(8, 0, 12, west).smokeTurns, 1);
}

{
  const scene = yard();
  const swede = unit(scene.units, "enemy-sentry-1");
  const target = unit(scene.units, PLACHY_ID);
  const outdoor = calculateShot(
    scene.grid,
    { ...swede, pos: { x: 9, y: 0, z: 10 } },
    { ...target, pos: { x: 9, y: 0, z: 11 } },
    "rain",
  );
  assert.equal(outdoor.misfireChance, 20);
  const indoor = calculateShot(
    scene.grid,
    { ...swede, pos: { x: 14, y: 0, z: 8 } },
    { ...target, pos: { x: 14, y: 0, z: 9 } },
    "rain",
  );
  assert.equal(indoor.misfireChance, 6);
  const plachy = unit(scene.units, PLACHY_ID);
  const wheelOut = calculateShot(
    scene.grid,
    { ...plachy, pos: { x: 9, y: 0, z: 10 } },
    { ...swede, pos: { x: 10, y: 0, z: 10 } },
    "rain",
  );
  assert.equal(wheelOut.misfireChance, 7);
  const wheelIn = calculateShot(
    scene.grid,
    { ...plachy, pos: { x: 12, y: 1, z: 13 } },
    { ...swede, pos: { x: 12, y: 0, z: 13 } },
    "rain",
  );
  assert.equal(wheelIn.misfireChance, 3);
}

{
  const bridge = createMission2Grid();
  assert.equal(bridge.isEnclosedRoofed(12, 0, 14), true);
  assert.equal(bridge.isEnclosedRoofed(5, 0, 14), false);
  assert.equal(bridge.getRoofParapetCover({ x: 5, y: 0, z: 11 }, "N"), "half");
  const yardGrid = createMission3Grid();
  assert.equal(yardGrid.isEnclosedRoofed(5, 0, 14), false);
  assert.equal(yardGrid.getRoofParapetCover({ x: 5, y: 0, z: 11 }, "N"), "none");
  const palaceGrid = createInitialGrid();
  assert.equal(palaceGrid.isEnclosedRoofed(11, 0, 22), true);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 400; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    const s = useGameStore.getState();
    if (!s.isBusy && (s.turn === "player" || s.outcome !== "ongoing")) return;
  }
  throw new Error("Timed out waiting for turn to settle");
}

async function storeRoundTrip(): Promise<void> {
  useGameStore.setState({
    campaign: { oath: null, mission1SurvivorId: "player-jan-matej" },
  });
  useGameStore.getState().beginScenario("mission3");
  const started = useGameStore.getState();
  assert.equal(started.weather, "rain");
  assert.equal(started.activeFloor, 0);
  assert.equal(started.fogOfWarEnabled, false);
  assert.ok(started.units.some((unit) => unit.id === HAVEL_ID));
  assert.ok(started.units.some((unit) => unit.id === ONDREJ_ID));
  assert.equal(started.combatLog.some((entry) => entry.message.id === "log.m3.watergate"), true);
  assert.equal(checkMissionOutcome(started.grid, started.units, started.m2, started.m3).outcome, "ongoing");

  const beforeAp = started.units.find((unit) => unit.id === ONDREJ_ID)?.ap ?? 0;
  useGameStore.setState({
    units: started.units.map((unit) =>
      unit.id === ONDREJ_ID ? { ...unit, pos: { x: 8, y: 0, z: 10 } } : unit,
    ),
    selectedUnitId: ONDREJ_ID,
    actionMode: "lay",
  });
  useGameStore.getState().layCordAt({ x: 6, y: 0, z: 9 });
  const rejected = useGameStore.getState();
  assert.equal(rejected.m3?.cord.length, 0);
  assert.equal(rejected.actionMode, "lay");
  useGameStore.getState().layCordAt({ x: 10, y: 0, z: 10 });
  const laid = useGameStore.getState();
  assert.equal(laid.m3?.cord.length, 2);
  assert.equal(laid.m3?.silent, true);
  assert.equal(laid.m3?.lit, false);
  assert.equal(laid.actionMode, "move");
  assert.equal(laid.units.find((unit) => unit.id === ONDREJ_ID)?.ap, beforeAp - 1);
  assert.equal(laid.combatLog.some((entry) => entry.message.id === "log.m3.cord.lay"), true);

  useGameStore.getState().endTurn();
  await settle();
  const second = useGameStore.getState();
  assert.equal(second.turn, "player");
  assert.equal(second.round, 2);
  assert.equal(second.outcome, "ongoing");
  const havel = second.units.find((unit) => unit.id === HAVEL_ID);
  assert.ok(havel);
  assert.equal(havel.movePerAp, 6);
  assert.equal(second.m3?.cookedOff, false);
  assert.equal(second.combatLog.some((entry) => entry.message.id === "log.m3.round.player"), true);
  assert.equal(second.combatLog.some((entry) => entry.message.id === "log.round.player"), false);

  const keg = { x: 9, y: 0 as const, z: 10 };
  second.grid.setObstacle(keg, "powder_keg");
  assert.equal(checkLineOfSight3D(second.grid, { x: 6, y: 0, z: 9 }, keg).clear, true);
  useGameStore.getState().handleTileClick(keg);
  await settle();
  const afterKeg = useGameStore.getState();
  assert.equal(afterKeg.m3?.cookedOff, false);
  assert.equal(afterKeg.m3?.silent, false);
  assert.notEqual(afterKeg.grid.getTile(keg)?.obstacle, "powder_keg");

  useGameStore.setState((state) => ({
    m3: state.m3 ? { ...state.m3, cookedOff: true, deliveries: 2 } : state.m3,
    units: state.units.map((unit) =>
      unit.id === PLACHY_ID ? { ...unit, pos: { x: 6, y: 0, z: 9 }, alive: true, hp: 12 } : unit,
    ),
  }));
  const skiffState = useGameStore.getState();
  const skiff = checkMissionOutcome(skiffState.grid, skiffState.units, skiffState.m2, skiffState.m3);
  assert.equal(skiff.outcome, "victory");
  assert.equal(skiff.victoryReason, "skiff");

  const kept = {
    oath: { havel: "refuse" as const, ondrej: "accept" as const },
    mission1SurvivorId: "player-jan-matej",
  };
  useGameStore.setState({ campaign: kept });
  useGameStore.getState().beginScenario("mission3");
  const refused = useGameStore.getState();
  assert.equal(refused.units.some((unit) => unit.id === HAVEL_ID), false);
  assert.equal(refused.units.some((unit) => unit.id === ZAK1_ID), true);
  useGameStore.getState().beginScenario("mission1");
  const back = useGameStore.getState();
  assert.deepEqual(back.campaign, kept);
  assert.equal(back.m3, null);
  assert.equal(back.grid.isEnclosedRoofed(10, 1, 22), true);
  assert.equal(back.grid.isEnclosedRoofed(5, 0, 10), false);

  const storeStep1Ap = (unitId: string, to: { x: number; y: 0 | 1 | 2; z: number }) => {
    const s = useGameStore.getState();
    const u = s.units.find((c) => c.id === unitId)!;
    const reach = computeReachableTiles(s.grid, u, s.units);
    const entry = reach.get(`${to.x},${to.y},${to.z}`);
    assert.ok(entry && entry.apCost === 1, `${unitId} can reach (${to.x},${to.y},${to.z}) in 1 AP`);
    useGameStore.setState({
      units: s.units.map((c) =>
        c.id === unitId ? { ...c, pos: { ...to }, ap: c.ap - 1 } : c,
      ),
      selectedUnitId: unitId,
    });
  };

  // Canonical Line 1: No-Ondřej Turn-1 Victory
  useGameStore.setState({
    campaign: { oath: { havel: "accept", ondrej: "refuse" }, mission1SurvivorId: null },
  });
  useGameStore.getState().beginScenario("mission3");
  storeStep1Ap(ZAK2_ID, { x: 8, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 9, y: 0, z: 10 });
  storeStep1Ap(HAVEL_ID, { x: 9, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 10, y: 0, z: 10 });
  storeStep1Ap(PLACHY_ID, { x: 9, y: 0, z: 11 });
  useGameStore.getState().lightMission3Cord();
  useGameStore.getState().endTurn();
  await settle();
  {
    const st1 = useGameStore.getState();
    assert.equal(st1.m3?.deliveries, 1);
    assert.equal(st1.m3?.sparkIndex, 1);
    assert.equal(st1.m3?.coneWarned, true);
    assert.equal(st1.m3?.coneFired, false);
  }
  storeStep1Ap(HAVEL_ID, { x: 10, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 11, y: 0, z: 10 });
  useGameStore.getState().endTurn();
  await settle();
  {
    const st2 = useGameStore.getState();
    assert.equal(st2.m3?.deliveries, 2);
    assert.equal(st2.m3?.sparkIndex, 2);
    assert.equal(st2.m3?.coneFired, true);
  }
  storeStep1Ap(HAVEL_ID, { x: 11, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 12, y: 0, z: 10 });
  useGameStore.getState().endTurn();
  await settle();
  {
    const st3 = useGameStore.getState();
    assert.equal(st3.m3?.cookedOff, true);
    assert.equal(st3.m3?.deliveries, 2);
  }
  useGameStore.setState((s) => ({
    units: s.units.map((c) =>
      c.id === PLACHY_ID ? { ...c, pos: { x: 6, y: 0, z: 9 }, alive: true, hp: 12 } : c,
    ),
  }));
  {
    const s = useGameStore.getState();
    const win = checkMissionOutcome(s.grid, s.units, s.m2, s.m3);
    assert.equal(win.outcome, "victory");
    assert.equal(win.victoryReason, "skiff");
  }

  // Canonical Line 2: Skiff-Wait Loss (no Ondřej)
  useGameStore.setState({
    campaign: { oath: { havel: "accept", ondrej: "refuse" }, mission1SurvivorId: null },
  });
  useGameStore.getState().beginScenario("mission3");
  useGameStore.getState().endTurn();
  await settle();
  assert.equal(useGameStore.getState().m3?.deliveries, 1);
  assert.equal(useGameStore.getState().m3?.cord.length, 0);
  storeStep1Ap(ZAK2_ID, { x: 8, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 9, y: 0, z: 10 });
  storeStep1Ap(HAVEL_ID, { x: 9, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 10, y: 0, z: 10 });
  storeStep1Ap(PLACHY_ID, { x: 9, y: 0, z: 11 });
  useGameStore.getState().lightMission3Cord();
  useGameStore.getState().endTurn();
  await settle();
  assert.equal(useGameStore.getState().m3?.deliveries, 2);
  assert.equal(useGameStore.getState().m3?.cord.length, 2);
  storeStep1Ap(HAVEL_ID, { x: 10, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 11, y: 0, z: 10 });
  useGameStore.getState().endTurn();
  await settle();
  {
    const lost = useGameStore.getState();
    assert.equal(lost.m3?.deliveries, 3);
    assert.equal(lost.m3?.cookedOff, false);
    assert.equal(lost.outcome, "defeat");
    assert.equal(lost.m3?.loss, "delivery");
  }

  // Canonical Line 3: Ondřej Buy-Back Victory
  useGameStore.setState({
    campaign: { oath: { havel: "accept", ondrej: "accept" }, mission1SurvivorId: null },
  });
  useGameStore.getState().beginScenario("mission3");
  useGameStore.getState().endTurn();
  await settle();
  assert.equal(useGameStore.getState().m3?.deliveries, 1);
  assert.equal(useGameStore.getState().m3?.cord.length, 0);
  storeStep1Ap(ONDREJ_ID, { x: 8, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 10, y: 0, z: 10 });
  storeStep1Ap(PLACHY_ID, { x: 9, y: 0, z: 11 });
  useGameStore.getState().lightMission3Cord();
  useGameStore.getState().endTurn();
  await settle();
  assert.equal(useGameStore.getState().m3?.deliveries, 2);
  assert.equal(useGameStore.getState().m3?.cord.length, 2);
  assert.equal(useGameStore.getState().m3?.sparkIndex, 1);
  storeStep1Ap(ONDREJ_ID, { x: 10, y: 0, z: 10 });
  useGameStore.getState().setActionMode("lay");
  useGameStore.getState().layCordAt({ x: 12, y: 0, z: 10 });
  useGameStore.getState().endTurn();
  await settle();
  {
    const st3 = useGameStore.getState();
    assert.equal(st3.m3?.cookedOff, true);
    assert.equal(st3.m3?.deliveries, 2);
  }
  useGameStore.setState((s) => ({
    units: s.units.map((c) =>
      c.id === PLACHY_ID ? { ...c, pos: { x: 6, y: 0, z: 9 }, alive: true, hp: 12 } : c,
    ),
  }));
  {
    const s = useGameStore.getState();
    const win = checkMissionOutcome(s.grid, s.units, s.m2, s.m3);
    assert.equal(win.outcome, "victory");
    assert.equal(win.victoryReason, "skiff");
  }

  // Q9 regressions: M3 floor cap P0/P1, preferredFogOfWar persistence, HOLD enemy death throes expiry
  useGameStore.getState().setActiveFloor(0);
  useGameStore.getState().toggleFloor();
  assert.equal(useGameStore.getState().activeFloor, 1);
  useGameStore.getState().toggleFloor();
  assert.equal(useGameStore.getState().activeFloor, 0, "Mission 3 floor toggle must stay capped at P0/P1");

  useGameStore.getState().setFogOfWarEnabled(false);
  useGameStore.getState().beginScenario("mission2");
  assert.equal(useGameStore.getState().fogOfWarEnabled, false, "preferredFogOfWar must persist across beginScenario in M1/M2");
  useGameStore.getState().setFogOfWarEnabled(true);
  useGameStore.getState().beginScenario("mission3");
  assert.equal(useGameStore.getState().fogOfWarEnabled, false, "Mission 3 always initializes fogOfWarEnabled=false");

  useGameStore.setState((s) => ({
    turn: "player",
    isBusy: false,
    outcome: "ongoing",
    units: s.units.map((u) =>
      u.id === "enemy-sentry-1"
        ? { ...u, aiStance: "HOLD", alive: true, hp: -2, inDeathThroes: true, deathThroesTurns: 1 }
        : u,
    ),
  }));
  useGameStore.getState().endTurn();
  await settle();
  const sentryAfterTurn = useGameStore.getState().units.find((u) => u.id === "enemy-sentry-1");
  assert.equal(sentryAfterTurn?.alive, false, "HOLD enemy in Death Throes must expire on endTurn");

  // Tactical enhancements verification: COURTYARD_KEG, directional cover, Falconet disruption, gunner death, and AI spark flanking
  {
    const tacGrid = createMission3Grid();
    assert.equal(tacGrid.getTile(COURTYARD_KEG)?.obstacle, "powder_keg");
    assert.equal(tacGrid.getTile({ x: 9, y: 0, z: 11 })?.cover.S, "half");
    assert.equal(tacGrid.getTile({ x: 8, y: 0, z: 10 })?.cover.S, "half");
    assert.equal(tacGrid.getTile({ x: 14, y: 1, z: 12 })?.cover.N, "half");
    assert.equal(tacGrid.getTile({ x: 14, y: 1, z: 12 })?.cover.S, "half");

    const baseUnits = createMission3Units(cold);
    const lodgeOndrej = move(baseUnits, ONDREJ_ID, { x: 14, y: 1, z: 12 });
    const aimedClock: Mission3Clock = {
      ...freshClock(),
      silent: false,
      coneWarned: true,
      cone: "cord",
      coneFired: false,
    };
    assert.equal(canDisruptFalconet(aimedClock, tacGrid, unit(lodgeOndrej, ONDREJ_ID), lodgeOndrej), true);
    const disrupted = applyDisruptFalconet(aimedClock, tacGrid, unit(lodgeOndrej, ONDREJ_ID), lodgeOndrej);
    assert.ok(disrupted);
    assert.equal(disrupted!.clock.coneWarned, false);
    assert.equal(disrupted!.clock.cone, null);
    assert.equal(unit(disrupted!.units, GUNNER_ID).isShaken, true);

    // Next Swedish turn must re-warn instead of firing canister
    const afterDisruptTurn = resolveSwedishTurn(disrupted!.clock, tacGrid, disrupted!.units);
    assert.equal(afterDisruptTurn.clock.coneWarned, true);
    assert.equal(afterDisruptTurn.clock.coneFired, false);

    // Dead gunner silences falconet
    const deadGunnerUnits = lodgeOndrej.map((u) =>
      u.id === GUNNER_ID ? { ...u, hp: 0, alive: false } : u,
    );
    const silencedTurn = resolveSwedishTurn(aimedClock, tacGrid, deadGunnerUnits);
    assert.equal(silencedTurn.clock.cone, null);
    assert.equal(silencedTurn.clock.coneWarned, false);
    assert.equal(silencedTurn.clock.coneFired, false);

    // AI spark flanking from z >= 11 without stepping onto cord corridor z = 10
    const litClock: Mission3Clock = {
      ...aimedClock,
      lit: true,
      cord: [{ x: 9, y: 0, z: 10 }],
      sparkIndex: 0,
    };
    const flankSentryUnits = move(baseUnits, "enemy-sentry-1", { x: 10, y: 0, z: 13 });
    const aiPlan = computeMission3Ai(
      tacGrid,
      unit(flankSentryUnits, "enemy-sentry-1"),
      flankSentryUnits,
      litClock,
    );
    assert.ok(aiPlan.movePath.length > 0);
    const aiDest = aiPlan.movePath[aiPlan.movePath.length - 1]!;
    assert.equal(aiDest.z >= 11, true, "AI hunter must flank from z >= 11 and never block cord corridor z = 10");

    // Store round-trip for disruptMission3Falconet
    useGameStore.getState().beginScenario("mission3");
    useGameStore.setState((s) => ({
      m3: s.m3 ? { ...s.m3, silent: false, coneWarned: true, cone: "court" } : s.m3,
      selectedUnitId: ONDREJ_ID,
      units: s.units.map((u) =>
        u.id === ONDREJ_ID ? { ...u, pos: { x: 14, y: 1, z: 12 }, ap: 2 } : u,
      ),
    }));
    useGameStore.getState().disruptMission3Falconet();
    const afterStoreDisrupt = useGameStore.getState();
    assert.equal(afterStoreDisrupt.m3?.coneWarned, false);
    assert.equal(afterStoreDisrupt.m3?.cone, null);
    assert.equal(afterStoreDisrupt.units.find((u) => u.id === ONDREJ_ID)?.ap, 1);
    assert.equal(
      afterStoreDisrupt.combatLog.some((e) => e.message.id === "log.m3.falconet.disrupt"),
      true,
    );
  }
}

void storeRoundTrip().then(
  () => {
    console.log("mission 3 ok");
  },
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
