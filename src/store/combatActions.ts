import { phrase } from "../i18n/runtime";
import {
  applyDamageToUnit,
  calculateMeleeAttack,
  facingFromDelta,
  gridDistance3D,
  isAdjacentForMelee,
  isUnitFighting,
  rollMeleeAttack,
  rollRangedAttack,
} from "../core/CombatSystem";
import { CARDINAL_OFFSETS, sameCoord } from "../core/GridSystem";
import type {
  CaptureReason,
  CardinalDir,
  CombatLogEntry,
  GridCoord,
  GuidedTutorialStep,
  UnitData,
} from "../core/types";
import { displaceFromMelee } from "../core/mission3";
import {
  playExplosionSound,
  playGunshotSound,
  playHitSound,
  playMeleeSound,
  playMisfireSound,
  playRicochetSound,
  playSpecialAbilitySound,
} from "../utils/audioSystem";
import { muzzleFlashDraft } from "../core/diegeticLights";
import {
  appendVictoryLog,
  buildUnitCombatLoss,
  checkMissionOutcome,
  deriveSelectionData,
  findNextAvailablePlayerUnit,
  gunfireSmokeTurns,
  processExplosions,
  resolveShotImpactMetadata,
  syncColloredoCaptureState,
  syncColloredoMobility,
  syncMission3BearerDrop,
} from "./combatResolution";
import { mirrorTutorialFields } from "./scenarioLifecycle";
import type {
  StoreGet,
  StoreRuntimeDeps,
  StoreSet,
  UnitCombatLoss,
} from "./storeTypes";
import {
  addLightFlash,
  delay,
  getSessionEpoch,
  isStaleSession,
  makeLog,
  nextFxId,
  scheduleTimer,
} from "./storeUtils";

export function executeKegShot(
  set: StoreSet,
  get: StoreGet,
  deps: StoreRuntimeDeps,
  activeUnit: UnitData,
  coord: GridCoord,
): void {
  const epoch = getSessionEpoch();
  void (async () => {
    const newFacing = facingFromDelta(
      activeUnit.pos,
      coord,
      activeUnit.facing,
    );
    playGunshotSound(activeUnit.weapon.lockType === "wheellock");
    deps.noteMission3Noise("shot");
    get().grid.addSmoke(
      activeUnit.pos,
      0,
      gunfireSmokeTurns(get().grid, activeUnit.pos, get().weather),
    );
    const nowTs = performance.now();

    set((s) => ({
      isBusy: true,
      smokeVersion: s.smokeVersion + 1,
      combatIntensity: s.combatIntensity + 1,
      blastZones: [
        ...s.blastZones.slice(-18),
        {
          id: nextFxId(),
          coord: activeUnit.pos,
          createdAt: nowTs,
          baseRadius: 1.5,
          maxRadius: 4.0,
          isExplosion: false,
        },
      ],
      units: s.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              facing: newFacing,
              ap: 0,
              isOverwatch: false,
              abilityBuffActive: false,
              firearmLoaded: false,
              reloadProgress: 0,
              pistolLoaded: u.id === "player-colloredo" ? false : u.pistolLoaded,
            }
          : u,
      ),
      activeProjectile: {
        id: nextFxId(),
        from: activeUnit.pos,
        to: coord,
        kind: "bullet",
        createdAt: nowTs,
        durationMs: 1780,
        hit: true,
        critical: true,
        damage: 5,
        bloodSeverity: 0,
        detonatedKegs: [coord],
      },
      lightFlashes: addLightFlash(
        s.lightFlashes,
        muzzleFlashDraft(activeUnit.pos, newFacing, false),
      ),
    }));

    deps.triggerUnitFx(activeUnit.id, {
      lunge: true,
      banner: { phrase: phrase("banner.detonate"), tone: "crit" },
    });

    await delay(730);
    if (isStaleSession(epoch)) return;
    playExplosionSound();

    const beforeUnitsKeg = get().units;
    deps.noteMission3Noise("blast");
    const impactTs = performance.now();
    const blast = processExplosions(
      get().grid,
      beforeUnitsKeg,
      coord,
      5,
      2,
      get().weather,
      get().scenario,
    );
    const bearerDrop = syncMission3BearerDrop(
      get().scenario,
      get().m3,
      get().grid,
      blast.nextUnits,
    );
    const captureSync = syncColloredoCaptureState(bearerDrop.units);
    const syncedUnits = syncColloredoMobility(captureSync.units);

    for (const vid of blast.victims) {
      const bUnit = beforeUnitsKeg.find((u) => u.id === vid);
      const aUnit = syncedUnits.find((u) => u.id === vid);
      const kegLoss =
        bUnit && aUnit
          ? buildUnitCombatLoss(bUnit, aUnit, {
              attackerId: activeUnit.id,
              weaponId: "powder_keg",
              hit: true,
              critical: true,
              misfired: false,
              hitChance: 100,
              durationMs: 1500,
            })
          : null;
      deps.triggerUnitFx(vid, {
        hit: true,
        loss: kegLoss,
        banner: { phrase: phrase("banner.kegBlast"), tone: "crit" },
      });
    }

    set((s) => {
      const nextGuidedStep: GuidedTutorialStep =
        s.scenario === "mission1" &&
        s.guidedTutorial.enabled &&
        !s.guidedTutorial.dismissed &&
        s.guidedTutorial.currentStep === "step_7_keg_explosion"
          ? "step_8_melee_finish"
          : s.guidedTutorial.currentStep;
      const tutorialPatch = mirrorTutorialFields(
        { ...s.guidedTutorial, currentStep: nextGuidedStep },
        s.scenario,
      );
      return {
        gridVersion: s.gridVersion + 1,
        smokeVersion: s.smokeVersion + 2,
        combatIntensity: s.combatIntensity + 2,
        blastZones: [
          ...s.blastZones.slice(-18),
          {
            id: nextFxId(),
            coord,
            createdAt: impactTs,
            baseRadius: 2.8,
            maxRadius: 7.5,
            isExplosion: true,
          },
        ],
        lightFlashes: addLightFlash(
          s.lightFlashes,
          {
            kind: "blast",
            coord,
            color: "#f97316",
            intensity: 14,
            radius: 12,
            durationMs: 550,
          },
          impactTs,
        ),
        m3: bearerDrop.m3,
        units: syncedUnits,
        ...tutorialPatch,
        combatLog: [
          ...s.combatLog,
          makeLog(
            s.round,
            "player",
            phrase("log.keg.shot", {
              attackerId: activeUnit.id,
              x: coord.x,
              z: coord.z,
              count: blast.victims.length,
            }),
            "crit",
          ),
          ...(bearerDrop.dropped
            ? [makeLog(s.round, "player", phrase("log.m3.cart.drop"), "story")]
            : []),
        ],
      };
    });

    await delay(1050);
    if (isStaleSession(epoch)) return;
    const afterState = get();
    const outcomeCheck = checkMissionOutcome(
      afterState.grid,
      afterState.units,
      afterState.m2,
      afterState.m3,
    );
    if (outcomeCheck.outcome === "defeat") {
      await deps.playCaptureFinalAnimationAndDefeat(
        outcomeCheck.defeatReason ?? "zero_hp",
        afterState.round,
      );
      return;
    }
    const nextDerived = deriveSelectionData(
      afterState.grid,
      afterState.units,
      afterState.selectedUnitId,
      afterState.weather,
      afterState.selectedTargetId,
      afterState.fogSnapshot.exploredCoords,
      afterState.blastZones,
      afterState.fogOfWarEnabled,
      afterState.scenario,
    );
    set((s) => ({
      isBusy: false,
      activeProjectile: null,
      actionMode: "move",
      outcome: outcomeCheck.outcome,
      victoryReason: outcomeCheck.victoryReason,
      defeatReason: outcomeCheck.defeatReason,
      fogSnapshot: nextDerived.fogSnapshot,
      reachableTiles: nextDerived.reachableTiles,
      visibleTargets: nextDerived.visibleTargets,
      visibleMeleeTargets: nextDerived.visibleMeleeTargets,
      selectedTargetId: nextDerived.selectedTargetId,
      combatLog: appendVictoryLog(
        s.combatLog,
        s.round,
        outcomeCheck,
        s.m3?.deliveries,
      ),
    }));
  })();
}

export function createCombatActions(
  set: StoreSet,
  get: StoreGet,
  deps: StoreRuntimeDeps,
) {
  return {
    executeShoot: (targetIdArg?: string) => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const attacker = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !attacker ||
        !attacker.alive ||
        attacker.ap < 1 ||
        (attacker.detainedTurns ?? 0) > 0 ||
        !isUnitFighting(attacker)
      )
        return;

      if (attacker.id === "player-colloredo" && attacker.pistolLoaded === false) {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(s.round, "player", phrase("log.pistol.spent"), "alert"),
          ],
        }));
        deps.triggerUnitFx(attacker.id, {
          banner: { phrase: phrase("banner.pistolEmpty"), tone: "misfire" },
        });
        return;
      }

      if (attacker.firearmLoaded === false) {
        const reqReloadAp = attacker.weapon.reloadApCost ?? 2;
        const curReload = attacker.reloadProgress ?? 0;
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.weapon.empty", {
                unitId: attacker.id,
                weaponId: attacker.weapon.id,
                progress: curReload,
                required: reqReloadAp,
              }),
              "alert",
            ),
          ],
        }));
        deps.triggerUnitFx(attacker.id, {
          banner: {
            phrase: phrase("banner.barrelEmptyProgress", {
              progress: curReload,
              required: reqReloadAp,
            }),
            tone: "misfire",
          },
        });
        return;
      }

      const baseFireAp = attacker.weapon.fireApCost ?? 1;
      const isHipFire =
        baseFireAp >= 2 && (attacker.movedThisTurn || attacker.ap < baseFireAp);

      if (baseFireAp >= 2 && isHipFire && !attacker.weapon.allowEmergencyHipFire) {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.fork.requiresTwoAp", { weaponId: attacker.weapon.id }),
              "alert",
            ),
          ],
        }));
        deps.triggerUnitFx(attacker.id, {
          banner: { phrase: phrase("banner.needTwoApStill"), tone: "misfire" },
        });
        return;
      }

      const apSpent = isHipFire ? 1 : baseFireAp;

      const chosenId = targetIdArg ?? state.selectedTargetId;
      const targetEval = state.visibleTargets.find(
        (t) => t.targetId === chosenId,
      );
      const target = state.units.find((u) => u.id === chosenId && u.alive);
      if (!targetEval || !target) return;

      const epoch = getSessionEpoch();
      void (async () => {
        deps.noteMission3Noise("shot");
        const outcome = rollRangedAttack(
          attacker,
          target,
          targetEval.calculation,
        );
        const newFacing = facingFromDelta(
          attacker.pos,
          target.pos,
          attacker.facing,
        );

        const isVerdictShot =
          attacker.abilityBuffActive &&
          attacker.ability?.id === "klementinum_verdict";

        if (outcome.misfired) {
          playMisfireSound();
        } else {
          playGunshotSound(attacker.weapon.lockType === "wheellock");
          get().grid.addSmoke(
            attacker.pos,
            0,
            gunfireSmokeTurns(get().grid, attacker.pos, get().weather),
          );
        }

        const neighborKegDir = (["N", "E", "S", "W"] as CardinalDir[]).find(
          (dir) => {
            const { dx, dz } = CARDINAL_OFFSETS[dir];
            const t = get().grid.getTile({
              x: target.pos.x + dx,
              y: target.pos.y,
              z: target.pos.z + dz,
            });
            return t && t.obstacle === "powder_keg";
          },
        );
        const willDetonateKegPos =
          neighborKegDir &&
          !outcome.misfired &&
          outcome.hit &&
          (outcome.critical || outcome.damage >= 5)
            ? {
                x: target.pos.x + CARDINAL_OFFSETS[neighborKegDir].dx,
                y: target.pos.y,
                z: target.pos.z + CARDINAL_OFFSETS[neighborKegDir].dz,
              }
            : null;

        const impactMeta = resolveShotImpactMetadata(
          get().grid,
          attacker.pos,
          target.pos,
          outcome,
        );
        const nowTs = performance.now();
        const isPistol =
          Boolean(attacker.weapon.isPistol) || attacker.id === "player-colloredo";

        set((s) => ({
          isBusy: true,
          activeFloor: target.pos.y,
          smokeVersion: s.smokeVersion + 1,
          combatIntensity: s.combatIntensity + (willDetonateKegPos ? 3 : 1),
          blastZones: [
            ...s.blastZones.slice(-18),
            {
              id: nextFxId(),
              coord: attacker.pos,
              createdAt: nowTs,
              baseRadius: 1.5,
              maxRadius: 4.2,
              isExplosion: false,
            },
            ...(outcome.misfired
              ? []
              : [
                  {
                    id: nextFxId(),
                    coord:
                      willDetonateKegPos ??
                      (outcome.hit ? target.pos : impactMeta.missImpactCoord),
                    createdAt: nowTs,
                    baseRadius: willDetonateKegPos ? 2.8 : 1.3,
                    maxRadius: willDetonateKegPos ? 7.5 : 3.6,
                    isExplosion: !!willDetonateKegPos,
                  },
                ]),
          ],
          units: s.units.map((u) =>
            u.id === attacker.id
              ? {
                  ...u,
                  facing: newFacing,
                  ap: isVerdictShot && outcome.hit
                    ? 1
                    : isPistol
                      ? Math.max(0, u.ap - apSpent)
                      : 0,
                  isOverwatch: false,
                  isShaken: isHipFire ? true : u.isShaken,
                  abilityBuffActive: false,
                  pistolLoaded:
                    attacker.id === "player-colloredo" ? false : u.pistolLoaded,
                  firearmLoaded: false,
                  reloadProgress: 0,
                }
              : u,
          ),
          activeProjectile: {
            id: nextFxId(),
            from: attacker.pos,
            to: target.pos,
            targetId: target.id,
            hitChance: outcome.hitChance,
            kind: isVerdictShot ? "sniper_beam" : "bullet",
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
            detonatedKegs: willDetonateKegPos ? [willDetonateKegPos] : undefined,
          },
          lightFlashes: willDetonateKegPos
            ? addLightFlash(
                addLightFlash(
                  s.lightFlashes,
                  muzzleFlashDraft(attacker.pos, newFacing, outcome.misfired),
                ),
                {
                  kind: "blast",
                  coord: willDetonateKegPos,
                  color: "#f97316",
                  intensity: 14,
                  radius: 12,
                  durationMs: 550,
                },
              )
            : addLightFlash(
                s.lightFlashes,
                muzzleFlashDraft(attacker.pos, newFacing, outcome.misfired),
              ),
        }));

        deps.triggerUnitFx(attacker.id, {
          lunge: true,
          banner: outcome.misfired
            ? { phrase: phrase("banner.misfireMatchcord"), tone: "misfire" }
            : isHipFire
              ? { phrase: phrase("banner.hipFire"), tone: "overwatch" }
              : undefined,
        });

        await delay(730);
        if (isStaleSession(epoch)) return;
        if (!outcome.misfired) {
          if (outcome.hit) {
            playHitSound(outcome.critical, impactMeta.bloodSeverity);
          } else {
            playRicochetSound(impactMeta.impactObstacle === "palace_wood");
          }
        }
        if (willDetonateKegPos) {
          playExplosionSound();
        }

        let rescuedByShot = false;
        let detainedByBlast = false;
        let pendingDefeatReason: CaptureReason | null = null;
        let kegVictims: string[] = [];
        const beforeUnitsShoot = get().units;
        const beforeTargetShoot =
          beforeUnitsShoot.find((u) => u.id === target.id) ?? target;
        let afterUnitsShoot: UnitData[] = beforeUnitsShoot;

        set((s) => {
          if (!outcome.misfired) {
            s.grid.damageTile(
              outcome.hit ? target.pos : impactMeta.missImpactCoord,
              1,
            );
          }
          const updatedUnits = s.units.map((u) => {
            if (u.id !== target.id) return u;
            return applyDamageToUnit(u, outcome.damage, {
              armorShred: outcome.armorShredded,
              shaken:
                u.isShaken ||
                (outcome.hit && (outcome.critical || outcome.damage >= 4)),
            });
          });

          const targetAfter = updatedUnits.find((u) => u.id === target.id);
          const wasInstantKilled = targetAfter ? !targetAfter.alive : false;
          const enteredThroesNow = targetAfter ? targetAfter.inDeathThroes && !target.inDeathThroes : false;
          const shotPhrase = phrase("log.shot", {
            attackerId: attacker.id,
            targetId: target.id,
            weaponId: attacker.weapon.id,
            chance: outcome.hitChance,
            damage: outcome.damage,
            misfire: outcome.misfireChance,
            hit: outcome.hit,
            critical: outcome.critical,
            misfired: outcome.misfired,
            hipFire: isHipFire,
            fork: baseFireAp >= 2,
            height: outcome.heightAdvantage,
            flanked: outcome.flanked,
            shred: outcome.armorShredded,
            absorbed: outcome.armorAbsorbed,
            instant: wasInstantKilled,
            enteredThroes: enteredThroesNow,
            agony: !!targetAfter?.inDeathThroes,
            hp: targetAfter?.hp,
          });

          let finalUnits = updatedUnits;
          let kegDetonated = false;

          if (willDetonateKegPos) {
            const blast = processExplosions(
              s.grid,
              updatedUnits,
              willDetonateKegPos,
              5,
              2,
              s.weather,
              s.scenario,
            );
            finalUnits = blast.nextUnits;
            kegVictims = blast.victims;
            kegDetonated = true;
          }

          const bearerDrop = syncMission3BearerDrop(
            s.scenario,
            s.m3,
            s.grid,
            finalUnits,
          );
          const captureSync = syncColloredoCaptureState(bearerDrop.units);
          rescuedByShot = captureSync.rescued;
          detainedByBlast = captureSync.newlyDetained;
          finalUnits = syncColloredoMobility(captureSync.units);
          afterUnitsShoot = finalUnits;

          const outcomeCheck = checkMissionOutcome(s.grid, finalUnits, s.m2, bearerDrop.m3);
          if (outcomeCheck.outcome === "defeat") {
            pendingDefeatReason = outcomeCheck.defeatReason ?? "zero_hp";
          }

          const newLogs = [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              shotPhrase,
              outcome.misfired
                ? "misfire"
                : outcome.hit
                  ? outcome.critical
                    ? "crit"
                    : "hit"
                  : "miss",
            ),
          ];
          if (kegDetonated && willDetonateKegPos) {
            newLogs.push(
              makeLog(
                s.round,
                "player",
                phrase("log.keg.spark", {
                  x: willDetonateKegPos.x,
                  z: willDetonateKegPos.z,
                }),
                "alert",
              ),
            );
          }
          if (captureSync.rescued) {
            newLogs.push(
              makeLog(s.round, "player", phrase("log.rescue.shot"), "story"),
            );
          } else if (captureSync.newlyDetained) {
            newLogs.push(
              makeLog(s.round, "enemy", phrase("log.detained.blast"), "alert"),
            );
          }

          const nextTutorialStep =
            s.tutorialStep === 2
              ? (3 as const)
              : kegDetonated && s.tutorialStep === 3
                ? (4 as const)
                : s.tutorialStep;

          const nextGuidedStep: GuidedTutorialStep =
            s.scenario === "mission1" &&
            s.guidedTutorial.enabled &&
            !s.guidedTutorial.dismissed &&
            s.guidedTutorial.currentStep === "step_4_vaclav_shoot"
              ? "step_5_enemy_turn_react"
              : s.scenario === "mission1" &&
                  s.guidedTutorial.enabled &&
                  !s.guidedTutorial.dismissed &&
                  kegDetonated &&
                  s.guidedTutorial.currentStep === "step_7_keg_explosion"
                ? "step_8_melee_finish"
                : s.guidedTutorial.currentStep;

          if (bearerDrop.dropped) {
            newLogs.push(makeLog(s.round, "player", phrase("log.m3.cart.drop"), "story"));
          }

          const tutorialPatch = mirrorTutorialFields(
            { ...s.guidedTutorial, currentStep: nextGuidedStep },
            s.scenario,
            nextTutorialStep,
          );

          return {
            gridVersion: s.gridVersion + (outcome.misfired && !bearerDrop.dropped ? 0 : 1),
            smokeVersion: s.smokeVersion + (kegDetonated ? 2 : 1),
            m3: bearerDrop.m3,
            units: finalUnits,
            ...tutorialPatch,
            combatLog: newLogs,
          };
        });

        if (!outcome.misfired) {
          const afterTargetShoot =
            afterUnitsShoot.find((u) => u.id === target.id) ?? beforeTargetShoot;
          const targetLoss = buildUnitCombatLoss(
            beforeTargetShoot,
            afterTargetShoot,
            {
              attackerId: attacker.id,
              weaponId: attacker.weapon.id,
              hit: outcome.hit,
              critical: outcome.critical,
              misfired: outcome.misfired,
              hitChance: outcome.hitChance,
              armorAbsorbed: outcome.armorAbsorbed,
              durationMs: 1550,
            },
          );
          deps.triggerUnitFx(target.id, {
            hit: outcome.hit,
            loss: targetLoss,
            banner: outcome.hit
              ? {
                  phrase: outcome.critical
                    ? phrase("banner.critShortBang", { damage: outcome.damage })
                    : phrase("banner.damage", { damage: outcome.damage }),
                  tone: outcome.critical ? "crit" : "hit",
                }
              : { phrase: phrase("banner.missedPlain"), tone: "miss" },
          });
        }

        for (const vid of kegVictims) {
          if (vid !== target.id) {
            const bUnit = beforeUnitsShoot.find((u) => u.id === vid);
            const aUnit = afterUnitsShoot.find((u) => u.id === vid);
            const vLoss =
              bUnit && aUnit
                ? buildUnitCombatLoss(bUnit, aUnit, {
                    attackerId: attacker.id,
                    weaponId: "powder_keg",
                    hit: true,
                    critical: true,
                    misfired: false,
                    hitChance: 100,
                    durationMs: 1550,
                  })
                : null;
            deps.triggerUnitFx(vid, {
              hit: true,
              loss: vLoss,
              banner: { phrase: phrase("banner.kegBlast"), tone: "crit" },
            });
          }
        }

        if (rescuedByShot) {
          deps.triggerUnitFx("player-colloredo", {
            banner: { phrase: phrase("banner.freed"), tone: "buff" },
          });
        } else if (detainedByBlast) {
          deps.triggerUnitFx("player-colloredo", {
            hit: true,
            banner: { phrase: phrase("banner.detainedHalf"), tone: "crit" },
          });
        }

        await delay(1050);
        if (isStaleSession(epoch)) return;

        set((s) => {
          const outcomeCheck = checkMissionOutcome(s.grid, s.units, s.m2, s.m3);
          const autoNextUnit = findNextAvailablePlayerUnit(s.units, s.selectedUnitId);
          const autoNextId = autoNextUnit?.id ?? s.selectedUnitId;
          const nextDerived = deriveSelectionData(
            s.grid,
            s.units,
            autoNextId,
            s.weather,
            s.selectedTargetId,
            s.fogSnapshot.exploredCoords,
            s.blastZones,
            s.fogOfWarEnabled,
            s.scenario,
          );
          return {
            isBusy: outcomeCheck.outcome === "defeat",
            activeProjectile: null,
            selectedUnitId: autoNextId,
            actionMode: "move",
            activeFloor: autoNextUnit ? autoNextUnit.pos.y : attacker.pos.y,
            outcome:
              outcomeCheck.outcome === "defeat"
                ? "ongoing"
                : outcomeCheck.outcome,
            victoryReason: outcomeCheck.victoryReason,
            fogSnapshot: nextDerived.fogSnapshot,
            reachableTiles: nextDerived.reachableTiles,
            visibleTargets: nextDerived.visibleTargets,
            visibleMeleeTargets: nextDerived.visibleMeleeTargets,
            selectedTargetId: nextDerived.selectedTargetId,
            combatLog: appendVictoryLog(
              s.combatLog,
              s.round,
              outcomeCheck,
              s.m3?.deliveries,
            ),
          };
        });

        if (pendingDefeatReason) {
          await deps.playCaptureFinalAnimationAndDefeat(
            pendingDefeatReason,
            get().round,
          );
        }
      })();
    },

    executeMelee: (
      targetIdArg?: string,
      options?: { freeChainAp?: boolean; rng?: () => number },
    ) => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const isFreeChain = options?.freeChainAp === true;
      const rng = options?.rng ?? Math.random;
      const attacker = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !attacker ||
        !attacker.alive ||
        (!isFreeChain && attacker.ap < 1) ||
        (attacker.detainedTurns ?? 0) > 0 ||
        !isUnitFighting(attacker)
      )
        return;

      const meleeWeapon = attacker.meleeWeapon ?? {
        id: "fist",
        name: "Pěstní souboj",
        kind: "fist" as const,
        minDamage: 1,
        maxDamage: 2,
        critBonusDamage: 1,
        baseCritChance: 5,
        baseAccuracy: 70,
        armorPierce: 0,
        armorShred: 0,
        description: "Zoufalý boj holýma rukama.",
      };

      const chosenId =
        targetIdArg ??
        state.visibleMeleeTargets[0]?.targetId ??
        state.selectedTargetId;
      const target = state.units.find(
        (u) =>
          u.id === chosenId &&
          isUnitFighting(u) &&
          u.faction !== attacker.faction,
      );
      if (!target || !isAdjacentForMelee(attacker.pos, target.pos)) return;

      const epoch = getSessionEpoch();
      void (async () => {
        const calc = calculateMeleeAttack(
          get().grid,
          attacker,
          target,
          get().units,
        );
        deps.noteMission3Noise("melee");
        const outcome = rollMeleeAttack(attacker, target, calc, rng);
        const newFacing = facingFromDelta(
          attacker.pos,
          target.pos,
          attacker.facing,
        );

        const isButt =
          meleeWeapon.kind === "pistol_butt" ||
          meleeWeapon.kind === "musket_butt";
        const spilledReload = !!(
          meleeWeapon.spillsReloadOnStrike &&
          attacker.firearmLoaded === false &&
          (attacker.reloadProgress ?? 0) > 0
        );
        playMeleeSound(isButt ? "butt" : "blade", outcome.hit, outcome.critical);

        const nowTs = performance.now();
        const bloodSev: 0 | 1 | 2 | 3 = !outcome.hit
          ? 0
          : isButt && outcome.damage < 6
            ? 1
            : outcome.critical || outcome.damage >= 5
              ? 3
              : 2;

        set((s) => ({
          isBusy: true,
          activeFloor: target.pos.y,
          combatIntensity: s.combatIntensity + 1,
          units: s.units.map((u) =>
            u.id === attacker.id
              ? {
                  ...u,
                  facing: newFacing,
                  ap: isFreeChain ? u.ap : Math.max(0, u.ap - 1),
                  isOverwatch: false,
                  reloadProgress: spilledReload ? 0 : u.reloadProgress,
                }
              : u,
          ),
          activeProjectile: {
            id: nextFxId(),
            from: attacker.pos,
            to: target.pos,
            targetId: target.id,
            hitChance: outcome.hitChance,
            kind: "melee_strike",
            createdAt: nowTs,
            durationMs: 1720,
            hit: outcome.hit,
            critical: outcome.critical,
            misfired: false,
            damage: outcome.damage,
            bloodSeverity: bloodSev,
            armorShredded: outcome.armorShredded,
            armorAbsorbed: outcome.armorAbsorbed,
            killed: outcome.killed,
          },
        }));

        deps.triggerUnitFx(attacker.id, {
          lunge: true,
          lungeKind: "melee",
          banner: spilledReload
            ? { phrase: phrase("banner.buttSpill"), tone: "overwatch" }
            : isFreeChain
              ? { phrase: phrase("banner.chargeFree"), tone: "buff" }
              : isButt
                ? { phrase: phrase("banner.buttStrike"), tone: "buff" }
                : { phrase: phrase("banner.meleeStrike"), tone: "buff" },
        });

        await delay(680);
        if (isStaleSession(epoch)) return;

        if (outcome.hit) {
          playHitSound(outcome.critical, bloodSev);
        } else {
          playRicochetSound(true);
        }

        let rescuedByStrike = false;
        let pendingDefeatReason: CaptureReason | null = null;
        const beforeUnits = get().units;
        const beforeTarget =
          beforeUnits.find((u) => u.id === target.id) ?? target;

        set((s) => {
          const stunnedByButt =
            outcome.hit &&
            (meleeWeapon.stunChance ?? 0) > 0 &&
            rng() * 100 < (meleeWeapon.stunChance ?? 0);

          const updatedUnits = s.units.map((u) => {
            if (u.id !== target.id) return u;
            return applyDamageToUnit(u, outcome.damage, {
              armorShred: outcome.armorShredded,
              shaken:
                u.isShaken ||
                stunnedByButt ||
                (outcome.hit && (outcome.critical || outcome.damage >= 3)),
            });
          });

          const targetAfter = updatedUnits.find((u) => u.id === target.id);
          const wasInstantKilled = targetAfter ? !targetAfter.alive : false;
          const enteredThroesNow = targetAfter ? targetAfter.inDeathThroes && !target.inDeathThroes : false;
          const meleePhrase = phrase("log.melee", {
            attackerId: attacker.id,
            targetId: target.id,
            meleeId: meleeWeapon.id,
            butt: isButt,
            hit: outcome.hit,
            critical: outcome.critical,
            chance: outcome.hitChance,
            damage: outcome.damage,
            stunned: stunnedByButt,
            spilled: spilledReload,
            height: outcome.heightAdvantage,
            shred: outcome.armorShredded,
            absorbed: outcome.armorAbsorbed,
            instant: wasInstantKilled,
            enteredThroes: enteredThroesNow,
            agony: !!targetAfter?.inDeathThroes,
            hp: targetAfter?.hp,
          });

          const pushedUnits =
            s.scenario === "mission3" && outcome.hit
              ? displaceFromMelee(s.grid, updatedUnits, attacker, target.id)
              : updatedUnits;
          const bearerDrop = syncMission3BearerDrop(
            s.scenario,
            s.m3,
            s.grid,
            pushedUnits,
          );
          const captureSync = syncColloredoCaptureState(bearerDrop.units);
          rescuedByStrike = captureSync.rescued;
          const finalUnits = syncColloredoMobility(captureSync.units);

          const outcomeCheck = checkMissionOutcome(s.grid, finalUnits, s.m2, bearerDrop.m3);
          if (outcomeCheck.outcome === "defeat") {
            pendingDefeatReason = outcomeCheck.defeatReason ?? "zero_hp";
          }

          const newLogs = [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              meleePhrase,
              outcome.hit ? (outcome.critical ? "crit" : "hit") : "miss",
            ),
          ];
          if (bearerDrop.dropped) {
            newLogs.push(makeLog(s.round, "player", phrase("log.m3.cart.drop"), "story"));
          }
          if (captureSync.rescued) {
            newLogs.push(
              makeLog(s.round, "player", phrase("log.rescue.melee"), "story"),
            );
          }

          let nextGuidedStep = s.guidedTutorial.currentStep;
          if (s.scenario === "mission1" && s.guidedTutorial.enabled && !s.guidedTutorial.dismissed) {
            if (s.guidedTutorial.currentStep === "step_8_melee_finish") {
              nextGuidedStep = "step_9_free_combat";
            }
          }

          const tutorialPatch = mirrorTutorialFields(
            { ...s.guidedTutorial, currentStep: nextGuidedStep },
            s.scenario,
            s.tutorialStep,
          );

          return {
            gridVersion: s.gridVersion + (bearerDrop.dropped ? 1 : 0),
            m3: bearerDrop.m3,
            units: finalUnits,
            ...tutorialPatch,
            combatLog: newLogs,
          };
        });

        const afterUnits = get().units;
        const afterTarget = afterUnits.find((u) => u.id === target.id);
        const lossObj: UnitCombatLoss | null =
          outcome.hit && afterTarget
            ? buildUnitCombatLoss(beforeTarget, afterTarget, {
                attackerId: attacker.id,
                weaponId: meleeWeapon.id,
                hit: true,
                critical: outcome.critical,
                misfired: false,
                hitChance: outcome.hitChance,
                armorAbsorbed: outcome.armorAbsorbed,
                durationMs: 1650,
              })
            : null;

        deps.triggerUnitFx(target.id, {
          hit: outcome.hit,
          loss: lossObj,
          banner: outcome.hit
            ? outcome.critical
              ? {
                  phrase: phrase("banner.critDamage", { damage: outcome.damage }),
                  tone: "crit",
                }
              : {
                  phrase: phrase("banner.damage", { damage: outcome.damage }),
                  tone: "hit",
                }
            : { phrase: phrase("banner.meleeMiss"), tone: "miss" },
        });

        if (rescuedByStrike) {
          deps.triggerUnitFx("player-colloredo", {
            banner: { phrase: phrase("banner.freed"), tone: "buff" },
          });
        }

        await delay(1040);
        if (isStaleSession(epoch)) return;

        set((s) => {
          const outcomeCheck = checkMissionOutcome(s.grid, s.units, s.m2, s.m3);
          const autoNextUnit = findNextAvailablePlayerUnit(s.units, s.selectedUnitId);
          const autoNextId = autoNextUnit?.id ?? s.selectedUnitId;
          const nextDerived = deriveSelectionData(
            s.grid,
            s.units,
            autoNextId,
            s.weather,
            s.selectedTargetId,
            s.fogSnapshot.exploredCoords,
            s.blastZones,
            s.fogOfWarEnabled,
            s.scenario,
          );
          return {
            isBusy: outcomeCheck.outcome === "defeat",
            activeProjectile: null,
            selectedUnitId: autoNextId,
            actionMode: "move",
            activeFloor: autoNextUnit ? autoNextUnit.pos.y : attacker.pos.y,
            outcome:
              outcomeCheck.outcome === "defeat"
                ? "ongoing"
                : outcomeCheck.outcome,
            victoryReason: outcomeCheck.victoryReason,
            fogSnapshot: nextDerived.fogSnapshot,
            reachableTiles: nextDerived.reachableTiles,
            visibleTargets: nextDerived.visibleTargets,
            visibleMeleeTargets: nextDerived.visibleMeleeTargets,
            selectedTargetId: nextDerived.selectedTargetId,
            combatLog: appendVictoryLog(
              s.combatLog,
              s.round,
              outcomeCheck,
              s.m3?.deliveries,
            ),
          };
        });

        if (pendingDefeatReason) {
          await deps.playCaptureFinalAnimationAndDefeat(
            pendingDefeatReason,
            get().round,
          );
        }
      })();
    },

    activateSpecialAbility: (unitIdArg?: string) => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const targetUnitId = unitIdArg ?? state.selectedUnitId;
      if (!targetUnitId) return;

      if (unitIdArg && unitIdArg !== state.selectedUnitId) {
        get().selectUnit(unitIdArg);
      }

      const freshState = get();
      const unit = freshState.units.find((u) => u.id === targetUnitId);
      if (
        !unit ||
        !isUnitFighting(unit) ||
        (unit.detainedTurns ?? 0) > 0 ||
        !unit.ability ||
        unit.ability.currentCooldown > 0 ||
        unit.ap < unit.ability.apCost
      ) {
        return;
      }

      const ability = unit.ability;
      const nextAp = Math.max(0, unit.ap - ability.apCost);

      if (ability.id === "protector_oath") {
        playSpecialAbilitySound("protector_oath");
        let rescuedMarshal = false;
        let colloredoKeptMortalWound = false;
        const colloredo = freshState.units.find(
          (u) => u.id === "player-colloredo" && u.alive,
        );

        let newJanPos = unit.pos;
        if (colloredo && gridDistance3D(unit.pos, colloredo.pos) > 1) {
          const offsets = [
            { x: -1, z: 0 },
            { x: 1, z: 0 },
            { x: 0, z: -1 },
            { x: 0, z: 1 },
            { x: -1, z: -1 },
            { x: 1, z: -1 },
            { x: -1, z: 1 },
            { x: 1, z: 1 },
          ];
          for (const off of offsets) {
            const candidate: GridCoord = {
              x: colloredo.pos.x + off.x,
              y: colloredo.pos.y,
              z: colloredo.pos.z + off.z,
            };
            const tile = freshState.grid.getTile(candidate);
            const occupied = freshState.units.some(
              (u) => u.alive && u.id !== unit.id && sameCoord(u.pos, candidate),
            );
            if (tile && tile.walkable && !occupied) {
              newJanPos = candidate;
              break;
            }
          }
        }

        if (colloredo) {
          freshState.grid.addSmoke(colloredo.pos, 1, 3);
        }

        const updatedUnits = freshState.units.map((u) => {
          if (u.id === unit.id) {
            return {
              ...u,
              pos: newJanPos,
              ap: Math.min(u.maxAp + 1, nextAp + 1),
              isShaken: false,
              abilityBuffActive: true,
              ability: u.ability
                ? { ...u.ability, currentCooldown: u.ability.cooldownTurns }
                : undefined,
            };
          }
          if (u.id === "player-colloredo" && u.alive) {
            const wasDetained = (u.detainedTurns ?? 0) > 0;
            if (wasDetained) rescuedMarshal = true;
            const dying = u.hp <= 0 || !!u.inDeathThroes;
            if (dying) colloredoKeptMortalWound = true;
            const nextMaxArmor = Math.max(2, u.maxArmor + 1);
            return {
              ...u,
              hp: dying ? u.hp : Math.min(u.maxHp, u.hp + 3),
              maxArmor: nextMaxArmor,
              armor: Math.min(nextMaxArmor, u.armor + 2),
              ap: Math.min(u.maxAp + 1, Math.max(1, u.ap + 1)),
              isShaken: dying ? u.isShaken : false,
              detainedTurns: 0,
              captureReason: null,
            };
          }
          return u;
        });

        const syncedUnits = syncColloredoMobility(updatedUnits);
        const nextDerived = deriveSelectionData(
          freshState.grid,
          syncedUnits,
          unit.id,
          freshState.weather,
          freshState.selectedTargetId,
          freshState.fogSnapshot.exploredCoords,
          freshState.blastZones,
          freshState.fogOfWarEnabled,
          freshState.scenario,
        );

        set((s) => ({
          smokeVersion: s.smokeVersion + 1,
          units: nextDerived.units,
          selectedUnitId: unit.id,
          activeFloor: unit.pos.y,
          fogSnapshot: nextDerived.fogSnapshot,
          reachableTiles: nextDerived.reachableTiles,
          visibleTargets: nextDerived.visibleTargets,
          visibleMeleeTargets: nextDerived.visibleMeleeTargets,
          selectedTargetId: nextDerived.selectedTargetId,
          demonstratedAbilities: {
            ...s.demonstratedAbilities,
            [unit.id]: true,
          },
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.ability.cloak", {
                abilityId: ability.id,
                unitId: unit.id,
                keptWound: colloredoKeptMortalWound,
                rescued: rescuedMarshal,
              }),
              "buff",
            ),
          ],
        }));

        deps.triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.oath"), tone: "buff" },
        });
        deps.triggerUnitFx("player-colloredo", {
          banner: {
            phrase: rescuedMarshal
              ? phrase("banner.cloakFreed")
              : phrase("banner.cloak"),
            tone: "buff",
          },
        });
        return;
      }

      if (ability.id === "klementinum_verdict") {
        playSpecialAbilitySound("klementinum_verdict");
        const updatedUnits = freshState.units.map((u) =>
          u.id === unit.id
            ? {
                ...u,
                ap: Math.min(u.maxAp + 1, nextAp + 1),
                isShaken: false,
                abilityBuffActive: true,
                ability: u.ability
                  ? { ...u.ability, currentCooldown: u.ability.cooldownTurns }
                  : undefined,
              }
            : u,
        );

        const nextDerived = deriveSelectionData(
          freshState.grid,
          updatedUnits,
          unit.id,
          freshState.weather,
          freshState.selectedTargetId,
          freshState.fogSnapshot.exploredCoords,
          freshState.blastZones,
          freshState.fogOfWarEnabled,
          freshState.scenario,
        );
        const switchToShoot = nextDerived.visibleTargets.length > 0;

        set((s) => ({
          units: nextDerived.units,
          selectedUnitId: unit.id,
          activeFloor: unit.pos.y,
          actionMode: switchToShoot ? "shoot" : s.actionMode,
          fogSnapshot: nextDerived.fogSnapshot,
          reachableTiles: nextDerived.reachableTiles,
          visibleTargets: nextDerived.visibleTargets,
          visibleMeleeTargets: nextDerived.visibleMeleeTargets,
          selectedTargetId: nextDerived.selectedTargetId,
          demonstratedAbilities: {
            ...s.demonstratedAbilities,
            [unit.id]: true,
          },
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.ability.verdict", {
                abilityId: ability.id,
                unitId: unit.id,
              }),
              "crit",
            ),
          ],
        }));

        deps.triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.verdict"), tone: "crit" },
        });
        return;
      }

      if (ability.id === "maltese_shrapnel") {
        const epoch = getSessionEpoch();
        playSpecialAbilitySound("maltese_shrapnel");
        freshState.grid.addSmoke(unit.pos, 1, 3);

        const livingEnemies = freshState.units.filter(
          (u) => u.faction === "enemy" && u.alive,
        );
        const inRangeEnemies = livingEnemies.filter(
          (e) => gridDistance3D(unit.pos, e.pos) <= 9,
        );
        const hitEnemyList =
          inRangeEnemies.length > 0 ? inRangeEnemies : livingEnemies.slice(0, 2);
        const hitEnemyIds = new Set<string>(hitEnemyList.map((e) => e.id));

        let updatedUnits = freshState.units.map((u) => {
          if (u.id === unit.id) {
            return {
              ...u,
              ap: nextAp,
              grenades: Math.min(3, u.grenades + 1),
              isShaken: false,
              abilityBuffActive: true,
              ability: u.ability
                ? { ...u.ability, currentCooldown: u.ability.cooldownTurns }
                : undefined,
            };
          }
          if (hitEnemyIds.has(u.id)) {
            return applyDamageToUnit(u, 3, {
              armorShred: 2,
              shaken: true,
              clearOverwatch: true,
              apDelta: -1,
            });
          }
          return u;
        });

        let kegDetonated = false;
        let shrapnelKegX: number | undefined;
        let shrapnelKegZ: number | undefined;
        for (const hitEnemy of hitEnemyList) {
          const nearbyKegPos = (["N", "E", "S", "W"] as CardinalDir[]).map(
            (dir) => {
              const { dx, dz } = CARDINAL_OFFSETS[dir];
              return {
                x: hitEnemy.pos.x + dx,
                y: hitEnemy.pos.y,
                z: hitEnemy.pos.z + dz,
              };
            },
          ).find((pos) => {
            const t = freshState.grid.getTile(pos);
            return t && t.obstacle === "powder_keg";
          });

          if (nearbyKegPos) {
            deps.noteMission3Noise("blast");
            const blast = processExplosions(
              freshState.grid,
              updatedUnits,
              nearbyKegPos,
              5,
              2,
              freshState.weather,
              freshState.scenario,
            );
            updatedUnits = blast.nextUnits;
            kegDetonated = true;
            shrapnelKegX = nearbyKegPos.x;
            shrapnelKegZ = nearbyKegPos.z;
            break;
          }
        }

        const captureSync = syncColloredoCaptureState(updatedUnits);
        const syncedUnits = syncColloredoMobility(captureSync.units);
        const autoNextUnit = findNextAvailablePlayerUnit(syncedUnits, unit.id);
        const autoNextId = autoNextUnit?.id ?? unit.id;
        const nextDerived = deriveSelectionData(
          freshState.grid,
          syncedUnits,
          autoNextId,
          freshState.weather,
          freshState.selectedTargetId,
          freshState.fogSnapshot.exploredCoords,
          freshState.blastZones,
          freshState.fogOfWarEnabled,
          freshState.scenario,
        );

        const primaryTargetPos =
          hitEnemyList.length > 0 ? hitEnemyList[0]!.pos : unit.pos;
        const shrapnelProjId = nextFxId();
        const nowTs = performance.now();
        if (kegDetonated) {
          playExplosionSound();
        }
        for (const hitEnemy of hitEnemyList) {
          freshState.grid.damageTile(hitEnemy.pos, 1);
        }
        const outcomeCheck = checkMissionOutcome(
          freshState.grid,
          nextDerived.units,
          freshState.m2,
          freshState.m3,
        );

        set((s) => ({
          smokeVersion: s.smokeVersion + (kegDetonated ? 2 : 1),
          gridVersion: s.gridVersion + 1,
          combatIntensity: s.combatIntensity + (kegDetonated ? 4 : 2),
          blastZones: [
            ...s.blastZones.slice(-16),
            {
              id: nextFxId(),
              coord: unit.pos,
              createdAt: nowTs,
              baseRadius: 2.2,
              maxRadius: 5.5,
              isExplosion: true,
            },
            ...hitEnemyList.map((e) => ({
              id: nextFxId(),
              coord: e.pos,
              createdAt: nowTs,
              baseRadius: 1.8,
              maxRadius: 4.5,
              isExplosion: kegDetonated,
            })),
          ],
          units: nextDerived.units,
          selectedUnitId: autoNextId,
          activeFloor: autoNextUnit ? autoNextUnit.pos.y : unit.pos.y,
          outcome:
            outcomeCheck.outcome === "victory" ? "victory" : s.outcome,
          victoryReason:
            outcomeCheck.outcome === "victory"
              ? outcomeCheck.victoryReason
              : s.victoryReason,
          activeProjectile: {
            id: shrapnelProjId,
            from: unit.pos,
            to: primaryTargetPos,
            targetId: hitEnemyList[0]?.id,
            hitChance: 100,
            kind: "shrapnel_burst",
            createdAt: nowTs,
            durationMs: 1670,
            hit: true,
            critical: true,
            damage: 3,
            bloodSeverity: 2,
            armorShredded: 2,
            extraTargets: hitEnemyList.map((e) => e.pos),
          },
          fogSnapshot: nextDerived.fogSnapshot,
          reachableTiles: nextDerived.reachableTiles,
          visibleTargets: nextDerived.visibleTargets,
          visibleMeleeTargets: nextDerived.visibleMeleeTargets,
          selectedTargetId: nextDerived.selectedTargetId,
          demonstratedAbilities: {
            ...s.demonstratedAbilities,
            [unit.id]: true,
          },
          combatLog: appendVictoryLog(
            [
              ...s.combatLog,
              makeLog(
                s.round,
                "player",
                phrase("log.ability.shrapnel", {
                  abilityId: ability.id,
                  unitId: unit.id,
                  count: hitEnemyIds.size,
                  keg: kegDetonated,
                  kegX: shrapnelKegX,
                  kegZ: shrapnelKegZ,
                }),
                "crit",
              ),
            ],
            s.round,
            outcomeCheck,
            s.m3?.deliveries,
          ),
        }));

        if (outcomeCheck.outcome === "defeat") {
          void deps.playCaptureFinalAnimationAndDefeat(
            outcomeCheck.defeatReason ?? "zero_hp",
            freshState.round,
          );
        }

        scheduleTimer(
          () => {
            if (get().activeProjectile?.id === shrapnelProjId) {
              set({ activeProjectile: null });
            }
          },
          1670,
          epoch,
        );

        deps.triggerUnitFx(unit.id, {
          lunge: true,
          banner: { phrase: phrase("banner.shrapnel"), tone: "crit" },
        });
        for (const eid of hitEnemyIds) {
          const bEnemy = freshState.units.find((u) => u.id === eid);
          const aEnemy = nextDerived.units.find((u) => u.id === eid);
          const shrapnelLoss =
            bEnemy && aEnemy
              ? buildUnitCombatLoss(bEnemy, aEnemy, {
                  attackerId: unit.id,
                  weaponId: ability.id,
                  hit: true,
                  critical: true,
                  misfired: false,
                  hitChance: 100,
                  durationMs: 1670,
                })
              : null;
          deps.triggerUnitFx(eid, {
            hit: true,
            loss: shrapnelLoss,
            banner: { phrase: phrase("banner.shrapnelHit"), tone: "crit" },
          });
        }
        return;
      }

      if (ability.id === "marshal_command") {
        playSpecialAbilitySound("marshal_command");
        const updatedUnits = freshState.units.map((u) => {
          if (u.id === unit.id) {
            return {
              ...u,
              ap: nextAp,
              isShaken: false,
              abilityBuffActive: true,
              ability: u.ability
                ? { ...u.ability, currentCooldown: u.ability.cooldownTurns }
                : undefined,
            };
          }
          if (u.faction === "player" && u.alive && u.id !== unit.id) {
            return {
              ...u,
              ap: Math.min(u.maxAp + 2, u.ap + 2),
              isShaken: false,
            };
          }
          return u;
        });

        const syncedUnits = syncColloredoMobility(updatedUnits);
        const nextDerived = deriveSelectionData(
          freshState.grid,
          syncedUnits,
          unit.id,
          freshState.weather,
          freshState.selectedTargetId,
          freshState.fogSnapshot.exploredCoords,
          freshState.blastZones,
          freshState.fogOfWarEnabled,
          freshState.scenario,
        );

        set((s) => ({
          units: nextDerived.units,
          selectedUnitId: unit.id,
          activeFloor: unit.pos.y,
          fogSnapshot: nextDerived.fogSnapshot,
          reachableTiles: nextDerived.reachableTiles,
          visibleTargets: nextDerived.visibleTargets,
          visibleMeleeTargets: nextDerived.visibleMeleeTargets,
          selectedTargetId: nextDerived.selectedTargetId,
          demonstratedAbilities: {
            ...s.demonstratedAbilities,
            [unit.id]: true,
          },
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.ability.command", { abilityId: ability.id }),
              "buff",
            ),
          ],
        }));

        deps.triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.command"), tone: "buff" },
        });
        for (const ally of syncedUnits) {
          if (ally.faction === "player" && ally.alive && ally.id !== unit.id) {
            deps.triggerUnitFx(ally.id, {
              banner: { phrase: phrase("banner.plusTwoAp"), tone: "buff" },
            });
          }
        }
        return;
      }
    },

    executeGrenade: (targetCoord: GridCoord) => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const attacker = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !attacker ||
        !attacker.alive ||
        attacker.ap < 1 ||
        attacker.grenades <= 0 ||
        (attacker.detainedTurns ?? 0) > 0 ||
        !isUnitFighting(attacker)
      )
        return;

      const dist = gridDistance3D(attacker.pos, targetCoord);
      if (dist > 8) return;

      const epoch = getSessionEpoch();
      void (async () => {
        const newFacing = facingFromDelta(
          attacker.pos,
          targetCoord,
          attacker.facing,
        );

        const nowTs = performance.now();
        set((s) => ({
          isBusy: true,
          combatIntensity: s.combatIntensity + 3,
          blastZones: [
            ...s.blastZones.slice(-18),
            {
              id: nextFxId(),
              coord: targetCoord,
              createdAt: nowTs,
              baseRadius: 2.6,
              maxRadius: 7.2,
              isExplosion: true,
            },
          ],
          units: s.units.map((u) =>
            u.id === attacker.id
              ? {
                  ...u,
                  facing: newFacing,
                  ap: 0,
                  grenades: Math.max(0, u.grenades - 1),
                  isOverwatch: false,
                }
              : u,
          ),
          activeProjectile: {
            id: nextFxId(),
            from: attacker.pos,
            to: targetCoord,
            kind: "grenade",
            createdAt: nowTs,
            durationMs: 1370,
            hit: true,
            critical: true,
          },
        }));

        deps.triggerUnitFx(attacker.id, { lunge: true });

        await delay(560);
        if (isStaleSession(epoch)) return;
        playExplosionSound();
        get().triggerLightFlash({
          kind: "blast",
          coord: targetCoord,
          color: "#f97316",
          intensity: 14,
          radius: 12,
          durationMs: 550,
        });

        const grenadeDamage = 4;
        const grenadeShred = 2;

        const beforeGrenadeUnits = get().units;
        deps.noteMission3Noise("blast");
        const blast = processExplosions(
          get().grid,
          beforeGrenadeUnits,
          targetCoord,
          grenadeDamage,
          grenadeShred,
          get().weather,
          get().scenario,
        );
        const hitVictims = blast.victims;
        const bearerDrop = syncMission3BearerDrop(
          get().scenario,
          get().m3,
          get().grid,
          blast.nextUnits,
        );
        const captureSync = syncColloredoCaptureState(bearerDrop.units);
        const updatedUnits = syncColloredoMobility(captureSync.units);
        let pendingDefeatReason: CaptureReason | null = null;

        for (const vid of hitVictims) {
          const bUnit = beforeGrenadeUnits.find((u) => u.id === vid);
          const aUnit = updatedUnits.find((u) => u.id === vid);
          const gLoss =
            bUnit && aUnit
              ? buildUnitCombatLoss(bUnit, aUnit, {
                  attackerId: attacker.id,
                  weaponId: "grenade",
                  hit: true,
                  critical: true,
                  misfired: false,
                  hitChance: 100,
                  durationMs: 1300,
                })
              : null;
          deps.triggerUnitFx(vid, {
            hit: true,
            loss: gLoss,
            banner:
              vid === "player-colloredo" && captureSync.newlyDetained
                ? { phrase: phrase("banner.detainedHalf"), tone: "crit" }
                : {
                    phrase: phrase("banner.grenadeBlast", { damage: grenadeDamage }),
                    tone: "crit",
                  },
          });
        }

        if (captureSync.rescued) {
          deps.triggerUnitFx("player-colloredo", {
            banner: { phrase: phrase("banner.freed"), tone: "buff" },
          });
        }

        set((s) => {
          const outcomeCheck = checkMissionOutcome(s.grid, updatedUnits, s.m2, bearerDrop.m3);
          if (outcomeCheck.outcome === "defeat") {
            pendingDefeatReason = outcomeCheck.defeatReason ?? "zero_hp";
          }

          const detonatedKeg = blast.detonatedKegs[0];

          const nextTutorialStep =
            s.tutorialStep === 3 ? (4 as const) : s.tutorialStep;

          const nextGuidedStep: GuidedTutorialStep =
            s.scenario === "mission1" &&
            s.guidedTutorial.enabled &&
            !s.guidedTutorial.dismissed &&
            s.guidedTutorial.currentStep === "step_7_keg_explosion"
              ? "step_8_melee_finish"
              : s.guidedTutorial.currentStep;

          const extraLogs: CombatLogEntry[] = [];
          if (captureSync.rescued) {
            extraLogs.push(
              makeLog(s.round, "player", phrase("log.rescue.grenade"), "story"),
            );
          } else if (captureSync.newlyDetained) {
            extraLogs.push(
              makeLog(s.round, "enemy", phrase("log.detained.grenade"), "alert"),
            );
          }

          if (bearerDrop.dropped) {
            extraLogs.push(makeLog(s.round, "player", phrase("log.m3.cart.drop"), "story"));
          }

          const tutorialPatch = mirrorTutorialFields(
            { ...s.guidedTutorial, currentStep: nextGuidedStep },
            s.scenario,
            nextTutorialStep,
          );

          return {
            gridVersion: s.gridVersion + 1,
            smokeVersion: s.smokeVersion + 1,
            m3: bearerDrop.m3,
            units: updatedUnits,
            ...tutorialPatch,
            combatLog: [
              ...s.combatLog,
              makeLog(
                s.round,
                "player",
                phrase("log.grenade", {
                  attackerId: attacker.id,
                  x: targetCoord.x,
                  y: targetCoord.y,
                  z: targetCoord.z,
                  count: hitVictims.length,
                  damage: grenadeDamage,
                  shred: grenadeShred,
                  keg: blast.detonatedKegs.length > 0,
                  kegX: detonatedKeg?.x,
                  kegZ: detonatedKeg?.z,
                }),
                "crit",
              ),
              ...extraLogs,
            ],
          };
        });

        await delay(810);
        if (isStaleSession(epoch)) return;

        set((s) => {
          const outcomeCheck = checkMissionOutcome(s.grid, s.units, s.m2, s.m3);
          const autoNextUnit = findNextAvailablePlayerUnit(s.units, s.selectedUnitId);
          const autoNextId = autoNextUnit?.id ?? s.selectedUnitId;
          const nextDerived = deriveSelectionData(
            s.grid,
            s.units,
            autoNextId,
            s.weather,
            s.selectedTargetId,
            s.fogSnapshot.exploredCoords,
            s.blastZones,
            s.fogOfWarEnabled,
            s.scenario,
          );
          return {
            isBusy: outcomeCheck.outcome === "defeat",
            activeProjectile: null,
            selectedUnitId: autoNextId,
            actionMode: "move",
            activeFloor: autoNextUnit ? autoNextUnit.pos.y : s.activeFloor,
            outcome:
              outcomeCheck.outcome === "defeat"
                ? "ongoing"
                : outcomeCheck.outcome,
            victoryReason: outcomeCheck.victoryReason,
            fogSnapshot: nextDerived.fogSnapshot,
            reachableTiles: nextDerived.reachableTiles,
            visibleTargets: nextDerived.visibleTargets,
            visibleMeleeTargets: nextDerived.visibleMeleeTargets,
            selectedTargetId: nextDerived.selectedTargetId,
            combatLog: appendVictoryLog(
              s.combatLog,
              s.round,
              outcomeCheck,
              s.m3?.deliveries,
            ),
          };
        });

        if (pendingDefeatReason) {
          await deps.playCaptureFinalAnimationAndDefeat(
            pendingDefeatReason,
            get().round,
          );
        }
      })();
    },
  };
}
