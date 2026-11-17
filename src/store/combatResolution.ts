import {
  buffLabel,
  phrase,
  type MessageId,
  type MessageParams,
} from "../i18n/runtime";
import {
  evaluateAdjacentMeleeTargets,
  evaluateVisibleTargets,
  gridDistance3D,
  isAdjacentForMelee,
  isInstantOverkill,
  isUnitFighting,
} from "../core/CombatSystem";
import { resolvePrimaryCoverDirection } from "../core/CameraDirector";
import { applyPowderBlast } from "../core/explosions";
import {
  computeFogOfWar,
  createInitialExploredCoords,
  type DynamicLightSource,
} from "../core/FogOfWar";
import { coordKey, GridSystem, sameCoord } from "../core/GridSystem";
import { computeReachableTiles } from "../core/Pathfinding";
import {
  judgeMission2,
  PLACHY_ID,
  type Mission2Clock,
  type Mission2Loss,
} from "../core/mission2";
import {
  displaceFromPowderBlast,
  dropCartAsKeg,
  judgeMission3,
  type Mission3Clock,
  type Mission3Loss,
} from "../core/mission3";
import type {
  AttackOutcome,
  BuffId,
  CaptureReason,
  CombatLogEntry,
  Faction,
  GridCoord,
  MeleeTargetEvaluation,
  ReachableTile,
  ScenarioId,
  TargetEvaluation,
  UnitData,
  WeatherType,
} from "../core/types";
import type {
  BlastZoneEvent,
  GameStoreState,
  ImpactObstacleKind,
  UnitCombatLoss,
} from "./storeTypes";
import { makeLog, nextFxId } from "./storeUtils";

export function mission2LossPhrase(
  loss: Mission2Loss,
): "log.m2.loss.rite" | "log.m2.loss.plachy" | "log.m2.loss.wiped" | "log.m2.loss.windlass" {
  if (loss === "rite") return "log.m2.loss.rite";
  if (loss === "wiped") return "log.m2.loss.wiped";
  if (loss === "windlass") return "log.m2.loss.windlass";
  return "log.m2.loss.plachy";
}

export function mission3LossPhrase(
  loss: Mission3Loss,
): "log.m3.loss.delivery" | "log.m3.loss.plachy" | "log.m3.loss.wiped" {
  if (loss === "delivery") return "log.m3.loss.delivery";
  if (loss === "wiped") return "log.m3.loss.wiped";
  return "log.m3.loss.plachy";
}

export function mission3VictoryPhrase(
  deliveries: number,
): "log.m3.victory.mute" | "log.m3.victory.scar" {
  return deliveries === 0 ? "log.m3.victory.mute" : "log.m3.victory.scar";
}

export function mission3OutcomeLog(
  round: number,
  judged: { outcome: "ongoing" | "victory" | "defeat"; victoryReason: "skiff" | null; loss: Mission3Loss },
  deliveries: number,
): CombatLogEntry {
  const victory = judged.outcome === "victory";
  return makeLog(
    round,
    victory ? "player" : "enemy",
    phrase(victory ? mission3VictoryPhrase(deliveries) : mission3LossPhrase(judged.loss ?? "plachy")),
    victory ? "story" : "alert",
  );
}

export function mission3StepLogs(
  round: number,
  faction: Faction,
  before: Mission3Clock,
  after: Mission3Clock,
  beforeUnits: UnitData[],
  afterUnits: UnitData[],
): CombatLogEntry[] {
  const logs: CombatLogEntry[] = [];
  const push = (id: MessageId, params?: MessageParams, tone: CombatLogEntry["tone"] = "story") => {
    logs.push(makeLog(round, faction, phrase(id, params), tone));
  };
  if (!before.cookedOff && after.cookedOff) push("log.m3.cookoff", undefined, "alert");
  else if (after.sparkIndex !== before.sparkIndex) push("log.m3.spark.advance");
  if (before.lit && !after.lit && before.stampTile) push("log.m3.spark.stamp", undefined, "alert");
  if (before.stamperIds.length === 0 && after.stamperIds.length > 0) {
    push("log.m3.stamp.warn", undefined, "alert");
  }
  if (after.deliveries > before.deliveries) {
    push("log.m3.cart.delivery", { count: after.deliveries }, "alert");
  } else if (after.cart && after.cart.bearerId !== before.cart?.bearerId) {
    push("log.m3.cart.roll");
  }
  if (!before.coneWarned && after.coneWarned && !after.coneFired) push("log.m3.cone.show", undefined, "alert");
  else if (before.coneWarned && !before.silent && after.coneFired) push("log.m3.cone.fire", undefined, "alert");
  for (const unit of afterUnits) {
    if (unit.faction !== "player") continue;
    const prev = beforeUnits.find((item) => item.id === unit.id);
    if (!prev || prev.pos.y === unit.pos.y) continue;
    push("log.m3.climb", { climb: unit.pos.y > prev.pos.y ? "up" : "down", unitId: unit.id });
  }
  return logs;
}

export function mission3Ready(state: GameStoreState): state is GameStoreState & { m3: Mission3Clock } {
  return (
    state.scenario === "mission3" &&
    state.m3 !== null &&
    !state.isBusy &&
    state.turn === "player" &&
    state.outcome === "ongoing"
  );
}

export function withSilenceRound(
  before: Mission3Clock,
  after: Mission3Clock,
  round: number,
): Mission3Clock {
  if (before.silent && !after.silent && after.silenceBrokenOnRound === null) {
    return { ...after, silenceBrokenOnRound: round };
  }
  return after;
}

export function appendVictoryLog(
  combatLog: CombatLogEntry[],
  round: number,
  outcomeCheck: {
    outcome: "ongoing" | "victory" | "defeat";
    victoryReason: "boat_escape" | "annihilation" | "portcullis" | "skiff" | null;
  },
): CombatLogEntry[] {
  if (outcomeCheck.outcome !== "victory") return combatLog;
  const victoryMsg =
    outcomeCheck.victoryReason === "boat_escape"
      ? phrase("log.victory.boat")
      : outcomeCheck.victoryReason === "portcullis"
        ? phrase("log.m2.victory")
        : outcomeCheck.victoryReason === "skiff"
          ? phrase("log.m3.victory.mute")
          : phrase("log.victory.annihilation");
  return [...combatLog, makeLog(round, "player", victoryMsg, "story")];
}

export function findBestMeleeChargeTile(
  grid: GridSystem,
  attacker: UnitData,
  enemy: UnitData,
  reachableTiles: Map<string, ReachableTile>,
  preferredCoord?: GridCoord | null,
): ReachableTile | null {
  if (!attacker.alive || !enemy.alive) return null;

  if (preferredCoord && isAdjacentForMelee(preferredCoord, enemy.pos)) {
    const prefReach = reachableTiles.get(coordKey(preferredCoord));
    if (prefReach) return prefReach;
  }

  let best: ReachableTile | null = null;
  let bestScore = -Infinity;

  for (const reach of reachableTiles.values()) {
    if (!isAdjacentForMelee(reach.coord, enemy.pos)) continue;

    const manhattan =
      Math.abs(reach.coord.x - enemy.pos.x) +
      Math.abs(reach.coord.z - enemy.pos.z);
    const cov = resolvePrimaryCoverDirection(grid, reach.coord).level;
    const covBonus = cov === "full" ? 15 : cov === "half" ? 8 : 0;
    const distFromAttacker = Math.hypot(
      reach.coord.x - attacker.pos.x,
      reach.coord.z - attacker.pos.z,
    );

    const score =
      -reach.apCost * 100 +
      (manhattan === 1 ? 20 : 0) +
      covBonus -
      distFromAttacker;

    if (score > bestScore) {
      bestScore = score;
      best = reach;
    }
  }

  return best;
}

export function resolveShotImpactMetadata(
  grid: GridSystem,
  from: GridCoord,
  to: GridCoord,
  outcome: Pick<
    AttackOutcome,
    | "hit"
    | "critical"
    | "misfired"
    | "damage"
    | "armorShredded"
    | "armorAbsorbed"
    | "killed"
  >,
): {
  bloodSeverity: 0 | 1 | 2 | 3;
  impactObstacle: ImpactObstacleKind;
  missImpactCoord: GridCoord;
} {
  let bloodSeverity: 0 | 1 | 2 | 3 = 0;
  if (outcome.hit && !outcome.misfired && outcome.damage > 0) {
    if (
      outcome.damage >= 5 ||
      outcome.killed ||
      (outcome.critical && outcome.damage >= 3)
    ) {
      bloodSeverity = 3;
    } else if (outcome.damage >= 3 || outcome.critical) {
      bloodSeverity = 2;
    } else {
      bloodSeverity = 1;
    }
  }

  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.max(1, Math.hypot(dx, dz));
  const stepX = Math.round(dx / len);
  const stepZ = Math.round(dz / len);
  const perpX = -stepZ;
  const perpZ = stepX;

  const candidates: GridCoord[] = [
    { x: to.x - stepX, y: to.y, z: to.z - stepZ },
    { x: to.x + stepX, y: to.y, z: to.z + stepZ },
    { x: to.x + stepX + perpX, y: to.y, z: to.z + stepZ + perpZ },
    { x: to.x + stepX - perpX, y: to.y, z: to.z + stepZ - perpZ },
    { x: to.x + perpX, y: to.y, z: to.z + perpZ },
    { x: to.x - perpX, y: to.y, z: to.z - perpZ },
    to,
  ];

  for (const cand of candidates) {
    const t = grid.getTile(cand);
    if (!t) continue;
    if (t.obstacle === "high_wall") {
      return {
        bloodSeverity,
        impactObstacle: cand.z >= 15 ? "palace_stucco" : "high_wall",
        missImpactCoord: cand,
      };
    }
    if (t.obstacle === "pillar") {
      return {
        bloodSeverity,
        impactObstacle: "pillar",
        missImpactCoord: cand,
      };
    }
    if (t.obstacle === "low_wall") {
      return {
        bloodSeverity,
        impactObstacle: cand.z >= 15 ? "palace_wood" : "low_wall",
        missImpactCoord: cand,
      };
    }
  }

  const fallbackCoord: GridCoord = {
    x: Math.max(0, Math.min(grid.width - 1, to.x + stepX)),
    y: to.y,
    z: Math.max(0, Math.min(grid.depth - 1, to.z + stepZ)),
  };
  return {
    bloodSeverity,
    impactObstacle: to.z >= 15 ? "palace_stucco" : "cobble",
    missImpactCoord: fallbackCoord,
  };
}

export function buildUnitCombatLoss(
  beforeUnit: UnitData,
  afterUnit: UnitData,
  opts: {
    attackerId: string;
    weaponId: string;
    hit: boolean;
    critical: boolean;
    misfired: boolean;
    hitChance?: number;
    armorAbsorbed?: number;
    durationMs?: number;
  },
): UnitCombatLoss {
  const hpBefore = beforeUnit.hp;
  const hpAfter = afterUnit.hp;
  const hpLost = Math.max(0, hpBefore - hpAfter);
  const armorBefore = beforeUnit.armor;
  const armorAfter = Math.max(0, afterUnit.armor);
  const armorLost = Math.max(0, armorBefore - armorAfter);
  const apLost = Math.max(0, beforeUnit.ap - afterUnit.ap);
  const shakenApplied = !beforeUnit.isShaken && afterUnit.isShaken && hpAfter > 0;
  const overwatchLost = beforeUnit.isOverwatch && !afterUnit.isOverwatch;
  const detainedApplied =
    (beforeUnit.detainedTurns ?? 0) === 0 && (afterUnit.detainedTurns ?? 0) > 0;
  const enteredDeathThroes = !beforeUnit.inDeathThroes && (afterUnit.inDeathThroes ?? false);
  const killed = beforeUnit.alive && !afterUnit.alive;
  const instantKilled = killed && isInstantOverkill(hpAfter, beforeUnit.maxHp);

  return {
    id: nextFxId(),
    timestamp: performance.now(),
    durationMs: opts.durationMs ?? 1500,
    attackerId: opts.attackerId,
    weaponId: opts.weaponId,
    hit: opts.hit,
    critical: opts.critical,
    misfired: opts.misfired,
    hitChance: opts.hitChance,
    hpBefore,
    hpAfter,
    hpLost,
    maxHp: beforeUnit.maxHp,
    armorBefore,
    armorAfter,
    armorLost,
    armorAbsorbed: opts.armorAbsorbed ?? 0,
    maxArmor: Math.max(beforeUnit.maxArmor, armorBefore),
    apLost,
    shakenApplied,
    overwatchLost,
    detainedApplied,
    killed,
    enteredDeathThroes,
    instantKilled,
  };
}

export function syncColloredoCaptureState(units: UnitData[]): {
  units: UnitData[];
  newlyDetained: boolean;
  rescued: boolean;
  reason: CaptureReason | null;
} {
  const colloredo = units.find((u) => u.id === "player-colloredo" && u.alive);
  if (!colloredo) {
    return { units, newlyDetained: false, rescued: false, reason: null };
  }

  const besideMarshal = (u: UnitData) =>
    u.pos.y === colloredo.pos.y &&
    Math.abs(u.pos.x - colloredo.pos.x) <= 1 &&
    Math.abs(u.pos.z - colloredo.pos.z) <= 1;

  const hasAllyEscort = units.some(
    (u) =>
      u.faction === "player" &&
      u.id !== colloredo.id &&
      isUnitFighting(u) &&
      besideMarshal(u),
  );

  const hasEnemyCaptorNearby = units.some(
    (u) =>
      u.faction === "enemy" &&
      u.alive &&
      u.hp > 0 &&
      !u.inDeathThroes &&
      besideMarshal(u),
  );

  const allCompanionsDead = !units.some(
    (u) =>
      u.faction === "player" &&
      u.id !== colloredo.id &&
      isUnitFighting(u),
  );

  const prevDetained = colloredo.detainedTurns ?? 0;
  const marshalInThroes = !!colloredo.inDeathThroes || colloredo.hp <= 0;

  if (prevDetained > 0 && prevDetained < 2) {
    const canRescueStanding =
      !marshalInThroes && (!hasEnemyCaptorNearby || hasAllyEscort);
    const canRescueDying =
      marshalInThroes && hasAllyEscort && !hasEnemyCaptorNearby;

    if (canRescueStanding || canRescueDying) {
      const nextUnits = units.map((u) =>
        u.id === colloredo.id
          ? {
              ...u,
              ap: Math.max(u.ap, marshalInThroes ? u.ap : 1),
              detainedTurns: 0,
              captureReason: null,
              isShaken: marshalInThroes ? u.isShaken : false,
            }
          : u,
      );
      return {
        units: nextUnits,
        newlyDetained: false,
        rescued: true,
        reason: null,
      };
    }
  }

  const shouldDetain = hasEnemyCaptorNearby && !hasAllyEscort;

  if (prevDetained === 0 && shouldDetain) {
    const reason: CaptureReason = allCompanionsDead
      ? "all_companions_fallen"
      : "surrounded_unprotected";

    const nextUnits = units.map((u) =>
      u.id === colloredo.id
        ? {
            ...u,
            alive: true,
            ap: 0,
            isOverwatch: false,
            detainedTurns: 1,
            captureReason: reason,
          }
        : u,
    );
    return {
      units: nextUnits,
      newlyDetained: true,
      rescued: false,
      reason,
    };
  }

  if (prevDetained >= 1) {
    const updatedReason: CaptureReason = allCompanionsDead
      ? "all_companions_fallen"
      : (colloredo.captureReason ?? "surrounded_unprotected");

    const nextUnits = units.map((u) =>
      u.id === colloredo.id
        ? {
            ...u,
            alive: true,
            ap: 0,
            isOverwatch: false,
            captureReason: updatedReason,
          }
        : u,
    );
    return {
      units: nextUnits,
      newlyDetained: false,
      rescued: false,
      reason: updatedReason,
    };
  }

  return { units, newlyDetained: false, rescued: false, reason: null };
}

export function advanceColloredoDetentionTurn(units: UnitData[]): {
  units: UnitData[];
  capturedNow: boolean;
  detainedTurns: number;
  captureReason: CaptureReason | null;
} {
  const synced = syncColloredoCaptureState(units);
  const colloredo = synced.units.find(
    (u) => u.id === "player-colloredo" && u.alive,
  );
  if (!colloredo || (colloredo.detainedTurns ?? 0) === 0) {
    return {
      units: synced.units,
      capturedNow: false,
      detainedTurns: 0,
      captureReason: null,
    };
  }

  const nextDetained = (colloredo.detainedTurns ?? 0) + 1;
  const allCompanionsDead = !synced.units.some(
    (u) =>
      u.faction === "player" &&
      u.id !== colloredo.id &&
      isUnitFighting(u),
  );
  const reason: CaptureReason = allCompanionsDead
    ? "all_companions_fallen"
    : (colloredo.captureReason ?? "surrounded_unprotected");

  const updatedUnits = synced.units.map((u) =>
    u.id === colloredo.id
      ? {
          ...u,
          alive: true,
          ap: 0,
          isOverwatch: false,
          detainedTurns: nextDetained,
          captureReason: reason,
        }
      : u,
  );

  return {
    units: updatedUnits,
    capturedNow: nextDetained >= 2,
    detainedTurns: nextDetained,
    captureReason: reason,
  };
}

export function syncColloredoMobility(units: UnitData[]): UnitData[] {
  const captureSynced = syncColloredoCaptureState(units).units;
  const colloredo = captureSynced.find(
    (u) => u.id === "player-colloredo" && u.alive,
  );
  if (!colloredo) return captureSynced;

  const detainedTurns = colloredo.detainedTurns ?? 0;
  if (detainedTurns >= 1) {
    const buffId: BuffId = detainedTurns >= 2 ? "detained_2" : "detained_1";
    if (colloredo.movePerAp === 0 && colloredo.buffId === buffId) {
      return captureSynced;
    }
    return captureSynced.map((u) =>
      u.id === colloredo.id
        ? { ...u, movePerAp: 0, ap: 0, buffId, buffTitle: buffLabel(buffId) }
        : u,
    );
  }

  if (colloredo.movePerAp === 3 && colloredo.buffId === "limp") {
    return captureSynced;
  }

  return captureSynced.map((u) =>
    u.id === colloredo.id
      ? { ...u, movePerAp: 3, buffId: "limp", buffTitle: buffLabel("limp") }
      : u,
  );
}

export function findFreeSpawnCoord(
  grid: GridSystem,
  existingUnits: UnitData[],
  preferred: GridCoord,
): GridCoord {
  const prefTile = grid.getTile(preferred);
  if (
    prefTile?.walkable &&
    !existingUnits.some((u) => u.alive && sameCoord(u.pos, preferred))
  ) {
    return preferred;
  }
  for (let r = 1; r <= 3; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const c: GridCoord = {
          x: preferred.x + dx,
          y: preferred.y,
          z: preferred.z + dz,
        };
        const tile = grid.getTile(c);
        if (
          tile?.walkable &&
          !existingUnits.some((u) => u.alive && sameCoord(u.pos, c))
        ) {
          return c;
        }
      }
    }
  }
  return preferred;
}

export function findNextAvailablePlayerUnit(
  units: UnitData[],
  currentSelectedId: string | null,
): UnitData | null {
  const synced = syncColloredoMobility(units);
  const playerUnits = synced.filter(
    (u) =>
      u.faction === "player" &&
      isUnitFighting(u) &&
      (u.detainedTurns ?? 0) === 0,
  );
  if (playerUnits.length === 0) return null;

  const currentUnit = playerUnits.find((u) => u.id === currentSelectedId);
  if (currentUnit && currentUnit.ap > 0) {
    return currentUnit;
  }

  const currentRosterIdx = synced.findIndex((u) => u.id === currentSelectedId);
  if (currentRosterIdx >= 0) {
    for (let i = 1; i <= synced.length; i++) {
      const idx = (currentRosterIdx + i) % synced.length;
      const candidate = synced[idx];
      if (
        candidate &&
        candidate.faction === "player" &&
        isUnitFighting(candidate) &&
        candidate.ap > 0 &&
        (candidate.detainedTurns ?? 0) === 0
      ) {
        return candidate;
      }
    }
  }

  const firstWithAp = playerUnits.find((u) => u.ap > 0);
  if (firstWithAp) return firstWithAp;

  return currentUnit ?? playerUnits[0] ?? null;
}

export function extractDynamicLights(blastZones: BlastZoneEvent[]): DynamicLightSource[] {
  return blastZones.slice(-8).map((bz) => ({
    coord: bz.coord,
    radius: bz.isExplosion ? 2.8 : 1.8,
  }));
}

export function deriveSelectionData(
  grid: GridSystem,
  units: UnitData[],
  selectedId: string | null,
  weather: WeatherType,
  preferredTargetId?: string | null,
  prevExploredCoords?: Set<string>,
  blastZones: BlastZoneEvent[] = [],
  fogOfWarEnabled = true,
  scenario?: ScenarioId,
) {
  const syncedUnits = syncColloredoMobility(units);
  const baseExplored =
    prevExploredCoords ?? createInitialExploredCoords(grid, scenario);
  const dynamicLights = extractDynamicLights(blastZones);
  const fogSnapshot = computeFogOfWar(
    grid,
    syncedUnits,
    weather,
    baseExplored,
    dynamicLights,
    scenario,
  );
  const unit = syncedUnits.find((u) => u.id === selectedId && u.alive);
  if (!unit || unit.faction !== "player") {
    return {
      reachableTiles: new Map<string, ReachableTile>(),
      visibleTargets: [] as TargetEvaluation[],
      visibleMeleeTargets: [] as MeleeTargetEvaluation[],
      selectedTargetId: null as string | null,
      units: syncedUnits,
      fogSnapshot,
    };
  }
  const isDetained = (unit.detainedTurns ?? 0) > 0 || !isUnitFighting(unit);
  const reachableTiles = isDetained
    ? new Map<string, ReachableTile>()
    : computeReachableTiles(grid, unit, syncedUnits);
  const visibleFilter = fogOfWarEnabled
    ? fogSnapshot.visibleEnemyIds
    : undefined;
  const visibleTargets = isDetained
    ? ([] as TargetEvaluation[])
    : evaluateVisibleTargets(grid, unit, syncedUnits, weather, visibleFilter);
  const visibleMeleeTargets = isDetained
    ? ([] as MeleeTargetEvaluation[])
    : evaluateAdjacentMeleeTargets(grid, unit, syncedUnits, visibleFilter);
  const keepTarget =
    preferredTargetId &&
    (visibleTargets.some((t) => t.targetId === preferredTargetId) ||
      visibleMeleeTargets.some((t) => t.targetId === preferredTargetId))
      ? preferredTargetId
      : (visibleTargets[0]?.targetId ?? visibleMeleeTargets[0]?.targetId ?? null);
  return {
    reachableTiles,
    visibleTargets,
    visibleMeleeTargets,
    selectedTargetId: keepTarget,
    units: syncedUnits,
    fogSnapshot,
  };
}

export function mission3VerbPatch(
  state: GameStoreState,
  nextClock: Mission3Clock,
  units: UnitData[],
  selectedId: string,
  logs: CombatLogEntry[],
  gridMutated: boolean,
): Partial<GameStoreState> {
  const judged = judgeMission3(nextClock, units);
  const derived = deriveSelectionData(
    state.grid,
    units,
    selectedId,
    state.weather,
    state.selectedTargetId,
    state.fogSnapshot.exploredCoords,
    state.blastZones,
    state.fogOfWarEnabled,
    state.scenario,
  );
  const outcomeLogs =
    judged.outcome === "ongoing"
      ? []
      : [mission3OutcomeLog(state.round, judged, nextClock.deliveries)];
  return {
    m3: { ...nextClock, loss: judged.loss },
    outcome: judged.outcome,
    victoryReason: judged.victoryReason,
    defeatReason: null,
    units: derived.units,
    reachableTiles: derived.reachableTiles,
    visibleTargets: derived.visibleTargets,
    visibleMeleeTargets: derived.visibleMeleeTargets,
    selectedTargetId: derived.selectedTargetId,
    fogSnapshot: derived.fogSnapshot,
    actionMode: "move",
    hoveredPath: [],
    combatLog: [...state.combatLog, ...logs, ...outcomeLogs],
    ...(gridMutated ? { gridVersion: state.gridVersion + 1 } : {}),
  };
}

export function checkMissionOutcome(
  grid: GridSystem,
  units: UnitData[],
  m2: Mission2Clock | null = null,
  m3: Mission3Clock | null = null,
): {
  outcome: "ongoing" | "victory" | "defeat";
  victoryReason: "boat_escape" | "annihilation" | "portcullis" | "skiff" | null;
  defeatReason: CaptureReason | null;
} {
  if (m3) {
    const judged = judgeMission3(m3, units);
    return {
      outcome: judged.outcome,
      victoryReason: judged.victoryReason,
      defeatReason: null,
    };
  }
  if (m2 && units.some((unit) => unit.id === PLACHY_ID)) {
    const judged = judgeMission2(m2, units);
    return {
      outcome: judged.outcome,
      victoryReason: judged.victoryReason,
      defeatReason: null,
    };
  }
  const colloredo = units.find((u) => u.id === "player-colloredo");
  if (!colloredo || !colloredo.alive) {
    return {
      outcome: "defeat",
      victoryReason: null,
      defeatReason: colloredo?.captureReason ?? "zero_hp",
    };
  }

  if ((colloredo.detainedTurns ?? 0) >= 2) {
    return {
      outcome: "defeat",
      victoryReason: null,
      defeatReason: colloredo.captureReason ?? "zero_hp",
    };
  }

  const activeRescuers = units.some(
    (u) =>
      u.faction === "player" &&
      u.alive &&
      (u.hp > 0 || (u.inDeathThroes ?? false)) &&
      (u.detainedTurns ?? 0) === 0,
  );
  if (!activeRescuers) {
    return {
      outcome: "defeat",
      victoryReason: null,
      defeatReason: "all_companions_fallen",
    };
  }

  const colloredoTile = grid.getTile(colloredo.pos);
  if (
    colloredoTile?.isEscapeZone &&
    colloredo.alive &&
    (colloredo.detainedTurns ?? 0) === 0
  ) {
    return { outcome: "victory", victoryReason: "boat_escape", defeatReason: null };
  }
  const enemiesAlive = units.some((u) => u.faction === "enemy" && u.alive);
  if (!enemiesAlive) {
    return { outcome: "victory", victoryReason: "annihilation", defeatReason: null };
  }
  return { outcome: "ongoing", victoryReason: null, defeatReason: null };
}

export interface ExplosionResult {
  nextUnits: UnitData[];
  detonatedKegs: GridCoord[];
  victims: string[];
}

export function gunfireSmokeTurns(
  grid: GridSystem,
  pos: GridCoord,
  weather: WeatherType,
): number {
  if (grid.isEnclosedRoofed(pos.x, pos.y, pos.z)) return 3;
  return weather === "rain" ? 1 : 2;
}

export function syncMission3BearerDrop(
  scenario: ScenarioId,
  m3: Mission3Clock | null,
  grid: GridSystem,
  units: UnitData[],
): { m3: Mission3Clock | null; units: UnitData[]; dropped: boolean } {
  if (scenario !== "mission3" || !m3 || !m3.cart) {
    return { m3, units, dropped: false };
  }
  const bearerId = m3.cart.bearerId;
  const bearer = units.find((u) => u.id === bearerId);
  if (bearer && isUnitFighting(bearer)) {
    return { m3, units, dropped: false };
  }
  const nextClock = dropCartAsKeg(m3, grid);
  const nextUnits = units.map((u) =>
    u.id === bearerId ? { ...u, attachedToCart: false } : u,
  );
  return { m3: nextClock, units: nextUnits, dropped: nextClock !== m3 };
}

export function processExplosions(
  grid: GridSystem,
  units: UnitData[],
  blastCoord: GridCoord,
  damage = 5,
  armorShred = 2,
  weather: WeatherType = "clear",
  scenario: ScenarioId = "mission1",
): ExplosionResult {
  const result = applyPowderBlast(grid, units, blastCoord, {
    damage,
    armorShred,
    shockwave: true,
    weather,
  });
  if (scenario !== "mission3") return result;
  let nextUnits = displaceFromPowderBlast(grid, result.nextUnits, blastCoord);
  for (const kegCoord of result.detonatedKegs) {
    nextUnits = displaceFromPowderBlast(grid, nextUnits, kegCoord);
  }
  return { ...result, nextUnits };
}

export function countPowderKegsAround(grid: GridSystem, center: GridCoord): number {
  let count = 0;
  for (const tile of grid.getAllTiles()) {
    if (tile.obstacle === "powder_keg" && tile.coord.y === center.y && gridDistance3D(center, tile.coord) <= 3) {
      count += 1;
    }
  }
  return count;
}
