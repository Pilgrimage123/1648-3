import { phrase } from "../i18n/runtime";
import {
  applyBlackPowderChoking,
  applyDamageToUnit,
  calculateShot,
  checkEnemyColloredoCapture,
  checkLineOfSight3D,
  computeEnemyAiDecision,
  evaluateAdjacentMeleeTargets,
  evaluateVisibleTargets,
  facingFromDelta,
  isCompanionProtectedByCount,
  isUnitFighting,
  rollMeleeAttack,
  rollRangedAttack,
} from "../core/CombatSystem";
import { createReinforcementUnits, sameCoord } from "../core/GridSystem";
import { computeFogOfWar } from "../core/FogOfWar";
import {
  applyThrowPitch,
  applyWindlassHit,
  closeEnemyTurn,
  closePlayerTurn as closeMission2PlayerTurn,
  computeMission2Ai,
  judgeMission2,
  windlassDummy,
  WINDLASS,
} from "../core/mission2";
import {
  closePlayerTurn as closeMission3PlayerTurn,
  closeSwedishTurn,
  computeMission3Ai,
  judgeMission3,
  MUZZLE,
  openSwedishTurn,
  STORE_DOOR,
  tilesHitByCanister,
} from "../core/mission3";
import type {
  CaptureReason,
  CombatLogEntry,
  UnitData,
} from "../core/types";
import {
  playExplosionSound,
  playGunshotSound,
  playHitSound,
  playMisfireSound,
  playRicochetSound,
} from "../utils/audioSystem";
import { muzzleFlashDraft } from "../components/canvas/diegeticLights";
import {
  advanceColloredoDetentionTurn,
  appendVictoryLog,
  buildUnitCombatLoss,
  checkMissionOutcome,
  deriveSelectionData,
  extractDynamicLights,
  findFreeSpawnCoord,
  gunfireSmokeTurns,
  mission2LossPhrase,
  mission3OutcomeLog,
  mission3StepLogs,
  resolveShotImpactMetadata,
  syncColloredoCaptureState,
  syncColloredoMobility,
} from "./combatResolution";
import type { StoreGet, StoreRuntimeDeps, StoreSet } from "./storeTypes";
import {
  addLightFlash,
  delay,
  getSessionEpoch,
  isStaleSession,
  makeLog,
  nextFxId,
} from "./storeUtils";

export function createAiTurnRunner(
  set: StoreSet,
  get: StoreGet,
  deps: StoreRuntimeDeps,
) {
  return {
    endTurn: () => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      if (state.scenario === "mission2" && state.m2) {
        const closed = closeMission2PlayerTurn(state.m2, state.units);
        const noted =
          !state.m2.inscriptionNoted && closed.inscriptionNoted
            ? [
                makeLog(
                  state.round,
                  "player",
                  phrase("log.m2.inscription"),
                  "story",
                ),
              ]
            : [];
        set({
          m2: closed,
          combatLog: [...state.combatLog, ...noted],
        });
      }

      if (state.scenario === "mission3" && state.m3) {
        const beforeUnits = state.units;
        const step = closeMission3PlayerTurn(state.m3, state.grid, beforeUnits);
        const judged = judgeMission3(step.clock, step.units);
        const logs = mission3StepLogs(
          state.round,
          "player",
          state.m3,
          step.clock,
          beforeUnits,
          step.units,
        );
        const cooked = step.clock.cookedOff && !state.m3.cookedOff;
        if (cooked) {
          playExplosionSound();
          const nowTs = performance.now();
          get().triggerLightFlash({
            kind: "blast",
            coord: STORE_DOOR,
            color: "#f97316",
            intensity: 14,
            radius: 14,
            durationMs: 650,
          });
          set((s) => ({
            combatIntensity: s.combatIntensity + 3,
            blastZones: [
              ...s.blastZones.slice(-18),
              {
                id: nextFxId(),
                coord: STORE_DOOR,
                createdAt: nowTs,
                baseRadius: 3.0,
                maxRadius: 8.5,
                isExplosion: true,
              },
            ],
          }));
          for (const afterUnit of step.units) {
            const beforeUnit = beforeUnits.find((u) => u.id === afterUnit.id);
            if (!beforeUnit) continue;
            if (afterUnit.hp < beforeUnit.hp || afterUnit.armor < beforeUnit.armor) {
              deps.triggerUnitFx(afterUnit.id, {
                hit: true,
                loss: buildUnitCombatLoss(beforeUnit, afterUnit, {
                  attackerId: "player-plachy",
                  weaponId: "powder_keg",
                  hit: true,
                  critical: true,
                  misfired: false,
                  hitChance: 100,
                  durationMs: 1500,
                }),
                banner: { phrase: phrase("banner.kegBlast"), tone: "crit" },
              });
            }
          }
        }
        set((s) => ({
          m3: { ...step.clock, loss: judged.loss },
          units: step.units,
          gridVersion: s.gridVersion + (cooked ? 1 : 0),
          smokeVersion: s.smokeVersion + (cooked ? 1 : 0),
          outcome: judged.outcome,
          victoryReason: judged.victoryReason,
          defeatReason: null,
          combatLog: [
            ...s.combatLog,
            ...logs,
            ...(judged.outcome === "ongoing"
              ? []
              : [mission3OutcomeLog(state.round, judged, step.clock.deliveries)]),
          ],
        }));
        if (judged.outcome !== "ongoing") return;
      }

      const epoch = getSessionEpoch();
      void (async () => {
        const preTurnSync = syncColloredoCaptureState(get().units);
        const colloredoBeforeEnemy = preTurnSync.units.find(
          (u) => u.id === "player-colloredo" && u.alive,
        );
        if (colloredoBeforeEnemy && (colloredoBeforeEnemy.detainedTurns ?? 0) >= 1) {
          const advanced = advanceColloredoDetentionTurn(preTurnSync.units);
          set({
            units: syncColloredoMobility(advanced.units),
          });
          if (advanced.capturedNow) {
            await deps.playCaptureFinalAnimationAndDefeat(
              advanced.captureReason ?? "zero_hp",
              get().round,
            );
            return;
          }
        }

        const dyingHeroes = get().units.filter(
          (u) =>
            u.faction === "player" &&
            u.alive &&
            !!u.inDeathThroes &&
            (u.deathThroesTurns ?? 1) === 0,
        );
        for (const hero of dyingHeroes) {
          if (isStaleSession(epoch)) return;
          if (hero.id === "player-colloredo") {
            const tile = get().grid.getTile(hero.pos);
            if (!tile?.isEscapeZone) {
              set((s) => ({
                units: s.units.map((u) =>
                  u.id === hero.id ? { ...u, alive: false, inDeathThroes: false } : u,
                ),
                combatLog: [
                  ...s.combatLog,
                  makeLog(
                    s.round,
                    "player",
                    phrase("log.deathThroes.colloredoBoat"),
                    "alert",
                  ),
                ],
                outcome: "defeat",
                defeatReason: "zero_hp",
              }));
              await delay(600);
              return;
            }
          } else {
            set((s) => ({
              units: s.units.map((u) =>
                u.id === hero.id ? { ...u, alive: false, inDeathThroes: false } : u,
              ),
              combatLog: [
                ...s.combatLog,
                makeLog(
                  s.round,
                  "player",
                  phrase("log.deathThroes.hero", { heroId: hero.id }),
                  "alert",
                ),
              ],
            }));
            deps.triggerUnitFx(hero.id, {
              banner: { phrase: phrase("banner.fallen"), tone: "crit" },
            });
            playHitSound(true, 3);
            await delay(350);
            if (isStaleSession(epoch)) return;
          }
        }

        const afterHeroLossOutcome = checkMissionOutcome(
          get().grid,
          get().units,
          get().m2,
          get().m3,
        );
        if (afterHeroLossOutcome.outcome !== "ongoing") {
          if (afterHeroLossOutcome.outcome === "defeat") {
            await deps.playCaptureFinalAnimationAndDefeat(
              afterHeroLossOutcome.defeatReason ?? "all_companions_fallen",
              get().round,
            );
          } else {
            set((s) => ({
              isBusy: false,
              outcome: afterHeroLossOutcome.outcome,
              victoryReason: afterHeroLossOutcome.victoryReason,
              defeatReason: afterHeroLossOutcome.defeatReason,
              combatLog: appendVictoryLog(s.combatLog, s.round, afterHeroLossOutcome),
            }));
          }
          return;
        }

        set((s) => ({
          isBusy: true,
          turn: "enemy",
          actionMode: "move",
          reachableTiles: new Map(),
          hoveredPath: [],
          units: applyBlackPowderChoking(s.units, s.grid).map((u) => {
            if (u.faction !== "enemy" || !u.alive) return u;
            const fighting = isUnitFighting(u);
            return {
              ...u,
              ap: fighting ? u.maxAp : 0,
              movedThisTurn: false,
              isOverwatch: false,
              isShaken: false,
              deathThroesTurns:
                fighting && u.inDeathThroes ? 0 : u.deathThroesTurns,
            };
          }),
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "enemy",
              phrase("log.round.enemy", { count: s.round }),
              "alert",
            ),
          ],
        }));

        await delay(400);
        if (isStaleSession(epoch)) return;

        if (get().scenario === "mission3" && get().m3 && get().outcome === "ongoing") {
          const beforeClock = get().m3!;
          const beforeUnits = get().units;
          const opened = openSwedishTurn(beforeClock, get().grid, beforeUnits);
          const judged = judgeMission3(opened.clock, opened.units);
          const logs = mission3StepLogs(
            get().round,
            "enemy",
            beforeClock,
            opened.clock,
            beforeUnits,
            opened.units,
          );
          if (judged.outcome !== "ongoing") {
            set({
              m3: { ...opened.clock, loss: judged.loss },
              units: opened.units,
              gridVersion: get().gridVersion + 1,
              outcome: judged.outcome,
              victoryReason: judged.victoryReason,
              defeatReason: null,
              isBusy: false,
              combatLog: [
                ...get().combatLog,
                ...logs,
                mission3OutcomeLog(get().round, judged, opened.clock.deliveries),
              ],
            });
            return;
          }
          set({
            m3: opened.clock,
            units: opened.units,
            gridVersion: get().gridVersion + 1,
            combatLog: [...get().combatLog, ...logs],
          });
        }

        const expireEnemyDeathThroes = async (id: string): Promise<boolean> => {
          const finishedEnemy = get().units.find((u) => u.id === id);
          if (
            !finishedEnemy ||
            !finishedEnemy.alive ||
            !finishedEnemy.inDeathThroes ||
            (finishedEnemy.deathThroesTurns ?? 1) !== 0
          ) {
            return false;
          }

          set((s) => ({
            units: s.units.map((u) =>
              u.id === id
                ? {
                    ...u,
                    alive: false,
                    inDeathThroes: false,
                    ap: 0,
                    isOverwatch: false,
                  }
                : u,
            ),
            combatLog: [
              ...s.combatLog,
              makeLog(
                s.round,
                "enemy",
                phrase("log.deathThroes.enemy", { unitId: finishedEnemy.id }),
                "alert",
              ),
            ],
          }));
          deps.triggerUnitFx(id, {
            banner: { phrase: phrase("banner.fallenThroes"), tone: "crit" },
          });
          playHitSound(true, 3);
          await delay(350);
          if (isStaleSession(epoch)) return true;

          const outcomeAfterDeath = checkMissionOutcome(
            get().grid,
            get().units,
            get().m2,
            get().m3,
          );
          if (outcomeAfterDeath.outcome !== "ongoing") {
            if (outcomeAfterDeath.outcome === "defeat") {
              await deps.playCaptureFinalAnimationAndDefeat(
                outcomeAfterDeath.defeatReason ?? "all_companions_fallen",
                get().round,
              );
            } else {
              set((s) => ({
                isBusy: false,
                outcome: outcomeAfterDeath.outcome,
                victoryReason: outcomeAfterDeath.victoryReason,
                defeatReason: outcomeAfterDeath.defeatReason,
                combatLog: appendVictoryLog(s.combatLog, s.round, outcomeAfterDeath),
              }));
            }
            return true;
          }
          return false;
        };

        const enemyIds = get()
          .units.filter((u) => u.faction === "enemy" && u.alive)
          .map((u) => u.id);

        for (const enemyId of enemyIds) {
          if (isStaleSession(epoch)) return;
          if (get().outcome !== "ongoing") break;
          const enemy = get().units.find(
            (u) => u.id === enemyId && isUnitFighting(u),
          );
          if (!enemy) continue;

          set({ activeFloor: enemy.pos.y });

          const missionClock = get().m2;
          const yardClock = get().m3;
          const plan =
            get().scenario === "mission3" && yardClock
              ? computeMission3Ai(get().grid, enemy, get().units, yardClock)
              : get().scenario === "mission2" && missionClock
                ? computeMission2Ai(
                    get().grid,
                    enemy,
                    get().units,
                    missionClock,
                    get().weather,
                  )
                : computeEnemyAiDecision(
                    get().grid,
                    enemy,
                    get().units,
                    get().weather,
                  );

          if (plan.doorToOpen && !get().grid.isDoorSealedAt(plan.doorToOpen)) {
            get().grid.setDoorState(plan.doorToOpen, "open");
            set((s) => ({
              gridVersion: s.gridVersion + 1,
              combatLog: [
                ...s.combatLog,
                makeLog(
                  s.round,
                  "enemy",
                  phrase("log.door.enemy", { unitId: enemy.id }),
                  "overwatch",
                ),
              ],
            }));
            await delay(180);
            if (isStaleSession(epoch)) return;
          }

          if (
            get().scenario === "mission3" &&
            !plan.targetId &&
            plan.movePath.length === 0
          ) {
            if (await expireEnemyDeathThroes(enemyId)) return;
            continue;
          }

          if (plan.movePath.length > 0) {
            await deps.animateUnitAlongPath(enemy.id, plan.movePath);
            if (isStaleSession(epoch)) return;
            const dest = plan.movePath[plan.movePath.length - 1]!;
            const prev =
              plan.movePath.length >= 2
                ? plan.movePath[plan.movePath.length - 2]!
                : enemy.pos;
            const facing = facingFromDelta(prev, dest, enemy.facing);

            set((s) => {
              const movedUnits = s.units.map((u) =>
                u.id === enemy.id
                  ? {
                      ...u,
                      pos: dest,
                      facing,
                      movedThisTurn: true,
                      ap: Math.max(0, u.ap - plan.moveApCost),
                    }
                  : u,
              );
              const nextFog = computeFogOfWar(
                s.grid,
                movedUnits,
                s.weather,
                s.fogSnapshot.exploredCoords,
                extractDynamicLights(s.blastZones),
                s.scenario,
              );
              return {
                activeFloor: dest.y,
                units: movedUnits,
                fogSnapshot: nextFog,
              };
            });

            await deps.performOverwatchReactionsIfAny(enemy.id, dest, plan.movePath);
            if (isStaleSession(epoch)) return;
            await delay(220);
            if (isStaleSession(epoch)) return;
          }

          const updatedEnemy = get().units.find(
            (u) => u.id === enemyId && u.alive,
          );
          if (!updatedEnemy || get().outcome !== "ongoing")
            continue;

          const colloredo = get().units.find(
            (u) => u.id === "player-colloredo" && u.alive,
          );

          if (colloredo && updatedEnemy.ap >= 1 && !updatedEnemy.inDeathThroes) {
            const capCheck = checkEnemyColloredoCapture(
              get().grid,
              updatedEnemy,
              colloredo,
            );
            if (capCheck.canCapture) {
              const captureFacing = facingFromDelta(
                updatedEnemy.pos,
                colloredo.pos,
                updatedEnemy.facing,
              );
              const logMsg = capCheck.isAdjacent
                ? phrase("log.capture.adjacent", { unitId: updatedEnemy.id })
                : phrase("log.capture.gunpoint", {
                    unitId: updatedEnemy.id,
                    distance: capCheck.distanceTiles,
                  });

              set((s) => ({
                units: s.units.map((u) =>
                  u.id === updatedEnemy.id
                    ? {
                        ...u,
                        ap: Math.max(0, u.ap - 1),
                        facing: captureFacing,
                      }
                    : u.id === colloredo.id
                      ? {
                          ...u,
                          ap: 0,
                          detainedTurns: 2,
                          captureReason: "surrounded_unprotected",
                        }
                      : u,
                ),
                combatLog: [
                  ...s.combatLog,
                  makeLog(s.round, "enemy", logMsg, "alert"),
                ],
              }));

              deps.triggerUnitFx(updatedEnemy.id, {
                lunge: true,
                banner: {
                  phrase: capCheck.isGunpoint
                    ? phrase("banner.gunpoint")
                    : phrase("banner.captureAp"),
                  tone: "crit",
                },
              });
              deps.triggerUnitFx(colloredo.id, {
                hit: true,
                banner: { phrase: phrase("banner.captured"), tone: "crit" },
              });

              playHitSound(true, 2);
              await delay(850);
              if (isStaleSession(epoch)) return;

              await deps.playCaptureFinalAnimationAndDefeat(
                "surrounded_unprotected",
                get().round,
              );
              return;
            }
          }

          if (colloredo && updatedEnemy.ap === 0 && !updatedEnemy.inDeathThroes) {
            const capCheck = checkEnemyColloredoCapture(
              get().grid,
              updatedEnemy,
              colloredo,
            );
            if (capCheck.canCapture) {
              const warningMsg = capCheck.isAdjacent
                ? phrase("log.capture.threatAdjacent", { unitId: updatedEnemy.id })
                : phrase("log.capture.threatGunpoint", {
                    unitId: updatedEnemy.id,
                    distance: capCheck.distanceTiles,
                  });

              set((s) => ({
                units: s.units.map((u) =>
                  u.id === colloredo.id
                    ? {
                        ...u,
                        detainedTurns: 1,
                        captureReason: "surrounded_unprotected",
                      }
                    : u,
                ),
                combatLog: [
                  ...s.combatLog,
                  makeLog(s.round, "enemy", warningMsg, "alert"),
                ],
              }));

              deps.triggerUnitFx(colloredo.id, {
                hit: true,
                banner: { phrase: phrase("banner.threat"), tone: "crit" },
              });
            }
          }

          if (updatedEnemy.ap <= 0) {
            if (await expireEnemyDeathThroes(enemyId)) return;
            continue;
          }

          if (updatedEnemy.firearmLoaded === false) {
            if (updatedEnemy.inDeathThroes) {
              const adjMelee = evaluateAdjacentMeleeTargets(
                get().grid,
                updatedEnemy,
                get().units,
              );
              const validMelee = adjMelee.find(
                (t) => t.targetId !== "player-colloredo",
              );
              if (validMelee && updatedEnemy.ap >= 1) {
                const targetUnit = get().units.find(
                  (u) => u.id === validMelee.targetId && u.alive,
                );
                if (targetUnit) {
                  const strikeFacing = facingFromDelta(
                    updatedEnemy.pos,
                    targetUnit.pos,
                    updatedEnemy.facing,
                  );
                  deps.noteMission3Noise("melee");
                  const outcome = rollMeleeAttack(
                    updatedEnemy,
                    targetUnit,
                    validMelee.calculation,
                  );
                  const beforeTargetStrike = targetUnit;
                  let afterTargetStrike: UnitData = targetUnit;

                  set((s) => {
                    const nextUnits = s.units.map((u) => {
                      if (u.id === updatedEnemy.id) {
                        return {
                          ...u,
                          facing: strikeFacing,
                          ap: Math.max(0, u.ap - 1),
                        };
                      }
                      if (u.id === targetUnit.id) {
                        return applyDamageToUnit(u, outcome.damage, {
                          armorShred: outcome.armorShredded,
                          shaken:
                            u.isShaken ||
                            (outcome.hit && (outcome.critical || outcome.damage >= 3)),
                        });
                      }
                      return u;
                    });
                    const captureSync = syncColloredoCaptureState(nextUnits);
                    const syncedUnits = syncColloredoMobility(captureSync.units);
                    afterTargetStrike =
                      syncedUnits.find((u) => u.id === targetUnit.id) ?? targetUnit;

                    const msg = phrase("log.enemy.throesMelee", {
                      attackerId: updatedEnemy.id,
                      targetId: targetUnit.id,
                      hit: outcome.hit,
                      damage: outcome.damage,
                    });

                    return {
                      units: syncedUnits,
                      combatLog: [
                        ...s.combatLog,
                        makeLog(s.round, "enemy", msg, outcome.hit ? "hit" : "miss"),
                      ],
                    };
                  });

                  deps.triggerUnitFx(updatedEnemy.id, { lunge: true, lungeKind: "melee" });
                  await delay(320);
                  if (isStaleSession(epoch)) return;
                  if (outcome.hit) {
                    playHitSound(outcome.critical, 2);
                  }
                  deps.triggerUnitFx(targetUnit.id, {
                    hit: outcome.hit,
                    loss: buildUnitCombatLoss(
                      beforeTargetStrike,
                      afterTargetStrike,
                      {
                        attackerId: updatedEnemy.id,
                        weaponId: "swedish_musket_butt",
                        hit: outcome.hit,
                        critical: outcome.critical,
                        misfired: false,
                        hitChance: validMelee.calculation.hitChance,
                      },
                    ),
                  });
                  await delay(450);
                  if (isStaleSession(epoch)) return;
                  if (await expireEnemyDeathThroes(enemyId)) return;
                  continue;
                }
              }
              if (await expireEnemyDeathThroes(enemyId)) return;
              continue;
            }

            const reqReloadAp = updatedEnemy.weapon.reloadApCost ?? 2;
            const curReload = updatedEnemy.reloadProgress ?? 0;
            const stepsSpent = Math.min(
              updatedEnemy.ap,
              Math.max(1, reqReloadAp - curReload),
            );
            const nextReload = Math.min(reqReloadAp, curReload + stepsSpent);
            const isNowLoaded = nextReload >= reqReloadAp;

            set((s) => ({
              units: s.units.map((u) =>
                u.id === updatedEnemy.id
                  ? {
                      ...u,
                      ap: Math.max(0, u.ap - stepsSpent),
                      reloadProgress: isNowLoaded ? 0 : nextReload,
                      firearmLoaded: isNowLoaded,
                    }
                  : u,
              ),
              combatLog: [
                ...s.combatLog,
                makeLog(
                  s.round,
                  "enemy",
                  phrase("log.enemy.reload", {
                    unitId: updatedEnemy.id,
                    loaded: isNowLoaded,
                    progress: nextReload,
                    required: reqReloadAp,
                  }),
                  "info",
                ),
              ],
            }));
            deps.triggerUnitFx(updatedEnemy.id, {
              banner: {
                phrase: isNowLoaded
                  ? phrase("banner.loaded", { required: reqReloadAp })
                  : phrase("banner.reloading", {
                      progress: nextReload,
                      required: reqReloadAp,
                    }),
                tone: "buff",
              },
            });
            await delay(240);
            if (isStaleSession(epoch)) return;
            continue;
          }

          const targets = evaluateVisibleTargets(
            get().grid,
            updatedEnemy,
            get().units,
            get().weather,
          );
          const chosenTargetEval =
            targets.find((t) => t.targetId === plan.targetId) ?? targets[0];
          const windlassClock = get().m2;
          const shouldThrowPitch =
            get().scenario === "mission2" &&
            plan.throwPitch &&
            windlassClock &&
            !windlassClock.seated &&
            windlassClock.windlassHp > 0 &&
            !windlassClock.windlassBurning &&
            !windlassClock.pitchUsedHarrierIds.includes(updatedEnemy.id);

          if (shouldThrowPitch && windlassClock) {
            const clockNow = windlassClock;
            const nextClock = applyThrowPitch(clockNow, updatedEnemy.id);
            const judged = judgeMission2(nextClock, get().units);
            const shotFacing = facingFromDelta(
              updatedEnemy.pos,
              WINDLASS,
              updatedEnemy.facing,
            );
            playExplosionSound();
            const nowTs = performance.now();
            set((s) => ({
              m2: { ...nextClock, loss: judged.loss },
              outcome: judged.outcome,
              victoryReason: judged.victoryReason,
              defeatReason: null,
              combatIntensity: s.combatIntensity + 1,
              units: s.units.map((u) =>
                u.id === updatedEnemy.id
                  ? {
                      ...u,
                      facing: shotFacing,
                      ap: Math.max(0, u.ap - 1),
                    }
                  : u,
              ),
              activeProjectile: {
                id: nextFxId(),
                from: updatedEnemy.pos,
                to: WINDLASS,
                hitChance: 100,
                kind: "grenade",
                createdAt: nowTs,
                durationMs: 1200,
                hit: true,
                critical: false,
                misfired: false,
                damage: 0,
                bloodSeverity: 0,
                armorShredded: 0,
                armorAbsorbed: 0,
                killed: false,
                missImpactCoord: WINDLASS,
              },
              combatLog: [
                ...s.combatLog,
                makeLog(
                  s.round,
                  "enemy",
                  phrase("log.m2.pitch.thrown"),
                  "alert",
                ),
              ],
            }));
            await delay(1250);
            if (isStaleSession(epoch)) return;
            set({ activeProjectile: null });
          } else if (chosenTargetEval) {
            const targetUnit = get().units.find(
              (u) => u.id === chosenTargetEval.targetId && u.alive,
            );
            if (
              targetUnit &&
              targetUnit.id !== "player-colloredo" &&
              !isCompanionProtectedByCount(
                get().grid,
                updatedEnemy.pos,
                targetUnit,
                get().units,
              )
            ) {
              deps.noteMission3Noise("shot");
              const outcome = rollRangedAttack(
                updatedEnemy,
                targetUnit,
                chosenTargetEval.calculation,
              );
              const shotFacing = facingFromDelta(
                updatedEnemy.pos,
                targetUnit.pos,
                updatedEnemy.facing,
              );

              if (outcome.misfired) {
                playMisfireSound();
              } else {
                get().grid.addSmoke(
                  updatedEnemy.pos,
                  0,
                  gunfireSmokeTurns(get().grid, updatedEnemy.pos, get().weather),
                );
                playGunshotSound(updatedEnemy.weapon.lockType === "wheellock");
              }

              const enemyFireAp = updatedEnemy.weapon.fireApCost ?? 1;

              const impactMeta = resolveShotImpactMetadata(
                get().grid,
                updatedEnemy.pos,
                targetUnit.pos,
                outcome,
              );
              const nowTs = performance.now();
              set((s) => ({
                activeFloor: targetUnit.pos.y,
                smokeVersion: s.smokeVersion + 1,
                combatIntensity: s.combatIntensity + 1,
                blastZones: [
                  ...s.blastZones.slice(-18),
                  {
                    id: nextFxId(),
                    coord: updatedEnemy.pos,
                    createdAt: nowTs,
                    baseRadius: 1.5,
                    maxRadius: 4.0,
                    isExplosion: false,
                  },
                  ...(outcome.misfired
                    ? []
                    : [
                        {
                          id: nextFxId(),
                          coord: outcome.hit
                            ? targetUnit.pos
                            : impactMeta.missImpactCoord,
                          createdAt: nowTs,
                          baseRadius: 1.2,
                          maxRadius: 3.4,
                          isExplosion: false,
                        },
                      ]),
                ],
                units: s.units.map((u) =>
                  u.id === updatedEnemy.id
                    ? {
                        ...u,
                        facing: shotFacing,
                        ap: Math.max(0, u.ap - enemyFireAp),
                        firearmLoaded: false,
                        reloadProgress: 0,
                      }
                    : u,
                ),
                activeProjectile: {
                  id: nextFxId(),
                  from: updatedEnemy.pos,
                  to: targetUnit.pos,
                  targetId: targetUnit.id,
                  hitChance: outcome.hitChance,
                  kind: "bullet",
                  createdAt: nowTs,
                  durationMs: 1780,
                  hit: outcome.hit,
                  critical: outcome.critical,
                  misfired: outcome.misfired,
                  damage: outcome.damage,
                  bloodSeverity: impactMeta.bloodSeverity,
                  armorShredded: outcome.armorShredded,
                  armorAbsorbed: outcome.armorAbsorbed,
                  killed: outcome.killed,
                  impactObstacle: impactMeta.impactObstacle,
                  missImpactCoord: impactMeta.missImpactCoord,
                },
                lightFlashes: addLightFlash(
                  s.lightFlashes,
                  muzzleFlashDraft(updatedEnemy.pos, shotFacing, outcome.misfired),
                ),
              }));

              deps.triggerUnitFx(updatedEnemy.id, {
                lunge: true,
                banner: outcome.misfired
                  ? { phrase: phrase("banner.misfire"), tone: "misfire" }
                  : undefined,
              });
              await delay(730);
              if (isStaleSession(epoch)) return;
              if (!outcome.misfired) {
                if (outcome.hit) {
                  playHitSound(outcome.critical, impactMeta.bloodSeverity);
                } else {
                  playRicochetSound(
                    impactMeta.impactObstacle === "palace_wood",
                  );
                }
              }

              let newlyDetainedByEnemyShot = false;
              let immediateDefeatReason: CaptureReason | null = null;
              const beforeEnemyShotTarget =
                get().units.find((u) => u.id === targetUnit.id) ?? targetUnit;
              let afterEnemyShotTarget: UnitData = beforeEnemyShotTarget;

              set((s) => {
                if (!outcome.misfired) {
                  s.grid.damageTile(
                    outcome.hit ? targetUnit.pos : impactMeta.missImpactCoord,
                    1,
                  );
                }
                const nextUnits = s.units.map((u) => {
                  if (u.id !== targetUnit.id) return u;
                  return applyDamageToUnit(u, outcome.damage, {
                    armorShred: outcome.armorShredded,
                    shaken:
                      u.isShaken ||
                      (outcome.hit && (outcome.critical || outcome.damage >= 4)),
                  });
                });

                const captureSync = syncColloredoCaptureState(nextUnits);
                newlyDetainedByEnemyShot = captureSync.newlyDetained;
                const syncedUnits = syncColloredoMobility(captureSync.units);
                afterEnemyShotTarget =
                  syncedUnits.find((u) => u.id === targetUnit.id) ??
                  beforeEnemyShotTarget;

                const msg = phrase("log.enemy.shot", {
                  attackerId: updatedEnemy.id,
                  targetId: targetUnit.id,
                  misfired: outcome.misfired,
                  hit: outcome.hit,
                  chance: outcome.hitChance,
                  damage: outcome.damage,
                  shred: outcome.armorShredded,
                  critical: outcome.critical,
                });

                const outcomeCheck = checkMissionOutcome(s.grid, syncedUnits, s.m2, s.m3);
                if (outcomeCheck.outcome === "defeat") {
                  immediateDefeatReason =
                    outcomeCheck.defeatReason ?? "all_companions_fallen";
                }

                const extraLogs: CombatLogEntry[] = [];
                if (captureSync.newlyDetained && !immediateDefeatReason) {
                  extraLogs.push(
                    makeLog(
                      s.round,
                      "enemy",
                      phrase("log.detained.enemyShot"),
                      "alert",
                    ),
                  );
                }

                const nextFog = computeFogOfWar(
                  s.grid,
                  syncedUnits,
                  s.weather,
                  s.fogSnapshot.exploredCoords,
                  extractDynamicLights(s.blastZones),
                  s.scenario,
                );

                return {
                  gridVersion: s.gridVersion + (outcome.misfired ? 0 : 1),
                  units: syncedUnits,
                  fogSnapshot: nextFog,
                  combatLog: [
                    ...s.combatLog,
                    makeLog(
                      s.round,
                      "enemy",
                      msg,
                      outcome.misfired
                        ? "misfire"
                        : outcome.hit
                          ? outcome.critical
                            ? "crit"
                            : "hit"
                          : "miss",
                    ),
                    ...extraLogs,
                  ],
                };
              });

              if (!outcome.misfired) {
                const enemyShotLoss = buildUnitCombatLoss(
                  beforeEnemyShotTarget,
                  afterEnemyShotTarget,
                  {
                    attackerId: updatedEnemy.id,
                    weaponId: updatedEnemy.weapon.id,
                    hit: outcome.hit,
                    critical: outcome.critical,
                    misfired: outcome.misfired,
                    hitChance: outcome.hitChance,
                    armorAbsorbed: outcome.armorAbsorbed,
                    durationMs: 1450,
                  },
                );
                deps.triggerUnitFx(targetUnit.id, {
                  hit: outcome.hit,
                  loss: enemyShotLoss,
                  banner: newlyDetainedByEnemyShot
                    ? { phrase: phrase("banner.detainedHalf"), tone: "crit" }
                    : outcome.hit
                       ? {
                           phrase: outcome.critical
                             ? phrase("banner.critShortBang", {
                                 damage: outcome.damage,
                               })
                             : phrase("banner.damage", { damage: outcome.damage }),
                           tone: outcome.critical ? "crit" : "hit",
                         }
                       : { phrase: phrase("banner.miss"), tone: "miss" },
                });
              }

              await delay(1050);
              if (isStaleSession(epoch)) return;
              set({ activeProjectile: null });

              if (immediateDefeatReason) {
                await deps.playCaptureFinalAnimationAndDefeat(
                  immediateDefeatReason,
                  get().round,
                );
                return;
              }

              const afterShotEnemy = get().units.find(
                (u) => u.id === updatedEnemy.id && u.alive && u.ap >= 1,
              );
              if (afterShotEnemy && afterShotEnemy.firearmLoaded === false) {
                const reqAp = afterShotEnemy.weapon.reloadApCost ?? 2;
                set((s) => ({
                  units: s.units.map((u) =>
                    u.id === afterShotEnemy.id
                      ? {
                          ...u,
                          ap: 0,
                          reloadProgress: 1,
                          firearmLoaded: 1 >= reqAp,
                        }
                      : u,
                  ),
                }));
              }
            }
          } else if (
            get().scenario === "mission2" &&
            plan.strikeWindlass &&
            windlassClock &&
            !windlassClock.seated &&
            windlassClock.windlassHp > 0
          ) {
            const clockNow = windlassClock;
            const dummy = windlassDummy(clockNow.windlassHp);
            const los = checkLineOfSight3D(get().grid, updatedEnemy.pos, WINDLASS);
            if (!los.clear) {
              set((s) => ({
                units: s.units.map((u) =>
                  u.id === updatedEnemy.id ? { ...u, ap: 0 } : u,
                ),
              }));
            } else {
              const calculation = calculateShot(
                get().grid,
                updatedEnemy,
                dummy,
                get().weather,
                updatedEnemy.pos,
              );
              const outcome = rollRangedAttack(updatedEnemy, dummy, calculation);
              const damage =
                outcome.hit && !outcome.misfired ? outcome.damage : 0;
              const nextClock = applyWindlassHit(clockNow, damage);
              const judged = judgeMission2(nextClock, get().units);
              const shotFacing = facingFromDelta(
                updatedEnemy.pos,
                WINDLASS,
                updatedEnemy.facing,
              );
              if (outcome.misfired) {
                playMisfireSound();
              } else {
                get().grid.addSmoke(
                  updatedEnemy.pos,
                  0,
                  gunfireSmokeTurns(get().grid, updatedEnemy.pos, get().weather),
                );
                playGunshotSound(updatedEnemy.weapon.lockType === "wheellock");
              }
              const enemyFireAp = updatedEnemy.weapon.fireApCost ?? 1;
              const nowTs = performance.now();
              set((s) => ({
                m2: { ...nextClock, loss: judged.loss },
                outcome: judged.outcome,
                victoryReason: judged.victoryReason,
                defeatReason: null,
                smokeVersion: s.smokeVersion + 1,
                combatIntensity: s.combatIntensity + 1,
                lightFlashes: addLightFlash(
                  s.lightFlashes,
                  muzzleFlashDraft(updatedEnemy.pos, shotFacing, outcome.misfired),
                ),
                units: s.units.map((u) =>
                  u.id === updatedEnemy.id
                    ? {
                        ...u,
                        facing: shotFacing,
                        ap: Math.max(0, u.ap - enemyFireAp),
                        firearmLoaded: false,
                        reloadProgress: 0,
                      }
                    : u,
                ),
                activeProjectile: {
                  id: nextFxId(),
                  from: updatedEnemy.pos,
                  to: WINDLASS,
                  hitChance: outcome.hitChance,
                  kind: "bullet",
                  createdAt: nowTs,
                  durationMs: 1780,
                  hit: outcome.hit,
                  critical: outcome.critical,
                  misfired: outcome.misfired,
                  damage: outcome.damage,
                  bloodSeverity: 0,
                  armorShredded: 0,
                  armorAbsorbed: 0,
                  killed: nextClock.windlassHp <= 0,
                  missImpactCoord: WINDLASS,
                },
                combatLog: [
                  ...s.combatLog,
                  makeLog(
                    s.round,
                    "enemy",
                    phrase("log.m2.windlassShot", {
                      unitId: updatedEnemy.id,
                      hit: outcome.hit && !outcome.misfired,
                      damage,
                      hp: nextClock.windlassHp,
                    }),
                    outcome.hit && !outcome.misfired ? "hit" : "miss",
                  ),
                ],
              }));
              await delay(900);
              if (isStaleSession(epoch)) return;
              set({ activeProjectile: null });
              if (judged.outcome !== "ongoing") {
                set((s) => ({
                  isBusy: false,
                  combatLog: [
                    ...s.combatLog,
                    makeLog(
                      s.round,
                      "enemy",
                      phrase(mission2LossPhrase(judged.loss ?? "windlass")),
                      "alert",
                    ),
                  ],
                }));
                return;
              }
            }
          } else {
            set((s) => ({
              units: s.units.map((u) =>
                u.id === updatedEnemy.id
                  ? { ...u, ap: 0, isOverwatch: true }
                  : u,
              ),
              combatLog: [
                ...s.combatLog,
                makeLog(
                  s.round,
                  "enemy",
                  phrase("log.enemy.overwatch", {
                    unitId: updatedEnemy.id,
                    facing: updatedEnemy.facing,
                  }),
                  "overwatch",
                ),
              ],
            }));
            deps.triggerUnitFx(updatedEnemy.id, {
              banner: { phrase: phrase("banner.preparedVolley"), tone: "overwatch" },
            });
            await delay(240);
            if (isStaleSession(epoch)) return;
          }

          if (await expireEnemyDeathThroes(enemyId)) return;
        }

        if (isStaleSession(epoch)) return;
        if (get().outcome !== "ongoing") {
          set({ isBusy: false });
          return;
        }

        if (get().scenario === "mission3" && get().m3) {
          const beforeClock = get().m3!;
          const beforeUnits = get().units;
          const closed = closeSwedishTurn(beforeClock, get().grid, beforeUnits);
          const judged = judgeMission3(closed.clock, closed.units);
          const logs = mission3StepLogs(
            get().round,
            "enemy",
            beforeClock,
            closed.clock,
            beforeUnits,
            closed.units,
          );
          const canisterFired =
            !beforeClock.silent && beforeClock.coneWarned && closed.clock.cone !== null;
          if (canisterFired) {
            playExplosionSound();
            const nowTs = performance.now();
            get().triggerLightFlash({
              kind: "blast",
              coord: MUZZLE,
              color: "#f97316",
              intensity: 14,
              radius: 12,
              durationMs: 550,
            });
            const hitTiles = closed.clock.cone
              ? tilesHitByCanister(get().grid, closed.clock.cone)
              : [];
            set((s) => ({
              combatIntensity: s.combatIntensity + 2,
              blastZones: [
                ...s.blastZones.slice(-18),
                {
                  id: nextFxId(),
                  coord: MUZZLE,
                  createdAt: nowTs,
                  baseRadius: 2.0,
                  maxRadius: 6.0,
                  isExplosion: true,
                },
              ],
            }));
            for (const afterUnit of closed.units) {
              const beforeUnit = beforeUnits.find((u) => u.id === afterUnit.id);
              if (!beforeUnit) continue;
              const wasHit =
                afterUnit.hp < beforeUnit.hp || afterUnit.armor < beforeUnit.armor;
              const inCone = hitTiles.some((t) => sameCoord(t, afterUnit.pos));
              if ((wasHit || inCone) && wasHit) {
                deps.triggerUnitFx(afterUnit.id, {
                  hit: true,
                  loss: buildUnitCombatLoss(beforeUnit, afterUnit, {
                    attackerId: "enemy-gunner",
                    weaponId: "falconet_canister",
                    hit: true,
                    critical: false,
                    misfired: false,
                    hitChance: 100,
                    durationMs: 1400,
                  }),
                  banner: {
                    phrase: phrase("banner.damage", {
                      damage: beforeUnit.hp - afterUnit.hp,
                    }),
                    tone: "crit",
                  },
                });
              }
            }
          }
          if (judged.outcome !== "ongoing") {
            set({
              m3: { ...closed.clock, loss: judged.loss },
              units: closed.units,
              gridVersion: get().gridVersion + 1,
              outcome: judged.outcome,
              victoryReason: judged.victoryReason,
              defeatReason: null,
              isBusy: false,
              combatLog: [
                ...get().combatLog,
                ...logs,
                mission3OutcomeLog(get().round, judged, closed.clock.deliveries),
              ],
            });
            return;
          }
          set({
            m3: closed.clock,
            units: closed.units,
            gridVersion: get().gridVersion + 1,
            combatLog: [...get().combatLog, ...logs],
          });
        }

        if (get().scenario === "mission2" && get().m2) {
          const closed = closeEnemyTurn(get().m2!, get().units);
          const judged = judgeMission2(closed, get().units);
          if (judged.outcome !== "ongoing") {
            const loss = judged.loss;
            set({
              m2: { ...closed, loss },
              outcome: judged.outcome,
              victoryReason: judged.victoryReason,
              defeatReason: null,
              isBusy: false,
              combatLog: [
                ...get().combatLog,
                makeLog(
                  get().round,
                  judged.outcome === "victory" ? "player" : "enemy",
                  judged.outcome === "victory"
                    ? phrase("log.m2.victory")
                    : phrase(mission2LossPhrase(loss ?? "rite")),
                  judged.outcome === "victory" ? "story" : "alert",
                ),
              ],
            });
            return;
          }
          set({ m2: closed });
        }

        get().grid.decaySmoke(get().weather);

        set((s) => {
          const nextRound = s.round + 1;
          let spawnedReinforcements = false;
          let incomingUnits: UnitData[] = [];
          const extraRoundLogs: CombatLogEntry[] = [];

          if (s.scenario === "mission1" && nextRound === 3) {
            extraRoundLogs.push(
              makeLog(3, "enemy", phrase("log.warn.reinforcement.3"), "alert"),
            );
          } else if (s.scenario === "mission1" && nextRound === 4) {
            extraRoundLogs.push(
              makeLog(4, "enemy", phrase("log.warn.reinforcement.4"), "alert"),
            );
          } else if (
            s.scenario === "mission1" &&
            nextRound >= s.reinforcementRound &&
            !s.reinforcementsSpawned
          ) {
            spawnedReinforcements = true;
            const newUnits = createReinforcementUnits();
            incomingUnits = newUnits.map((nu) => {
              const freePos = findFreeSpawnCoord(s.grid, s.units, nu.pos);
              return { ...nu, pos: freePos };
            });
            extraRoundLogs.push(
              makeLog(
                nextRound,
                "enemy",
                phrase("log.reinforcement.arrive"),
                "alert",
              ),
            );
          }

          const combinedUnits = [...s.units, ...incomingUnits];
          const unitsWithChoking = applyBlackPowderChoking(combinedUnits, s.grid);
          const refreshedUnits = syncColloredoMobility(
            unitsWithChoking.map((u) => {
              if (u.faction !== "player" || !u.alive) return u;
              const detained = (u.detainedTurns ?? 0) > 0;
              const fighting = isUnitFighting(u);
              return {
                ...u,
                ap: fighting && !detained ? u.maxAp : 0,
                movedThisTurn: false,
                isOverwatch: false,
                isShaken: false,
                abilityBuffActive: false,
                deathThroesTurns:
                  fighting && u.inDeathThroes ? 0 : u.deathThroesTurns,
                ability: u.ability
                  ? {
                      ...u.ability,
                      currentCooldown: Math.max(0, u.ability.currentCooldown - 1),
                    }
                  : undefined,
              };
            }),
          );
          const currentSelected = refreshedUnits.find(
            (u) =>
              u.id === s.selectedUnitId &&
              u.faction === "player" &&
              isUnitFighting(u) &&
              u.ap > 0 &&
              (u.detainedTurns ?? 0) === 0,
          );
          const nextSelectedId =
            currentSelected?.id ??
            refreshedUnits.find(
              (u) =>
                u.faction === "player" &&
                isUnitFighting(u) &&
                u.ap > 0 &&
                (u.detainedTurns ?? 0) === 0,
            )?.id ??
            refreshedUnits.find(
              (u) => u.faction === "player" && isUnitFighting(u),
            )?.id ??
            null;
          const nextSelectedUnit = refreshedUnits.find(
            (u) => u.id === nextSelectedId,
          );
          const nextDerived = deriveSelectionData(
            s.grid,
            refreshedUnits,
            nextSelectedId,
            s.weather,
            s.selectedTargetId,
            s.fogSnapshot.exploredCoords,
            s.blastZones,
            s.fogOfWarEnabled,
            s.scenario,
          );

          let finalSelectedId = nextSelectedId;
          let finalFloor = nextSelectedUnit ? nextSelectedUnit.pos.y : 0;
          let nextGuidedStep = s.guidedTutorial.currentStep;

          if (s.scenario === "mission1" && s.guidedTutorial.enabled && !s.guidedTutorial.dismissed) {
            if (
              s.guidedTutorial.currentStep === "step_5_enemy_turn_react" ||
              s.guidedTutorial.currentStep === "step_4_vaclav_shoot"
            ) {
              nextGuidedStep = "step_6_vaclav_reload";
              finalSelectedId = "player-vaclav-michalovic";
              finalFloor = 1;
            }
          }

          return {
            round: nextRound,
            reinforcementsSpawned: s.reinforcementsSpawned || spawnedReinforcements,
            turn: "player",
            smokeVersion: s.smokeVersion + 1,
            isBusy: false,
            units: refreshedUnits,
            selectedUnitId: finalSelectedId,
            activeFloor: finalFloor,
            actionMode: "move",
            guidedTutorial: {
              ...s.guidedTutorial,
              currentStep: nextGuidedStep,
            },
            fogSnapshot: nextDerived.fogSnapshot,
            reachableTiles: nextDerived.reachableTiles,
            visibleTargets: nextDerived.visibleTargets,
            visibleMeleeTargets: nextDerived.visibleMeleeTargets,
            selectedTargetId: nextDerived.selectedTargetId,
            combatLog: [
              ...s.combatLog,
              makeLog(
                nextRound,
                "player",
                phrase(
                  s.scenario === "mission3"
                    ? "log.m3.round.player"
                    : s.scenario === "mission2"
                      ? "log.m2.round.player"
                      : "log.round.player",
                  { count: nextRound },
                ),
                "info",
              ),
              ...extraRoundLogs,
            ],
          };
        });
      })();
    },
  };
}
