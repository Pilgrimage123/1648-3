import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { addLightFlash } from "../src/store/storeUtils";
import { isFixtureDucked, retainFlashes } from "../src/components/canvas/diegeticLights";
import { appendVictoryLog, resolveShotImpactMetadata } from "../src/store/combatResolution";
import { evaluateVisibleTargets } from "../src/core/CombatSystem";
import { createInitialGrid, getMission1EscapeTile } from "../src/core/GridSystem";
import { createMission2Grid } from "../src/core/mission2";
import { createMission3Grid } from "../src/core/mission3";
import { useGameStore } from "../src/store/useGameStore";
import { text } from "../src/i18n/runtime";

test("addLightFlash uses performance.now() epoch and retains/expires flashes cleanly", () => {
  const before = performance.now();
  const flashes = addLightFlash([], {
    kind: "muzzle",
    coord: { x: 5, y: 0, z: 10 },
    world: { x: 0, y: 1, z: 0 },
    color: "#fde047",
    intensity: 8,
    radius: 6,
    durationMs: 120,
  });
  const after = performance.now();

  assert.equal(flashes.length, 1);
  assert.ok(
    flashes[0].createdAt >= before - 5 && flashes[0].createdAt <= after + 5,
    `expected createdAt (${flashes[0].createdAt}) near performance.now() (${before}..${after}), not Date.now()`,
  );

  // Guard against negative ages (out-of-order / future timestamps must not stick active)
  const futureFlash = {
    kind: "blast" as const,
    coord: { x: 5, y: 0 as const, z: 10 },
    createdAt: 10_000,
    durationMs: 650,
  };
  assert.equal(isFixtureDucked({ x: 5, y: 0, z: 10 }, 500, [futureFlash], []), false);
  assert.equal(isFixtureDucked({ x: 5, y: 0, z: 10 }, 10_100, [futureFlash], []), true);
  assert.equal(isFixtureDucked({ x: 5, y: 0, z: 10 }, 10_700, [futureFlash], []), false);

  const retained = retainFlashes([futureFlash], "muzzle", 500);
  assert.equal(retained.length, 0);
});

test("appendVictoryLog picks mute vs scar phrase from m3Deliveries", () => {
  const muteLogs = appendVictoryLog(
    [],
    4,
    { outcome: "victory", victoryReason: "skiff" },
    0,
  );
  const scarLogs = appendVictoryLog(
    [],
    4,
    { outcome: "victory", victoryReason: "skiff" },
    2,
  );

  assert.equal(muteLogs.length, 1);
  assert.equal(scarLogs.length, 1);
  assert.equal(muteLogs[0].message.id, "log.m3.victory.mute");
  assert.equal(scarLogs[0].message.id, "log.m3.victory.scar");
});

test("evaluateVisibleTargets pierces smoke when klementinum_verdict is active", () => {
  useGameStore.getState().beginScenario("mission1");
  useGameStore.getState().skipGuidedTutorial();
  const s = useGameStore.getState();

  // Create a clean grid and place three tiles of smoke directly between shooter and target
  const grid = createInitialGrid();
  const vaclavUnit = s.units.find((u) => u.id === "player-vaclav-michalovic")!;
  assert.ok(vaclavUnit, "mission1 should have player-vaclav-michalovic");
  const shooter = {
    ...vaclavUnit,
    pos: { x: 8, y: 0 as const, z: 13 },
    alive: true,
    hp: 6,
    ap: 2,
    ability: {
      id: "klementinum_verdict" as const,
      name: "Svatováclavský ortel",
      subtitle: "Průraz dýmem",
      description: "Test",
      apCost: 1 as const,
      cooldownTurns: 3,
      currentCooldown: 0,
    },
    abilityBuffActive: false,
  };
  const target = {
    ...s.units.find((u) => u.faction === "enemy")!,
    pos: { x: 14, y: 0 as const, z: 13 },
    alive: true,
    hp: 6,
  };

  // Clear obstacles along z=12..14 from x=8..14 and lay a dense smoke curtain on x=10..12
  for (let z = 12; z <= 14; z++) {
    for (let x = 8; x <= 14; x++) {
      const t = grid.getTile({ x, y: 0, z });
      if (t) {
        t.hasFloor = true;
        t.obstacle = "none";
        t.walkable = true;
        t.smokeTurns = x >= 10 && x <= 12 ? 3 : 0;
      }
    }
  }

  const blocked = evaluateVisibleTargets(grid, shooter, [shooter, target], "clear");
  assert.equal(blocked.length, 0, "3 smoke tiles should block normal LOS");

  const pierced = evaluateVisibleTargets(
    grid,
    { ...shooter, abilityBuffActive: true },
    [shooter, target],
    "clear",
  );
  assert.equal(pierced.length, 1, "klementinum_verdict should pierce smoke in evaluateVisibleTargets");
  assert.equal(pierced[0].targetId, target.id);
});

test("powder keg click enforces guided tutorial and loaded firearm guards, and discharges firearm", async () => {
  useGameStore.getState().beginScenario("mission1"); // guided tutorial active at step_1_matej_move

  const s1 = useGameStore.getState();
  const kegTile = s1.grid.getAllTiles().find((t) => t.obstacle === "powder_keg");
  assert.ok(kegTile, "mission1 should have a powder_keg tile");

  // During step_1_matej_move, clicking a keg must be rejected and NOT detonate
  useGameStore.getState().handleTileClick(kegTile.coord);
  assert.equal(
    useGameStore.getState().grid.getTile(kegTile.coord)?.obstacle,
    "powder_keg",
    "keg should not detonate during disallowed guided step",
  );

  // In free play, an unloaded unit must not be able to shoot a keg
  useGameStore.getState().beginScenario("mission1");
  useGameStore.getState().skipGuidedTutorial();
  const s2 = useGameStore.getState();
  const vaclav = s2.units.find((u) => u.id === "player-vaclav-michalovic")!;
  const keg2 = s2.grid.getAllTiles().find((t) => t.obstacle === "powder_keg")!;
  // Position vaclav near the keg with clear line of sight on same floor
  const standCoord = { x: Math.max(2, keg2.coord.x - 1), y: keg2.coord.y, z: keg2.coord.z };
  const standTile = s2.grid.getTile(standCoord);
  if (standTile) {
    standTile.obstacle = "none";
    standTile.walkable = true;
  }

  useGameStore.setState({
    selectedUnitId: vaclav.id,
    units: s2.units.map((u) =>
      u.id === vaclav.id
        ? { ...u, pos: standCoord, ap: 2, firearmLoaded: false }
        : u,
    ),
  });
  useGameStore.getState().handleTileClick(keg2.coord);
  assert.equal(
    useGameStore.getState().grid.getTile(keg2.coord)?.obstacle,
    "powder_keg",
    "unloaded firearm must not detonate powder keg",
  );

  // Now load vaclav's firearm and click the keg to fire at it; verify firearm is discharged
  useGameStore.setState({
    units: useGameStore.getState().units.map((u) =>
      u.id === vaclav.id ? { ...u, firearmLoaded: true, ap: 2 } : u,
    ),
  });
  useGameStore.getState().handleTileClick(keg2.coord);
  // Allow the async keg shot promise (instant in headless node without window) to settle
  await new Promise((r) => setTimeout(r, 20));
  const vaclavAfter = useGameStore.getState().units.find((u) => u.id === vaclav.id)!;
  assert.equal(vaclavAfter.firearmLoaded, false, "keg shot must discharge shooter firearm");
  assert.equal(vaclavAfter.reloadProgress, 0, "keg shot must reset reloadProgress");
  assert.notEqual(
    useGameStore.getState().grid.getTile(keg2.coord)?.obstacle,
    "powder_keg",
    "keg should be detonated after loaded shot",
  );
});

test("executeReload on step_6_vaclav_reload syncs legacy tutorialStep alongside guidedTutorial", async () => {
  useGameStore.getState().beginScenario("mission1");
  const s = useGameStore.getState();
  const vaclav = s.units.find((u) => u.id === "player-vaclav-michalovic")!;

  useGameStore.setState({
    selectedUnitId: vaclav.id,
    guidedTutorial: {
      ...s.guidedTutorial,
      enabled: true,
      dismissed: false,
      currentStep: "step_6_vaclav_reload",
    },
    tutorialStep: 2,
    units: s.units.map((u) =>
      u.id === vaclav.id
        ? { ...u, ap: 2, firearmLoaded: false, reloadProgress: 0 }
        : u,
    ),
  });

  useGameStore.getState().executeReload();
  await new Promise((r) => setTimeout(r, 20));
  const after = useGameStore.getState();
  assert.equal(after.guidedTutorial.currentStep, "step_7_keg_explosion");
  assert.equal(after.tutorialStep, 3, "legacy tutorialStep should stay synced with step_7_keg_explosion");
});

test("ui.epilogue.defeatMeta renders distinct copy for zero_hp, all_companions_fallen, and detention", () => {
  const zeroHp = text("ui.epilogue.defeatMeta", { count: 4, capture: "zero_hp" });
  const companions = text("ui.epilogue.defeatMeta", { count: 4, capture: "all_companions_fallen" });
  const detained = text("ui.epilogue.defeatMeta", { count: 4, capture: "surrounded_unprotected" });

  assert.notEqual(zeroHp, detained);
  assert.notEqual(companions, detained);
  assert.notEqual(zeroHp, companions);
  assert.ok(zeroHp.includes("podlehl zraněním"));
  assert.ok(companions.includes("Celá eskorta padla"));
  assert.ok(detained.includes("zadržen po 2 kola"));
});

test("resolveShotImpactMetadata does not classify Mission 2/3 z>=15 misses as palace stucco or wood", () => {
  const m2Grid = createMission2Grid();
  const m3Grid = createMission3Grid();
  const res2 = resolveShotImpactMetadata(
    m2Grid,
    { x: 11, y: 0, z: 14 },
    { x: 14, y: 0, z: 16 },
    { hit: false, critical: false, misfired: false, damage: 0, armorShredded: 0, armorAbsorbed: 0, killed: false },
  );
  const res3 = resolveShotImpactMetadata(
    m3Grid,
    { x: 10, y: 0, z: 13 },
    { x: 12, y: 0, z: 15 },
    { hit: false, critical: false, misfired: false, damage: 0, armorShredded: 0, armorAbsorbed: 0, killed: false },
  );
  assert.notEqual(res2.impactObstacle, "palace_stucco");
  assert.notEqual(res2.impactObstacle, "palace_wood");
  assert.notEqual(res3.impactObstacle, "palace_stucco");
  assert.notEqual(res3.impactObstacle, "palace_wood");
});

test("preferredRenderMode defaults to 2D_SPRITE across all 3 missions and persists across switches", () => {
  const store = useGameStore.getState();
  store.setRenderMode("2D_SPRITE");
  for (const sc of ["mission1", "mission2", "mission3"] as const) {
    store.beginScenario(sc);
    assert.equal(useGameStore.getState().renderMode, "2D_SPRITE", `${sc} should default to 2D_SPRITE`);
  }
  useGameStore.getState().toggleRenderMode();
  assert.equal(useGameStore.getState().renderMode, "3D_MODEL");
  useGameStore.getState().beginScenario("mission1");
  assert.equal(useGameStore.getState().renderMode, "3D_MODEL", "preferredRenderMode should persist across beginScenario");
  useGameStore.getState().setRenderMode("2D_SPRITE");
});

test("GridSystem flat lookup & cached getMission1EscapeTile match tile iteration", () => {
  const grid = createInitialGrid();
  const escape = getMission1EscapeTile(grid);
  assert.ok(escape, "Mission 1 grid should have an escape tile");
  assert.equal(escape.coord.x, 3);
  assert.equal(escape.coord.y, 0);
  assert.equal(escape.coord.z, 2);
  assert.equal(grid.getTile(escape.coord), escape);
});

test("GrandPrioryPalaceDressing contains zero non-diegetic pointLight tags (ADR-0015)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/canvas/GrandPrioryPalaceDressing.tsx"),
    "utf8",
  );
  assert.equal(src.includes("<pointLight"), false, "GrandPrioryPalaceDressing must not mount extra pointLights");
});
