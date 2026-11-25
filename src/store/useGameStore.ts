/**
 * Zustand State Store (/src/store/useGameStore.ts).
 * Propojuje čistou herní logiku (/src/core/) s React UI (Aiming HUD, Target Ribbon, Breakdown Wings)
 * a 3D scénou (@react-three/fiber).
 */

import { create } from "zustand";
import {
  phrase,
  projectUnit,
  subscribeLocale,
  type MessageParams,
  type PerkId,
  type Phrase,
} from "../i18n/runtime";
import {
  applyDamageToUnit,
  calculateShot,
  checkLineOfSight3D,
  evaluateAdjacentMeleeTargets,
  evaluateVisibleTargets,
  facingFromDelta,
  gridDistance3D,
  isAdjacentForMelee,
  isCompanionProtectedByCount,
  isInPreparedVolleyCone,
  isUnitFighting,
  resolveTargetCoverAgainstShot,
  rollRangedAttack,
} from "../core/CombatSystem";
import {
  coordKey,
  GridSystem,
  relabelCatalogs,
  sameCoord,
} from "../core/GridSystem";
import {
  checkFogLineOfSight3D,
  computeFogOfWar,
  previewReconFromTile,
} from "../core/FogOfWar";
import { computeReachableTiles, findPathAStar } from "../core/Pathfinding";
import {
  applyDisruptKeystone,
  applyDouseAction,
  applyKneel,
  applySeverRopeAction,
  applyUnpinAction,
  HAVEL_ID,
  INSCRIPTION,
  judgeMission2,
  ONDREJ_ID,
  PLACHY_ID,
  WINDLASS,
  type Mission2Loss,
} from "../core/mission2";
import {
  applyDisruptFalconet,
  armClimb,
  breakSilence,
  canOfferCordLay,
  cutTackle,
  isTorchRing,
  judgeMission3,
  layCord,
  lightCord,
  proposeCordLay,
  type CampaignState,
  type Mission3Loss,
} from "../core/mission3";
import {
  computeScrambleDestination,
  createInitialCameraDirectorState,
  detectPathInteractions,
  resetLiveMovementTelemetry,
  resolveDynamicRoofCutawayFloor,
  resolvePrimaryCoverDirection,
  shouldTriggerActionCamForMove,
  type StepInteractionKind,
} from "../core/CameraDirector";
import {
  playExplosionSound,
  playGunshotSound,
  playHitSound,
  playMisfireSound,
  playRicochetSound,
  playSpecialAbilitySound,
} from "../utils/audioSystem";
import { muzzleFlashDraft } from "../core/diegeticLights";
import type {
  ActionMode,
  CaptureReason,
  CardinalDir,
  CombatLogEntry,
  CoverLevel,
  FloorLevel,
  GridCoord,
  ReachableTile,
  RenderMode,
  UnitData,
  WeatherType,
} from "../core/types";
import {
  getGuidedStepData,
  isActionAllowedForGuidedStep,
  isTileAllowedForGuidedMove,
  getGuidedRejectFeedback,
} from "../core/GuidedTutorialSystem";
import { browserCampaignStorage, loadCampaign } from "../core/campaignStorage";
import type {
  BlastZoneEvent,
  GameStoreState,
  ImpactObstacleKind,
  ProjectileVisual,
  StoreRuntimeDeps,
  UnitCombatLoss,
  UnitVisualFX,
} from "./storeTypes";
import {
  addLightFlash,
  bindMoveResolveCallback,
  delay,
  getSessionEpoch,
  isStaleSession,
  makeLog,
  nextFxId,
  persistCampaign,
  resolveAndClearMoveCallback,
} from "./storeUtils";
import {
  advanceColloredoDetentionTurn,
  advanceReloadState,
  appendVictoryLog,
  buildUnitCombatLoss,
  checkMissionOutcome,
  deriveSelectionData,
  extractDynamicLights,
  findBestMeleeChargeTile,
  findNextAvailablePlayerUnit,
  gunfireSmokeTurns,
  mission2LossPhrase,
  mission3LossPhrase,
  mission3OutcomeLog,
  mission3Ready,
  mission3VerbPatch,
  resolveShotImpactMetadata,
  syncColloredoCaptureState,
  syncColloredoMobility,
  withSilenceRound,
} from "./combatResolution";
import {
  createIdleBriefingSnapshot,
  createScenarioLifecycleActions,
  mirrorTutorialFields,
} from "./scenarioLifecycle";
import { createCombatActions, executeKegShot } from "./combatActions";
import { createAiTurnRunner } from "./aiTurnRunner";

export type {
  ActionMode,
  ImpactObstacleKind,
  UnitCombatLoss,
  UnitVisualFX,
  ProjectileVisual,
  BlastZoneEvent,
};
export {
  checkMissionOutcome,
  buildUnitCombatLoss,
  syncColloredoCaptureState,
  advanceColloredoDetentionTurn,
  syncColloredoMobility,
  findNextAvailablePlayerUnit,
  findBestMeleeChargeTile,
  resolveShotImpactMetadata,
};

const EMPTY_PATH: GridCoord[] = [];
const EMPTY_IDS: string[] = [];

export const useGameStore = create<GameStoreState>((set, get) => {
  const { initialGrid, initialWeather, firstPlayerId, derived, tutorialMirrors } = createIdleBriefingSnapshot();

  const triggerUnitFx = (
    unitId: string,
    patch: Partial<{
      lunge: boolean;
      lungeKind: "recoil" | "melee";
      hit: boolean;
      coverSettle: boolean;
      coverSettleDir: CardinalDir | null;
      banner: {
        phrase: Phrase;
        tone: "hit" | "crit" | "miss" | "misfire" | "overwatch" | "buff";
      };
      loss: UnitCombatLoss | null;
    }>,
  ) => {
    const now = performance.now();
    set((state) => {
      const prev = state.unitFx[unitId] ?? {
        lungeTimestamp: 0,
        lungeKind: "recoil",
        hitTimestamp: 0,
        coverSettleTimestamp: 0,
        coverSettleDir: null,
        floatingBanner: null,
        combatLoss: null,
      };
      return {
        unitFx: {
          ...state.unitFx,
          [unitId]: {
            lungeTimestamp: patch.lunge ? now : prev.lungeTimestamp,
            lungeKind: patch.lunge ? (patch.lungeKind ?? "recoil") : prev.lungeKind,
            hitTimestamp: patch.hit ? now : prev.hitTimestamp,
            coverSettleTimestamp: patch.coverSettle
              ? now
              : prev.coverSettleTimestamp,
            coverSettleDir:
              patch.coverSettleDir !== undefined
                ? patch.coverSettleDir
                : prev.coverSettleDir,
            floatingBanner: patch.banner
              ? { id: nextFxId(), ...patch.banner }
              : prev.floatingBanner,
            combatLoss:
              patch.loss !== undefined ? patch.loss : prev.combatLoss,
          },
        },
      };
    });
  };

  const animateUnitAlongPath = (
    unitId: string,
    path: GridCoord[],
    opts?: {
      isActionCam?: boolean;
      interactionKind?: StepInteractionKind;
    },
  ): Promise<void> => {
    if (path.length === 0) return Promise.resolve();
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return Promise.resolve();

    const interactions = detectPathInteractions(get().grid, unit.pos, path);
    const isActionCam =
      opts?.isActionCam ??
      (get().actionCamEnabled &&
        unit.faction === "player" &&
        (path.length > unit.movePerAp ||
          interactions.hasDoorBreach ||
          interactions.hasVault ||
          interactions.hasStairs));
    const interactionKind =
      opts?.interactionKind ?? interactions.firstInteraction;

    if (typeof window === "undefined") {
      // V bezhlavém (headless) testovacím prostředí otevřeme vyražené dveře na trase okamžitě
      if (interactions.hasDoorBreach) {
        for (const dc of interactions.doorCoords) {
          if (!get().grid.isDoorSealedAt(dc)) get().grid.setDoorState(dc, "open");
        }
      }
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      bindMoveResolveCallback(resolve);
      set((s) => ({
        activeMovement: {
          unitId,
          from: { ...unit.pos },
          path,
          isActionCam,
          interactionKind,
        },
        cameraDirector: {
          ...s.cameraDirector,
          mode: isActionCam ? "ACTION_OTS_FOLLOW" : "TACTICAL_ISO",
        },
      }));
    });
  };

  /**
   * Event Interrupt 3a: Pod Reveal & Scramble.
   * Zastaví pohyb, provede rychlý přelet kamery (Pan & Zoom) na nově odhalenou skupinu mušketýrů/pikenýrů,
   * spustí jejich "Scramble" přesun o 1–2 dlaždice do nejbližšího krytu a vrátí kameru k vojákovi.
   */
  const performPodRevealAndScramble = async (
    spotterUnitId: string,
    spotterCoord: GridCoord,
    newlySpottedEnemies: UnitData[],
  ) => {
    if (newlySpottedEnemies.length === 0) return;
    const epoch = getSessionEpoch();

    // Najdeme celou skupinu (pod) v okolí odhalených nepřátel (do vzdálenosti 4 polí)
    const state = get();
    const podMembers = state.units.filter(
      (u) =>
        u.faction === "enemy" &&
        isUnitFighting(u) &&
        (newlySpottedEnemies.some((s) => s.id === u.id) ||
          newlySpottedEnemies.some(
            (s) =>
              s.pos.y === u.pos.y &&
              Math.abs(s.pos.x - u.pos.x) <= 4 &&
              Math.abs(s.pos.z - u.pos.z) <= 4 &&
              !state.revealedPodEnemyIds.has(u.id),
          )),
    );

    if (podMembers.length === 0) return;

    // Spočítáme těžiště odhalené hlídky pro Pan & Zoom kamery
    const avgX = Math.round(
      podMembers.reduce((acc, u) => acc + u.pos.x, 0) / podMembers.length,
    );
    const avgZ = Math.round(
      podMembers.reduce((acc, u) => acc + u.pos.z, 0) / podMembers.length,
    );
    const focusFloor = podMembers[0]!.pos.y;
    const focusCoord: GridCoord = { x: avgX, y: focusFloor, z: avgZ };

    const nowTs = performance.now();
    const nextRevealed = new Set(state.revealedPodEnemyIds);
    for (const m of podMembers) {
      nextRevealed.add(m.id);
    }

    set((s) => ({
      activeFloor: focusFloor,
      revealedPodEnemyIds: nextRevealed,
      cameraDirector: {
        ...s.cameraDirector,
        mode: "INTERRUPT_POD_REVEAL",
        podReveal: {
          spotterUnitId,
          spotterCoord,
          revealedEnemyIds: podMembers.map((m) => m.id),
          focusCoord,
          startedAt: nowTs,
          durationMs: 1150,
        },
      },
      combatLog: [
        ...s.combatLog,
        makeLog(
          s.round,
          "enemy",
          phrase("log.podReveal", {
            unitIds: podMembers.map((m) => m.id),
          }),
          "alert",
        ),
      ],
    }));

    // Zobrazíme bojový poplach nad odhalenými nepřáteli a vypočítáme jejich Scramble přesun do krytu
    let currentUnits = [...get().units];
    for (const member of podMembers) {
      triggerUnitFx(member.id, {
        banner: { phrase: phrase("banner.alarm"), tone: "overwatch" },
      });

      const scrambleDest = computeScrambleDestination(
        get().grid,
        member,
        currentUnits,
        spotterCoord,
      );
      const targetPos = scrambleDest ?? member.pos;
      const scrambleFacing = facingFromDelta(
        targetPos,
        spotterCoord,
        member.facing,
      );

      currentUnits = currentUnits.map((u) =>
        u.id === member.id
          ? {
              ...u,
              pos: targetPos,
              facing: scrambleFacing,
            }
          : u,
      );
    }

    // Krátká pauza na přelet kamery (Pan & Zoom), následně nepřátelé zaskočí do krytu (Scramble)
    await delay(350);
    if (isStaleSession(epoch)) return;

    set((s) => {
      const synced = syncColloredoMobility(currentUnits);
      const nextFog = computeFogOfWar(
        s.grid,
        synced,
        s.weather,
        s.fogSnapshot.exploredCoords,
        extractDynamicLights(s.blastZones),
        s.scenario,
      );
      return {
        units: synced,
        fogSnapshot: nextFog,
      };
    });

    await delay(750);
    if (isStaleSession(epoch)) return;

    set((s) => ({
      activeFloor: spotterCoord.y,
      cameraDirector: {
        ...s.cameraDirector,
        mode: "TACTICAL_ISO",
        podReveal: null,
      },
    }));
  };

  const noteMission3Noise = (reason: NonNullable<MessageParams["reason"]>) => {
    const state = get();
    if (state.scenario !== "mission3" || !state.m3?.silent) return;
    const next = breakSilence(state.m3, state.grid, Math.random, state.round);
    if (next.silent) return;
    set({
      m3: next,
      gridVersion: get().gridVersion + 1,
      combatLog: [
        ...get().combatLog,
        makeLog(state.round, "player", phrase("log.m3.silent.break", { reason }), "alert"),
        ...(next.reliefDoor
          ? [makeLog(state.round, "enemy", phrase("log.m3.relief", { dir: next.reliefDoor }), "alert")]
          : []),
      ],
    });
  };

  const playCaptureFinalAnimationAndDefeat = async (
    reason: CaptureReason,
    roundNum: number,
  ) => {
    if (get().scenario === "mission3" && get().m3) {
      const judged = judgeMission3(get().m3!, get().units);
      const loss: Mission3Loss = judged.loss ?? "plachy";
      set({
        isBusy: false,
        isCapturingAnim: false,
        outcome: judged.outcome === "ongoing" ? "defeat" : judged.outcome,
        victoryReason: judged.victoryReason,
        defeatReason: null,
        m3: { ...get().m3!, loss },
        combatLog: [
          ...get().combatLog,
          makeLog(roundNum, "enemy", phrase(mission3LossPhrase(loss)), "alert"),
        ],
      });
      return;
    }
    if (get().scenario === "mission2" && get().m2) {
      const judged = judgeMission2(get().m2!, get().units);
      const loss: Mission2Loss = judged.loss ?? "plachy";
      set({
        isBusy: false,
        isCapturingAnim: false,
        outcome: judged.outcome === "ongoing" ? "defeat" : judged.outcome,
        victoryReason: judged.victoryReason,
        defeatReason: null,
        m2: { ...get().m2!, loss },
        combatLog: [
          ...get().combatLog,
          makeLog(
            roundNum,
            "enemy",
            phrase(mission2LossPhrase(loss), { unitId: PLACHY_ID }),
            "alert",
          ),
        ],
      });
      return;
    }
    const colloredo = get().units.find((u) => u.id === "player-colloredo");

    set((s) => ({
      isBusy: true,
      isCapturingAnim: true,
      activeFloor: colloredo ? colloredo.pos.y : s.activeFloor,
      combatLog: [
        ...s.combatLog,
        makeLog(
          roundNum,
          "enemy",
          phrase("log.capture.done", { capture: reason }),
          "alert",
        ),
      ],
    }));

    const epoch = getSessionEpoch();
    triggerUnitFx("player-colloredo", {
      hit: true,
      banner: { phrase: phrase("banner.captured"), tone: "crit" },
    });

    await delay(900);
    if (isStaleSession(epoch)) return;

    set({
      isBusy: false,
      isCapturingAnim: false,
      outcome: "defeat",
      victoryReason: null,
      defeatReason: reason,
    });
  };

  const performOverwatchReactionsIfAny = async (
    movedUnitId: string,
    destCoord: GridCoord,
    movementPath?: GridCoord[],
  ) => {
    const state = get();
    const epoch = getSessionEpoch();
    const movedUnit = state.units.find((u) => u.id === movedUnitId);
    if (!movedUnit || !movedUnit.alive) return;

    // Trasa pohybu (nebo fallback na cílové pole)
    const evaluatedPath =
      movementPath && movementPath.length > 0 ? movementPath : [destCoord];

    // Najdeme hlídkující vojáky opačné frakce s nabitou zbraní
    const potentialWatchers = state.units.filter(
      (u) =>
        isUnitFighting(u) &&
        u.faction !== movedUnit.faction &&
        u.isOverwatch &&
        u.firearmLoaded !== false &&
        (u.id !== "player-colloredo" || u.pistolLoaded !== false),
    );

    if (potentialWatchers.length === 0) return;

    for (const watcher of potentialWatchers) {
      const currentMoved = get().units.find((u) => u.id === movedUnitId);
      if (!currentMoved || !isUnitFighting(currentMoved)) break;

      // Zkontrolujeme, zda střelec má stále aktivní hlídku a nabitou zbraň
      const freshWatcher = get().units.find((u) => u.id === watcher.id);
      if (
        !freshWatcher ||
        !isUnitFighting(freshWatcher) ||
        !freshWatcher.isOverwatch ||
        freshWatcher.firearmLoaded === false
      ) {
        continue;
      }

      // Švédové po hraběti nikdy nestřílí (ani v reakční palbě / Overwatch)!
      if (freshWatcher.faction === "enemy" && movedUnitId === "player-colloredo") {
        continue;
      }

      const isConeMode =
        freshWatcher.weapon.overwatchMode === "prepared_volley_cone";

      // XCOM taktika: Hlídkující hledá moment na trase, kdy nepřítel běží
      // U doutnákových mušket (Připravená salva) musí cíl vstoupit do předního kuželu (90°)
      type CandidateStep = {
        coord: GridCoord;
        cover: CoverLevel;
        isFlanked: boolean;
        dist: number;
        index: number;
      };

      const validSteps: CandidateStep[] = [];

      for (let i = 0; i < evaluatedPath.length; i++) {
        const step = evaluatedPath[i]!;
        const dist = gridDistance3D(freshWatcher.pos, step);
        if (dist > freshWatcher.weapon.maxRange) continue;

        if (
          isConeMode &&
          !isInPreparedVolleyCone(freshWatcher.pos, freshWatcher.facing, step)
        ) {
          continue;
        }

        // Kontrola ochrany hrabětem: Švédové nebudou střílet na hráčskou postavu,
        // pokud je do tří políček od hraběte a střelec vidí hraběte
        if (freshWatcher.faction === "enemy") {
          const simulatedTarget: UnitData = {
            ...currentMoved,
            pos: step,
          };
          if (
            isCompanionProtectedByCount(
              get().grid,
              freshWatcher.pos,
              simulatedTarget,
              get().units,
            )
          ) {
            continue;
          }
        }

        // Kontrola 3D přímé viditelnosti
        const los = checkLineOfSight3D(get().grid, freshWatcher.pos, step);
        if (!los.clear) continue;

        // Kontrola mlhy války (musí být viditelný v šerosvitu pozorovatele)
        const fogCheck = checkFogLineOfSight3D(
          get().grid,
          freshWatcher.pos,
          step,
          false,
        );
        if (!fogCheck) continue;

        // Kontrola krytu na daném poli vůči střelci: nepřítel NESMÍ být v krytu (žádný Full Cover)
        const coverRes = resolveTargetCoverAgainstShot(
          get().grid,
          freshWatcher.pos,
          step,
        );

        if (coverRes.cover !== "full") {
          validSteps.push({
            coord: step,
            cover: coverRes.cover,
            isFlanked: coverRes.cover === "none",
            dist,
            index: i,
          });
        }
      }

      // Pokud na žádném poli nebyl cíl nekrytý a viditelný, zkusíme fallback na cílové pole pouze pokud není za plnou zdí
      let ambushStep: CandidateStep | null = null;
      if (validSteps.length > 0) {
        // Preferujeme pole bez jakéhokoliv krytu (cover === 'none' / obchvat),
        // následně co nejblíže optimálnímu dostřelu střelce a blíže začátku pohybu (rychlý záchyt)
        validSteps.sort((a, b) => {
          if (a.isFlanked && !b.isFlanked) return -1;
          if (!a.isFlanked && b.isFlanked) return 1;
          const aDistDiff = Math.abs(a.dist - freshWatcher.weapon.optimalRange);
          const bDistDiff = Math.abs(b.dist - freshWatcher.weapon.optimalRange);
          if (aDistDiff !== bDistDiff) return aDistDiff - bDistDiff;
          return a.index - b.index;
        });
        ambushStep = validSteps[0]!;
      } else {
        const distToDest = gridDistance3D(freshWatcher.pos, destCoord);
        const losDest = checkLineOfSight3D(get().grid, freshWatcher.pos, destCoord);
        const inDestCone =
          !isConeMode ||
          isInPreparedVolleyCone(
            freshWatcher.pos,
            freshWatcher.facing,
            destCoord,
          );
        if (
          inDestCone &&
          distToDest <= freshWatcher.weapon.maxRange &&
          losDest.clear
        ) {
          const destCover = resolveTargetCoverAgainstShot(
            get().grid,
            freshWatcher.pos,
            destCoord,
          );
          if (destCover.cover !== "full") {
            ambushStep = {
              coord: destCoord,
              cover: destCover.cover,
              isFlanked: destCover.cover === "none",
              dist: distToDest,
              index: evaluatedPath.length - 1,
            };
          }
        }
      }

      if (!ambushStep) continue;

      const ambushCoord = ambushStep.coord;

      // 1. Event Interrupt 3b: Overwatch Slow-Mo (Fáze A: SHOOTER_FOCUS)
      // Zpomalíme čas (timeScale = 0.25), kamera zabere střelce v oblaku střelného prachu
      const slowMoStartTs = performance.now();
      set((s) => ({
        activeFloor: freshWatcher.pos.y,
        cameraDirector: {
          ...s.cameraDirector,
          mode: "INTERRUPT_OVERWATCH_SLOWMO",
          timeScale: 0.25,
          overwatchSlowMo: {
            watcherUnitId: freshWatcher.id,
            watcherCoord: freshWatcher.pos,
            targetUnitId: currentMoved.id,
            ambushCoord,
            subPhase: "SHOOTER_FOCUS",
            startedAt: slowMoStartTs,
            durationMs: 1750,
          },
        },
        units: s.units.map((u) =>
          u.id === freshWatcher.id
            ? {
                ...u,
                facing: facingFromDelta(u.pos, ambushCoord, u.facing),
              }
            : u,
        ),
      }));

      triggerUnitFx(freshWatcher.id, {
        banner: { phrase: phrase("banner.spotted"), tone: "overwatch" },
      });

      // 2. Záběr na střelce před výstřelem v zpomaleném čase
      await delay(650);
      if (isStaleSession(epoch)) return;

      // Znovu ověříme stav před samotným výstřelem (zda mezitím hra neskončila)
      const targetUnitNow = get().units.find((u) => u.id === movedUnitId);
      if (!targetUnitNow || !isUnitFighting(targetUnitNow)) {
        set((s) => ({
          cameraDirector: {
            ...s.cameraDirector,
            mode: "TACTICAL_ISO",
            timeScale: 1.0,
            overwatchSlowMo: null,
          },
        }));
        break;
      }

      const calculation = calculateShot(
        get().grid,
        freshWatcher,
        { ...targetUnitNow, pos: ambushCoord },
        get().weather,
        freshWatcher.pos,
      );

      noteMission3Noise("shot");
      const outcome = rollRangedAttack(
        freshWatcher,
        targetUnitNow,
        calculation,
        Math.random,
        0.85,
      );

      // Výstřel z Overwatch vytvoří oblak kouře z černého prachu na dlaždici střelce
      if (!outcome.misfired) {
        get().grid.addSmoke(
          freshWatcher.pos,
          0,
          gunfireSmokeTurns(get().grid, freshWatcher.pos, get().weather),
        );
      }

      if (outcome.misfired) {
        playMisfireSound();
      } else {
        playGunshotSound(freshWatcher.weapon.lockType === "wheellock");
      }

      const impactMeta = resolveShotImpactMetadata(
        get().grid,
        freshWatcher.pos,
        ambushCoord,
        outcome,
      );
      const nowTs = performance.now();
      set((s) => ({
        activeFloor: ambushCoord.y,
        smokeVersion: s.smokeVersion + 1,
        combatIntensity: s.combatIntensity + 1,
        cameraDirector: {
          ...s.cameraDirector,
          mode: "INTERRUPT_OVERWATCH_SLOWMO",
          timeScale: 0.35,
          overwatchSlowMo: s.cameraDirector.overwatchSlowMo
            ? {
                ...s.cameraDirector.overwatchSlowMo,
                subPhase: "RUNNER_TRACK",
              }
            : null,
        },
        blastZones: [
          ...s.blastZones.slice(-18),
          {
            id: nextFxId(),
            coord: freshWatcher.pos,
            createdAt: nowTs,
            baseRadius: 1.4,
            maxRadius: 3.8,
            isExplosion: false,
          },
          ...(outcome.misfired
            ? []
            : [
                {
                  id: nextFxId(),
                  coord: outcome.hit ? ambushCoord : impactMeta.missImpactCoord,
                  createdAt: nowTs,
                  baseRadius: 1.2,
                  maxRadius: 3.2,
                  isExplosion: false,
                },
              ]),
        ],
        units: s.units.map((u) =>
          u.id === freshWatcher.id
            ? {
                ...u,
                isOverwatch: false,
                firearmLoaded: false,
                reloadProgress: 0,
                pistolLoaded:
                  freshWatcher.id === "player-colloredo" ? false : u.pistolLoaded,
                facing: facingFromDelta(u.pos, ambushCoord, u.facing),
              }
            : u,
        ),
        activeProjectile: {
          id: nextFxId(),
          from: freshWatcher.pos,
          to: ambushCoord,
          targetId: currentMoved.id,
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
          muzzleFlashDraft(
            freshWatcher.pos,
            facingFromDelta(freshWatcher.pos, ambushCoord, freshWatcher.facing),
            outcome.misfired,
          ),
        ),
      }));

      triggerUnitFx(freshWatcher.id, {
        lunge: true,
        banner: outcome.misfired
          ? { phrase: phrase("banner.misfire"), tone: "misfire" }
          : { phrase: phrase("banner.ambush"), tone: "overwatch" },
      });

      // Čekání na plynulý dolet střely k cíli (~41 % z 1780 ms = 730 ms)
      await delay(730);
      if (isStaleSession(epoch)) return;
      if (!outcome.misfired) {
        if (outcome.hit) {
          playHitSound(outcome.critical, impactMeta.bloodSeverity);
        } else {
          playRicochetSound(impactMeta.impactObstacle === "palace_wood");
        }
      }

      let newlyDetainedByOw = false;
      const beforeTargetOw =
        get().units.find((u) => u.id === currentMoved.id) ?? currentMoved;
      let afterTargetOw: UnitData = beforeTargetOw;

      set((s) => {
        if (!outcome.misfired) {
          s.grid.damageTile(
            outcome.hit ? ambushCoord : impactMeta.missImpactCoord,
            1,
          );
        }
        const updatedUnits = s.units.map((u) => {
          if (u.id !== currentMoved.id) return u;
          return applyDamageToUnit(u, outcome.damage, {
            armorShred: outcome.armorShredded,
            shaken:
              u.isShaken || (outcome.hit && (outcome.critical || outcome.damage >= 4)),
          });
        });

        const captureSync = syncColloredoCaptureState(updatedUnits);
        newlyDetainedByOw = captureSync.newlyDetained;
        const syncedUnits = syncColloredoMobility(captureSync.units);
        afterTargetOw =
          syncedUnits.find((u) => u.id === currentMoved.id) ?? beforeTargetOw;

        const extraLogs: CombatLogEntry[] = [];
        if (captureSync.newlyDetained) {
          extraLogs.push(
            makeLog(
              s.round,
              "enemy",
              phrase("log.detained.overwatch"),
              "alert",
            ),
          );
        }

        return {
          gridVersion: s.gridVersion + (outcome.misfired ? 0 : 1),
          units: syncedUnits,
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              freshWatcher.faction,
              phrase("log.overwatch.shot", {
                attackerId: freshWatcher.id,
                targetId: currentMoved.id,
                damage: outcome.damage,
                shred: outcome.armorShredded,
                critical: outcome.critical,
                chance: outcome.hitChance,
                misfired: outcome.misfired,
                hit: outcome.hit,
              }),
              outcome.misfired
                ? "misfire"
                : outcome.hit
                  ? "overwatch"
                  : "miss",
            ),
            ...extraLogs,
          ],
        };
      });

      if (!outcome.misfired) {
        const owLoss = buildUnitCombatLoss(beforeTargetOw, afterTargetOw, {
          attackerId: freshWatcher.id,
          weaponId: freshWatcher.weapon.id,
          hit: outcome.hit,
          critical: outcome.critical,
          misfired: outcome.misfired,
          hitChance: outcome.hitChance,
          armorAbsorbed: outcome.armorAbsorbed,
          durationMs: 1550,
        });
        triggerUnitFx(currentMoved.id, {
          hit: outcome.hit,
          loss: owLoss,
          banner: newlyDetainedByOw
            ? { phrase: phrase("banner.detainedHalf"), tone: "crit" }
            : outcome.hit
              ? {
                  phrase: outcome.critical
                    ? phrase("banner.critShort", { damage: outcome.damage })
                    : phrase("banner.damage", { damage: outcome.damage }),
                  tone: outcome.critical ? "crit" : "hit",
                }
              : { phrase: phrase("banner.miss"), tone: "miss" },
        });
      }

      await delay(1050);
      if (isStaleSession(epoch)) return;
      set((s) => ({
        activeProjectile: null,
        cameraDirector: {
          ...s.cameraDirector,
          mode: "TACTICAL_ISO",
          timeScale: 1.0,
          overwatchSlowMo: null,
        },
      }));
    }
  };

  const runtimeDeps: StoreRuntimeDeps = {
    triggerUnitFx,
    animateUnitAlongPath,
    performPodRevealAndScramble,
    performOverwatchReactionsIfAny,
    playCaptureFinalAnimationAndDefeat,
    noteMission3Noise,
  };

  return {
    grid: initialGrid,
    units: derived.units,
    round: 1,
    turn: "player",
    reinforcementsSpawned: false,
    reinforcementRound: 5,
    weather: initialWeather,
    gridVersion: 1,
    smokeVersion: 1,
    combatIntensity: 0,
    blastZones: [],
    outcome: "ongoing",
    victoryReason: null,
    defeatReason: null,
    scenario: "mission1",
    briefingOpen: true,
    m2: null,
    m3: null,
    campaign: loadCampaign(browserCampaignStorage()),
    oath: null,
    isCapturingAnim: false,

    selectedUnitId: firstPlayerId,
    activeFloor: 1,
    renderMode: "2D_SPRITE",
    preferredRenderMode: "2D_SPRITE",
    cameraStep: 0,
    isFullscreen: false,
    actionCamEnabled: true,

    actionMode: "move",
    breakdownOpen: false,
    inspectOpen: false,
    inspectKeyHeld: false,
    inspectClickConsumed: false,
    inspectPin: null,
    fogOfWarEnabled: true,
    preferredFogOfWar: true,
    fogSnapshot: derived.fogSnapshot,
    reachableTiles: derived.reachableTiles,
    hoveredTile: null,
    hoveredPath: [],
    hoveredSpottedEnemyIds: [],
    visibleTargets: derived.visibleTargets,
    visibleMeleeTargets: derived.visibleMeleeTargets,
    selectedTargetId: derived.selectedTargetId,

    isBusy: false,
    cameraDirector: createInitialCameraDirectorState(),
    revealedPodEnemyIds: new Set(derived.fogSnapshot.visibleEnemyIds),
    activeMovement: null,
    activeProjectile: null,
    lightFlashes: [],
    triggerLightFlash: (flash) => {
      set((s) => ({
        lightFlashes: addLightFlash(s.lightFlashes, flash),
      }));
    },
    unitFx: {},
    combatLog: [
      makeLog(1, "player", phrase("log.briefing.gate"), "alert"),
      makeLog(1, "player", phrase("log.briefing.escape"), "story"),
    ],

    ...tutorialMirrors,
    ...createScenarioLifecycleActions(set, get),

    sacrificeDilemmaOpen: false,
    sacrificedHeroId: null,
    ironVigilPerk: null,
    demonstratedAbilities: {},

    chooseSacrifice: (heroId: string) => {
      const perkId: PerkId =
        heroId === "player-bartolomej"
          ? "maltese_pyrotechnician"
          : heroId === "player-vaclav-michalovic"
            ? "clementine_zeal"
            : "steel_loyalty";

      set((s) => ({
        sacrificeDilemmaOpen: false,
        sacrificedHeroId: heroId,
        ironVigilPerk: { perkId, heroId },
        campaign: persistCampaign({ ...s.campaign, mission1SurvivorId: heroId }),
        outcome: "victory",
        victoryReason: "boat_escape",
        defeatReason: null,
        combatLog: [
          ...s.combatLog,
          makeLog(
            s.round,
            "player",
            phrase("log.sacrifice.volunteer", { heroId }),
            "story",
          ),
          makeLog(
            s.round,
            "player",
            phrase("log.sacrifice.paradox", { heroId }),
            "alert",
          ),
        ],
      }));
    },

    toggleActionCam: () => {
      set((s) => ({ actionCamEnabled: !s.actionCamEnabled }));
    },
    setActionCamEnabled: (enabled: boolean) => {
      set({ actionCamEnabled: enabled });
    },

    selectUnit: (unitId: string) => {
      const state = get();
      if (state.isBusy || state.turn !== "player") return;
      const unit = state.units.find((u) => u.id === unitId);
      if (!unit || !unit.alive || unit.faction !== "player") return;

      if (state.scenario === "mission1" && state.guidedTutorial.enabled && !state.guidedTutorial.dismissed) {
        const stepData = getGuidedStepData(state.guidedTutorial.currentStep);
        if (stepData.allowedUnitId && unitId !== stepData.allowedUnitId) {
          set({
            guidedTutorial: {
              ...state.guidedTutorial,
              rejectFeedback: getGuidedRejectFeedback(stepData.step, "unit"),
              rejectTimestamp: performance.now(),
            },
          });
          return;
        }
      }

      const sel = deriveSelectionData(
        state.grid,
        state.units,
        unitId,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      set({
        selectedUnitId: unitId,
        activeFloor: unit.pos.y,
        actionMode: "move",
        fogSnapshot: sel.fogSnapshot,
        reachableTiles: sel.reachableTiles,
        visibleTargets: sel.visibleTargets,
        visibleMeleeTargets: sel.visibleMeleeTargets,
        selectedTargetId: sel.selectedTargetId,
        hoveredPath: [],
      });
    },

    setActiveFloor: (floor: FloorLevel) => {
      set({ activeFloor: floor, hoveredTile: null, hoveredPath: [] });
    },

    toggleFloor: () => {
      set((s) => {
        const maxFloors = s.scenario === "mission3" ? 2 : 3;
        return {
          activeFloor: ((s.activeFloor + 1) % maxFloors) as FloorLevel,
          hoveredTile: null,
          hoveredPath: [],
        };
      });
    },

    toggleFullscreen: () => {
      if (typeof document === "undefined") return;
      if (!document.fullscreenElement) {
        document.documentElement
          .requestFullscreen()
          .then(() => {
            set({ isFullscreen: true });
          })
          .catch(() => {
            set((s) => ({ isFullscreen: !s.isFullscreen }));
          });
      } else {
        document
          .exitFullscreen()
          .then(() => {
            set({ isFullscreen: false });
          })
          .catch(() => {
            set({ isFullscreen: false });
          });
      }
    },

    setFullscreenState: (fs: boolean) => {
      set({ isFullscreen: fs });
    },

    setRenderMode: (mode: RenderMode) => {
      set({ renderMode: mode, preferredRenderMode: mode });
    },

    toggleRenderMode: () => {
      set((s) => {
        const next: RenderMode = s.renderMode === "2D_SPRITE" ? "3D_MODEL" : "2D_SPRITE";
        return { renderMode: next, preferredRenderMode: next };
      });
    },

    setWeather: (weather: WeatherType) => {
      const state = get();
      const sel = deriveSelectionData(
        state.grid,
        state.units,
        state.selectedUnitId,
        weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      set({
        weather,
        fogSnapshot: sel.fogSnapshot,
        reachableTiles: sel.reachableTiles,
        visibleTargets: sel.visibleTargets,
        visibleMeleeTargets: sel.visibleMeleeTargets,
        selectedTargetId: sel.selectedTargetId,
      });
    },

    cycleWeather: () => {
      const order: WeatherType[] = ["clear", "fog", "rain"];
      const current = get().weather;
      const next = order[(order.indexOf(current) + 1) % order.length]!;
      get().setWeather(next);
    },

    toggleFogOfWar: () => {
      const state = get();
      get().setFogOfWarEnabled(!state.fogOfWarEnabled);
    },

    setFogOfWarEnabled: (enabled: boolean) => {
      const state = get();
      const sel = deriveSelectionData(
        state.grid,
        state.units,
        state.selectedUnitId,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        enabled,
        state.scenario,
      );
      set({
        fogOfWarEnabled: enabled,
        preferredFogOfWar: enabled,
        fogSnapshot: sel.fogSnapshot,
        visibleTargets: sel.visibleTargets,
        visibleMeleeTargets: sel.visibleMeleeTargets,
        selectedTargetId: sel.selectedTargetId,
      });
    },

    rotateCamera: (dir: 1 | -1) => {
      set((s) => ({ cameraStep: s.cameraStep + dir }));
    },

    setActionMode: (mode: ActionMode) => {
      const state = get();
      if (state.turn !== "player") return;

      if (state.scenario === "mission1" && state.guidedTutorial.enabled && !state.guidedTutorial.dismissed) {
        const step = state.guidedTutorial.currentStep;
        if (mode !== "move" && !isActionAllowedForGuidedStep(step, mode)) {
          set({
            guidedTutorial: {
              ...state.guidedTutorial,
              rejectFeedback: getGuidedRejectFeedback(step, "action"),
              rejectTimestamp: performance.now(),
            },
          });
          return;
        }
        if (step === "step_3_vaclav_aim" && mode === "shoot") {
          get().setGuidedTutorialStep("step_4_vaclav_shoot");
        }
      }

      // Návrat do režimu pohybu (Zpět k pohybu / Esc / 1) - musí VŽDY fungovat bez ohledu na AP střelce či stav zadržení
      if (mode === "move") {
        if (state.activeMovement) return;

        let unit = state.units.find((u) => u.id === state.selectedUnitId);
        if (!unit || !unit.alive) {
          const firstAlive = state.units.find(
            (u) => u.faction === "player" && u.alive,
          );
          if (firstAlive) {
            get().selectUnit(firstAlive.id);
            return;
          }
          set({
            isBusy: false,
            actionMode: "move",
            hoveredPath: [],
            hoveredTile: null,
            reachableTiles: new Map(),
            visibleTargets: [],
            selectedTargetId: null,
          });
          return;
        }

        const sel = deriveSelectionData(
          state.grid,
          state.units,
          unit.id,
          state.weather,
          null,
          state.fogSnapshot.exploredCoords,
          state.blastZones,
          state.fogOfWarEnabled,
          state.scenario,
        );

        set({
          isBusy: false,
          actionMode: "move",
          selectedUnitId: unit.id,
          activeFloor: unit.pos.y,
          reachableTiles: sel.reachableTiles,
          visibleTargets: sel.visibleTargets,
          visibleMeleeTargets: sel.visibleMeleeTargets,
          selectedTargetId: sel.selectedTargetId,
          fogSnapshot: sel.fogSnapshot,
          hoveredPath: [],
          hoveredTile: null,
        });
        return;
      }

      if (state.isBusy) return;

      let unit = state.units.find((u) => u.id === state.selectedUnitId);

      if (mode === "lay") {
        if (
          state.scenario !== "mission3" ||
          !state.m3 ||
          !unit ||
          !unit.alive ||
          !canOfferCordLay(state.m3, unit, state.grid, state.units)
        ) {
          return;
        }
        set({
          actionMode: "lay",
          activeFloor: unit.pos.y,
          hoveredPath: [],
        });
        return;
      }

      if (mode === "shoot") {
        // Pokud aktuálně vybraná jednotka nemůže střílet nebo nemá cíl v zorném poli,
        // zkusíme najít jiného živého člena družiny s AP > 0, který má platný cíl!
        const canCurrentAct =
          !!unit &&
          isUnitFighting(unit) &&
          unit.ap > 0 &&
          (unit.detainedTurns ?? 0) === 0;

        const visibleFilter = state.fogOfWarEnabled
          ? state.fogSnapshot.visibleEnemyIds
          : undefined;

        let targets = canCurrentAct && unit
          ? evaluateVisibleTargets(
              state.grid,
              unit,
              state.units,
              state.weather,
              visibleFilter,
            )
          : [];

        if (!canCurrentAct || targets.length === 0) {
          const readyShooter = state.units.find((u) => {
            if (
              u.faction !== "player" ||
              !isUnitFighting(u) ||
              u.ap <= 0 ||
              (u.detainedTurns ?? 0) > 0
            ) {
              return false;
            }
            const t = evaluateVisibleTargets(
              state.grid,
              u,
              state.units,
              state.weather,
              visibleFilter,
            );
            return t.length > 0;
          });

          if (readyShooter) {
            unit = readyShooter;
            targets = evaluateVisibleTargets(
              state.grid,
              readyShooter,
              state.units,
              state.weather,
              visibleFilter,
            );
          }
        }

        if (!unit || !unit.alive) return;

        const reachable =
          unit.ap > 0 && (unit.detainedTurns ?? 0) === 0 && isUnitFighting(unit)
            ? computeReachableTiles(state.grid, unit, state.units)
            : new Map<string, ReachableTile>();

        const keepId =
          state.selectedTargetId &&
          targets.some((t) => t.targetId === state.selectedTargetId)
            ? state.selectedTargetId
            : (targets[0]?.targetId ?? null);
        const targetUnit = state.units.find((u) => u.id === keepId);

        set({
          selectedUnitId: unit.id,
          actionMode: "shoot",
          reachableTiles: reachable,
          visibleTargets: targets,
          selectedTargetId: keepId,
          activeFloor: targetUnit ? targetUnit.pos.y : unit.pos.y,
          hoveredPath: [],
        });
        return;
      }

      if (mode === "grenade") {
        if (
          !unit ||
          !unit.alive ||
          unit.ap <= 0 ||
          (unit.detainedTurns ?? 0) > 0 ||
          !isUnitFighting(unit) ||
          (unit.grenades ?? 0) <= 0
        )
          return;

        set({
          actionMode: "grenade",
          activeFloor: unit.pos.y,
          hoveredPath: [],
        });
        return;
      }

      if (mode === "melee") {
        if (
          !unit ||
          !unit.alive ||
          unit.ap <= 0 ||
          (unit.detainedTurns ?? 0) > 0 ||
          !isUnitFighting(unit)
        )
          return;

        const visibleFilter = state.fogOfWarEnabled
          ? state.fogSnapshot.visibleEnemyIds
          : undefined;

        let meleeTargets = evaluateAdjacentMeleeTargets(
          state.grid,
          unit,
          state.units,
          visibleFilter,
        );

        if (meleeTargets.length === 0) {
          const readyMeleeUser = state.units.find((u) => {
            if (
              u.faction !== "player" ||
              !isUnitFighting(u) ||
              u.ap <= 0 ||
              (u.detainedTurns ?? 0) > 0
            ) {
              return false;
            }
            return (
              evaluateAdjacentMeleeTargets(
                state.grid,
                u,
                state.units,
                visibleFilter,
              ).length > 0
            );
          });
          if (readyMeleeUser) {
            unit = readyMeleeUser;
            meleeTargets = evaluateAdjacentMeleeTargets(
              state.grid,
              readyMeleeUser,
              state.units,
              visibleFilter,
            );
          }
        }

        const keepId =
          state.selectedTargetId &&
          meleeTargets.some((t) => t.targetId === state.selectedTargetId)
            ? state.selectedTargetId
            : (meleeTargets[0]?.targetId ?? null);
        const targetUnit = state.units.find((u) => u.id === keepId);

        set({
          selectedUnitId: unit.id,
          actionMode: "melee",
          visibleMeleeTargets: meleeTargets,
          selectedTargetId: keepId,
          activeFloor: targetUnit ? targetUnit.pos.y : unit.pos.y,
          hoveredPath: [],
        });
        return;
      }
    },

    toggleBreakdown: () => {
      set((s) => ({ breakdownOpen: !s.breakdownOpen }));
    },

    beginInspectHold: () => {
      if (get().inspectKeyHeld) return;
      set({ inspectKeyHeld: true, inspectClickConsumed: false });
    },

    endInspectHold: () => {
      const state = get();
      if (!state.inspectKeyHeld) return;
      if (state.inspectClickConsumed) {
        set({ inspectKeyHeld: false, inspectClickConsumed: false });
        return;
      }
      set({
        inspectKeyHeld: false,
        inspectClickConsumed: false,
        inspectOpen: !state.inspectOpen,
        inspectPin: null,
      });
    },

    cancelInspectHold: () => {
      set({ inspectKeyHeld: false, inspectClickConsumed: false });
    },

    closeInspect: () => {
      set({
        inspectOpen: false,
        inspectPin: null,
        inspectClickConsumed: true,
      });
    },

    selectTarget: (targetId: string) => {
      const state = get();
      const inVisible = state.visibleTargets.some((t) => t.targetId === targetId);
      const inMelee = state.visibleMeleeTargets.some((t) => t.targetId === targetId);
      if (inVisible || inMelee) {
        const target = state.units.find((u) => u.id === targetId);
        set({
          selectedTargetId: targetId,
          actionMode: inMelee && !inVisible ? "melee" : state.actionMode,
          activeFloor: target ? target.pos.y : state.activeFloor,
        });
      }
    },

    cycleTarget: (dir: 1 | -1) => {
      const state = get();
      const targetPool =
        state.actionMode === "melee"
          ? state.visibleMeleeTargets
          : state.visibleTargets;
      if (targetPool.length === 0) return;
      const currentIdx = targetPool.findIndex(
        (t) => t.targetId === state.selectedTargetId,
      );
      const nextIdx =
        currentIdx < 0
          ? 0
          : (currentIdx + dir + targetPool.length) % targetPool.length;
      const nextTargetId = targetPool[nextIdx]?.targetId;
      if (nextTargetId) {
        get().selectTarget(nextTargetId);
      }
    },

    setHoveredTile: (coord: GridCoord | null) => {
      const state = get();
      if (!coord) {
        if (
          state.hoveredTile !== null ||
          state.hoveredPath.length > 0 ||
          state.hoveredSpottedEnemyIds.length > 0
        ) {
          set({ hoveredTile: null, hoveredPath: EMPTY_PATH, hoveredSpottedEnemyIds: EMPTY_IDS });
        }
        return;
      }

      if (state.hoveredTile && sameCoord(state.hoveredTile, coord)) return;

      if (
        state.isBusy ||
        state.turn !== "player" ||
        state.actionMode !== "move" ||
        !state.selectedUnitId
      ) {
        set({ hoveredTile: coord, hoveredPath: EMPTY_PATH, hoveredSpottedEnemyIds: EMPTY_IDS });
        return;
      }

      const unit = state.units.find((u) => u.id === state.selectedUnitId);
      const reachable = state.reachableTiles.get(coordKey(coord));
      if (!unit || !reachable) {
        set({ hoveredTile: coord, hoveredPath: EMPTY_PATH, hoveredSpottedEnemyIds: EMPTY_IDS });
        return;
      }

      const path = findPathAStar(
        state.grid,
        unit.pos,
        coord,
        state.units,
        unit.id,
      );
      const recon = previewReconFromTile(
        state.grid,
        unit,
        coord,
        state.units,
        state.weather,
        state.fogSnapshot.visibleEnemyIds,
      );
      set({
        hoveredTile: coord,
        hoveredPath: path,
        hoveredSpottedEnemyIds: recon.spottedEnemyIds,
      });
    },

    previewEnemyMeleeHover: (enemyId: string | null) => {
      const state = get();
      if (!enemyId) {
        if (
          state.hoveredTile !== null ||
          state.hoveredPath.length > 0 ||
          state.hoveredSpottedEnemyIds.length > 0
        ) {
          set({ hoveredTile: null, hoveredPath: EMPTY_PATH, hoveredSpottedEnemyIds: EMPTY_IDS });
        }
        return;
      }

      if (
        state.isBusy ||
        state.turn !== "player" ||
        state.actionMode !== "move" ||
        !state.selectedUnitId
      ) {
        return;
      }

      const unit = state.units.find((u) => u.id === state.selectedUnitId);
      const enemy = state.units.find(
        (u) => u.id === enemyId && u.alive && u.faction === "enemy",
      );
      if (
        !unit ||
        !unit.alive ||
        unit.ap <= 0 ||
        (unit.detainedTurns ?? 0) > 0 ||
        !enemy
      ) {
        return;
      }

      if (
        state.fogOfWarEnabled &&
        !state.fogSnapshot.visibleEnemyIds.has(enemy.id)
      ) {
        return;
      }

      if (isAdjacentForMelee(unit.pos, enemy.pos)) {
        set({ hoveredTile: null, hoveredPath: [], hoveredSpottedEnemyIds: [] });
        return;
      }

      const chargeReach = findBestMeleeChargeTile(
        state.grid,
        unit,
        enemy,
        state.reachableTiles,
        state.hoveredTile,
      );
      if (!chargeReach) {
        return;
      }

      const path = findPathAStar(
        state.grid,
        unit.pos,
        chargeReach.coord,
        state.units,
        unit.id,
      );
      set({
        hoveredTile: chargeReach.coord,
        hoveredPath: path,
        hoveredSpottedEnemyIds: [enemy.id],
      });
    },

    handleRightClickCancel: () => {
      if (get().inspectKeyHeld) return;
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;
      if (state.actionMode !== "move") {
        get().setActionMode("move");
      }
    },

    handleUnitRightClick: (unitId: string) => {
      if (get().inspectKeyHeld) {
        set({
          inspectOpen: true,
          inspectClickConsumed: true,
          inspectPin: { kind: "unit", id: unitId },
        });
        return;
      }
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      // Pokud je otevřena střelba nebo chystán granát, pravé tlačítko akci zruší a vrátí hráče do základního pohledu
      if (state.actionMode === "shoot" || state.actionMode === "grenade") {
        get().setActionMode("move");
        return;
      }

      const clickedUnit = state.units.find((u) => u.id === unitId);
      if (!clickedUnit || !clickedUnit.alive) return;

      if (clickedUnit.faction === "player") {
        if (state.actionMode !== "move") {
          get().setActionMode("move");
        } else {
          get().selectUnit(unitId);
        }
        return;
      }

      // Pravé kliknutí na nepřítele: XCOM 2 Útok zblízka (okamžitý přesun spojený se seknutím, útok nestojí další AP navíc)
      if (
        state.fogOfWarEnabled &&
        !state.fogSnapshot.visibleEnemyIds.has(clickedUnit.id)
      ) {
        set({ activeFloor: clickedUnit.pos.y });
        triggerUnitFx(clickedUnit.id, {
          banner: { phrase: phrase("banner.hiddenFog"), tone: "miss" },
        });
        return;
      }

      const currentUnit = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !currentUnit ||
        !currentUnit.alive ||
        currentUnit.ap <= 0 ||
        (currentUnit.detainedTurns ?? 0) > 0 ||
        !isUnitFighting(currentUnit)
      ) {
        if (state.actionMode === "melee") {
          get().setActionMode("move");
        }
        return;
      }

      // 1. Pokud voják již stojí na sousedním poli u nepřítele, provede okamžitý sek zblízka
      if (isAdjacentForMelee(currentUnit.pos, clickedUnit.pos)) {
        get().executeMelee(clickedUnit.id);
        return;
      }

      // 2. Pokud byl v režimu melee a klikl pravým na vzdáleného nepřítele mimo dosah
      const chargeReach = findBestMeleeChargeTile(
        state.grid,
        currentUnit,
        clickedUnit,
        state.reachableTiles,
        state.hoveredTile,
      );

      if (!chargeReach) {
        if (state.actionMode === "melee") {
          get().setActionMode("move");
          return;
        }
        triggerUnitFx(clickedUnit.id, {
          banner: { phrase: phrase("banner.outOfCharge"), tone: "miss" },
        });
        return;
      }

      // Uložíme cíl zteče na začátek přesunu a spustíme pohyb na sousední dlaždici `chargeReach.coord`
      if (state.actionMode !== "move") {
        set({ actionMode: "move" });
      }
      set({ selectedTargetId: clickedUnit.id });
      // Spustíme přesun s navázaným bezplatným útokem zblízka po doběhu
      const path = findPathAStar(
        state.grid,
        currentUnit.pos,
        chargeReach.coord,
        state.units,
        currentUnit.id,
      );
      if (path.length === 0) return;

      triggerUnitFx(currentUnit.id, {
        banner: { phrase: phrase("banner.charge"), tone: "buff" },
      });

      // Vyvoláme pohyb na dlaždici s příznakem cíle pro okamžité seknutí po doběhu (0 AP navíc)
      set({
        hoveredTile: chargeReach.coord,
        hoveredPath: path,
        hoveredSpottedEnemyIds: [clickedUnit.id],
      });
      get().handleTileClick(chargeReach.coord);
    },

    handleTileRightClick: (coord: GridCoord) => {
      if (get().inspectKeyHeld) {
        set({
          inspectOpen: true,
          inspectClickConsumed: true,
          inspectPin: { kind: "tile", coord: { ...coord } },
        });
        return;
      }
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      // Pokud na dlaždici stojí živý nepřítel a jsme v režimu pohybu, pravé kliknutí spustí XCOM 2 Zteč zblízka
      const unitOnTile = state.units.find(
        (u) => u.alive && sameCoord(u.pos, coord),
      );
      if (unitOnTile && unitOnTile.faction === "enemy" && state.actionMode === "move") {
        get().handleUnitRightClick(unitOnTile.id);
        return;
      }

      // Zrušení akce / Zpět: Pokud je otevřeno menu střelby, granátu nebo zblízka, pravé tlačítko akci zruší
      if (state.actionMode !== "move") {
        get().setActionMode("move");
        return;
      }

      // V režimu pohybu pravé kliknutí na dlaždici provede okamžitý přesun (Move / Dash)
      get().handleTileClick(coord);
    },

    handleUnitClick: (unitId: string) => {
      if (get().inspectKeyHeld) {
        set({
          inspectOpen: true,
          inspectClickConsumed: true,
          inspectPin: { kind: "unit", id: unitId },
        });
        return;
      }
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const clickedUnit = state.units.find((u) => u.id === unitId);
      if (!clickedUnit || !clickedUnit.alive) return;

      if (clickedUnit.faction === "player") {
        if (
          state.scenario === "mission2" &&
          unitId === PLACHY_ID &&
          state.selectedUnitId === PLACHY_ID &&
          state.m2 &&
          !state.m2.knelt &&
          sameCoord(clickedUnit.pos, INSCRIPTION)
        ) {
          get().kneelAtInscription();
          return;
        }
        get().selectUnit(unitId);
        return;
      }

      // Kliknutí na nepřátelskou jednotku
      if (state.actionMode === "grenade") {
        get().executeGrenade(clickedUnit.pos);
        return;
      }

      const currentUnit = state.units.find((u) => u.id === state.selectedUnitId);
      const isAdjacent =
        !!currentUnit && isAdjacentForMelee(currentUnit.pos, clickedUnit.pos);

      // Režim úderu zblízka
      if (state.actionMode === "melee") {
        if (isAdjacent) {
          get().executeMelee(clickedUnit.id);
        } else {
          get().selectTarget(clickedUnit.id);
        }
        return;
      }

      // Pokud hrabě Colloredo již vystřelil svou jednorannou bambitku a klikne na sousedního nepřítele, udeří jej pažbou!
      if (
        currentUnit &&
        currentUnit.id === "player-colloredo" &&
        currentUnit.pistolLoaded === false &&
        isAdjacent &&
        currentUnit.ap > 0
      ) {
        get().executeMelee(clickedUnit.id);
        return;
      }

      const canCurrentShootTarget =
        !!currentUnit &&
        currentUnit.alive &&
        currentUnit.ap > 0 &&
        (currentUnit.detainedTurns ?? 0) === 0 &&
        state.visibleTargets.some((t) => t.targetId === clickedUnit.id);

      if (canCurrentShootTarget) {
        if (
          state.actionMode === "shoot" &&
          state.selectedTargetId === clickedUnit.id
        ) {
          get().executeShoot(clickedUnit.id);
        } else {
          get().selectTarget(clickedUnit.id);
        }
        return;
      }

      // Pokud je nepřítel zahalen mlhou války (není přímo odhalen), upozorníme hráče na šerosvit
      if (
        state.fogOfWarEnabled &&
        !state.fogSnapshot.visibleEnemyIds.has(clickedUnit.id)
      ) {
        set({ activeFloor: clickedUnit.pos.y });
        triggerUnitFx(clickedUnit.id, {
          banner: { phrase: phrase("banner.hiddenFog"), tone: "miss" },
        });
        return;
      }

      const visibleFilter = state.fogOfWarEnabled
        ? state.fogSnapshot.visibleEnemyIds
        : undefined;

      // Pokud vybraný voják na cíl nevidí nebo nemá AP, zkusíme najít jiného člena čety s AP > 0, který na něj vidí
      const alternateShooter = state.units.find((u) => {
        if (
          u.faction !== "player" ||
          !isUnitFighting(u) ||
          u.ap <= 0 ||
          (u.detainedTurns ?? 0) > 0
        ) {
          return false;
        }
        const t = evaluateVisibleTargets(
          state.grid,
          u,
          state.units,
          state.weather,
          visibleFilter,
        );
        return t.some((ev) => ev.targetId === clickedUnit.id);
      });

      if (alternateShooter) {
        const sel = deriveSelectionData(
          state.grid,
          state.units,
          alternateShooter.id,
          state.weather,
          clickedUnit.id,
          state.fogSnapshot.exploredCoords,
          state.blastZones,
          state.fogOfWarEnabled,
          state.scenario,
        );
        set({
          selectedUnitId: alternateShooter.id,
          actionMode: "shoot",
          fogSnapshot: sel.fogSnapshot,
          reachableTiles: sel.reachableTiles,
          visibleTargets: sel.visibleTargets,
          visibleMeleeTargets: sel.visibleMeleeTargets,
          selectedTargetId: clickedUnit.id,
          activeFloor: clickedUnit.pos.y,
          hoveredPath: [],
        });
      } else {
        // Přepneme alespoň patro na kliknutého nepřítele a zobrazíme upozornění na něm
        set({ activeFloor: clickedUnit.pos.y });
        triggerUnitFx(clickedUnit.id, {
          banner: { phrase: phrase("banner.outOfSight"), tone: "miss" },
        });
      }
    },

    handleTileClick: (coord: GridCoord) => {
      if (get().inspectKeyHeld) {
        set({
          inspectOpen: true,
          inspectClickConsumed: true,
          inspectPin: { kind: "tile", coord: { ...coord } },
        });
        return;
      }
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      // Položení doutnáku: klik je dlaždice stopy, ne výběr vojáka a ne dveře.
      if (state.actionMode === "lay") {
        get().layCordAt(coord);
        return;
      }

      const unitOnTile = state.units.find(
        (u) => u.alive && sameCoord(u.pos, coord),
      );
      if (unitOnTile) {
        get().handleUnitClick(unitOnTile.id);
        return;
      }

      // Interakce s dveřmi (Free action 0 AP): pokud hráč klikne na dveře a vybraná jednotka stojí vedle nich
      const doorAtTile = state.grid.getDoor(coord);
      const selUnit = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        doorAtTile &&
        selUnit &&
        selUnit.alive &&
        (selUnit.detainedTurns ?? 0) === 0 &&
        isUnitFighting(selUnit) &&
        selUnit.pos.y === coord.y &&
        Math.abs(selUnit.pos.x - coord.x) <= 1 &&
        Math.abs(selUnit.pos.z - coord.z) <= 1
      ) {
        get().toggleDoor(coord);
        return;
      }

      if (state.actionMode === "grenade") {
        get().executeGrenade(coord);
        return;
      }

      // Přímé odpálení prachového sudu výstřelem (pokud hráč klikne na sud s prachem v režimu střelby nebo pohybu mimo dosah chůze)
      const clickedTile = state.grid.getTile(coord);
      const activeUnit = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        clickedTile?.obstacle === "powder_keg" &&
        activeUnit &&
        activeUnit.alive &&
        activeUnit.ap >= 1 &&
        (activeUnit.detainedTurns ?? 0) === 0 &&
        isUnitFighting(activeUnit) &&
        gridDistance3D(activeUnit.pos, coord) <= activeUnit.weapon.maxRange &&
        checkLineOfSight3D(state.grid, activeUnit.pos, coord).clear
      ) {
        if (
          state.scenario === "mission1" &&
          state.guidedTutorial.enabled &&
          !state.guidedTutorial.dismissed &&
          state.guidedTutorial.currentStep !== "step_7_keg_explosion" &&
          state.guidedTutorial.currentStep !== "step_9_free_combat"
        ) {
          set({
            guidedTutorial: {
              ...state.guidedTutorial,
              rejectFeedback: getGuidedRejectFeedback(
                state.guidedTutorial.currentStep,
                "action",
              ),
              rejectTimestamp: performance.now(),
            },
          });
          return;
        }
        if (activeUnit.id === "player-colloredo" && activeUnit.pistolLoaded === false) {
          triggerUnitFx(activeUnit.id, {
            banner: { phrase: phrase("banner.pistolEmpty"), tone: "misfire" },
          });
          return;
        }
        if (activeUnit.firearmLoaded === false) {
          const reqAp = activeUnit.weapon.reloadApCost ?? 2;
          const prog = activeUnit.reloadProgress ?? 0;
          triggerUnitFx(activeUnit.id, {
            banner: {
              phrase: phrase("banner.barrelEmptyProgress", {
                progress: prog,
                required: reqAp,
              }),
              tone: "misfire",
            },
          });
          return;
        }
        executeKegShot(set, get, runtimeDeps, activeUnit, coord);
        return;
      }

      if (state.actionMode === "shoot") {
        const reach = state.reachableTiles.get(coordKey(coord));
        const activeUnit = state.units.find((u) => u.id === state.selectedUnitId);
        if (
          reach &&
          activeUnit &&
          activeUnit.alive &&
          activeUnit.ap > 0 &&
          (activeUnit.detainedTurns ?? 0) === 0 &&
          isUnitFighting(activeUnit)
        ) {
          get().setActionMode("move");
        } else {
          get().setActionMode("move");
          return;
        }
      }

      const currentMode = get().actionMode;
      if (currentMode !== "move" || !state.selectedUnitId) return;

      const unit = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !unit ||
        !unit.alive ||
        unit.ap <= 0 ||
        (unit.detainedTurns ?? 0) > 0 ||
        !isUnitFighting(unit)
      )
        return;

      if (state.scenario === "mission1" && state.guidedTutorial.enabled && !state.guidedTutorial.dismissed) {
        const step = state.guidedTutorial.currentStep;
        if (!isTileAllowedForGuidedMove(step, coord)) {
          get().setGuidedTutorialReject(getGuidedRejectFeedback(step, "tile"));
          return;
        }
      }

      const reach = get().reachableTiles.get(coordKey(coord));
      if (!reach) return;

      const path = findPathAStar(
        state.grid,
        unit.pos,
        coord,
        state.units,
        unit.id,
      );
      if (path.length === 0) return;

      // Zjistíme, zda tento přesun byl spuštěn jako XCOM 2 Zteč zblízka (Run & Slash) na sousedního nepřítele
      const chainedMeleeEnemy =
        state.selectedTargetId
          ? state.units.find(
              (u) =>
                u.id === state.selectedTargetId &&
                u.faction === "enemy" &&
                isUnitFighting(u) &&
                isAdjacentForMelee(coord, u.pos) &&
                state.hoveredSpottedEnemyIds.includes(u.id),
            ) ?? null
          : null;
      const chainedMeleeTargetId = chainedMeleeEnemy?.id ?? null;

      const moveEpoch = getSessionEpoch();
      void (async () => {
        const interactions = detectPathInteractions(state.grid, unit.pos, path);
        const isActionCam = shouldTriggerActionCamForMove({
          actionCamEnabled: state.actionCamEnabled,
          unit,
          path,
          apCost: reach.apCost,
          zone: reach.zone,
          interactions,
        });

        set((s) => ({
          isBusy: true,
          hoveredPath: [],
          reachableTiles: new Map(),
          cameraDirector: {
            ...s.cameraDirector,
            mode: isActionCam ? "ACTION_OTS_FOLLOW" : "TACTICAL_ISO",
            timeScale: 1.0,
            podReveal: null,
            overwatchSlowMo: null,
            coverSettle: null,
          },
        }));

        // Krokové vyhodnocení trasy s podporou přerušení uprostřed běhu (Pod Reveal & Overwatch Slow-Mo)
        let remainingPath = [...path];
        let actualFinalStep = path[path.length - 1]!;
        let prevStepForFacing = unit.pos;
        const startFloor = unit.pos.y;

        while (remainingPath.length > 0) {
          const currentState = get();
          const currentUnit = currentState.units.find((u) => u.id === unit.id);
          if (
            !currentUnit ||
            !isUnitFighting(currentUnit) ||
            (currentUnit.detainedTurns ?? 0) > 0
          ) {
            break;
          }

          // Hledáme nejbližší dlaždici na zbývající trase, která spustí Overwatch nebo Pod Reveal
          let cutIdx = remainingPath.length - 1;
          let triggersOverwatchAtCut = false;
          let newlyRevealedAtCut: UnitData[] = [];

          const activeWatchers = currentState.units.filter(
            (u) =>
              isUnitFighting(u) &&
              u.faction !== currentUnit.faction &&
              u.isOverwatch &&
              u.firearmLoaded !== false &&
              (u.id !== "player-colloredo" || u.pistolLoaded !== false),
          );

          for (let i = 0; i < remainingPath.length; i++) {
            const step = remainingPath[i]!;

            // A) Kontrola Overwatch / Připravené salvy na dlaždici `step`
            let stepTriggersOw = false;
            for (const watcher of activeWatchers) {
              const dist = gridDistance3D(watcher.pos, step);
              if (dist > watcher.weapon.maxRange) continue;
              if (
                watcher.weapon.overwatchMode === "prepared_volley_cone" &&
                !isInPreparedVolleyCone(watcher.pos, watcher.facing, step)
              ) {
                continue;
              }
              if (!checkLineOfSight3D(currentState.grid, watcher.pos, step).clear)
                continue;
              if (
                !checkFogLineOfSight3D(
                  currentState.grid,
                  watcher.pos,
                  step,
                  false,
                )
              )
                continue;
              const cov = resolveTargetCoverAgainstShot(
                currentState.grid,
                watcher.pos,
                step,
              );
              if (cov.cover !== "full") {
                stepTriggersOw = true;
                break;
              }
            }

            // B) Kontrola Pod Reveal (odhalení dosud neaktivované skupiny nepřátel v mlze války)
            let stepRevealed: UnitData[] = [];
            if (currentState.fogOfWarEnabled) {
              const recon = previewReconFromTile(
                currentState.grid,
                currentUnit,
                step,
                currentState.units,
                currentState.weather,
                currentState.revealedPodEnemyIds,
              );
              if (recon.spottedEnemyIds.length > 0) {
                stepRevealed = currentState.units.filter(
                  (u) =>
                    u.faction === "enemy" &&
                    isUnitFighting(u) &&
                    recon.spottedEnemyIds.includes(u.id) &&
                    !currentState.revealedPodEnemyIds.has(u.id),
                );
              }
            }

            if (stepTriggersOw || stepRevealed.length > 0) {
              cutIdx = i;
              triggersOverwatchAtCut = stepTriggersOw;
              newlyRevealedAtCut = stepRevealed;
              break;
            }
          }

          const segment = remainingPath.slice(0, cutIdx + 1);
          const segEnd = segment[segment.length - 1]!;
          const segPrev =
            segment.length >= 2
              ? segment[segment.length - 2]!
              : currentUnit.pos;
          const segFacing = facingFromDelta(
            segPrev,
            segEnd,
            currentUnit.facing,
          );

          await animateUnitAlongPath(unit.id, segment, {
            isActionCam,
            interactionKind: interactions.firstInteraction,
          });
          if (isStaleSession(moveEpoch)) return;

          // Otevřeme případné dveře, kterými tento segment prošel
          let doorsOpenedInSeg = false;
          for (const stepCoord of segment) {
            if (get().grid.isDoorClosedAt(stepCoord) && !get().grid.isDoorSealedAt(stepCoord)) {
              get().grid.setDoorState(stepCoord, "open");
              doorsOpenedInSeg = true;
            }
          }

          if (unit.faction === "player" && get().scenario === "mission3") {
            let prev = currentUnit.pos;
            for (const step of segment) {
              if (isTorchRing(step) && !isTorchRing(prev)) {
                noteMission3Noise("torch");
                break;
              }
              prev = step;
            }
          }

          actualFinalStep = segEnd;
          prevStepForFacing = segPrev;

          // Aktualizujeme pozici jednotky na konci segmentu a zprůhledníme střechu, pokud vstoupila do budovy
          set((s) => {
            const nextFloor = resolveDynamicRoofCutawayFloor(
              s.grid,
              segEnd,
              s.activeFloor,
            );
            const movedUnits = s.units.map((u) =>
              u.id === unit.id ? { ...u, pos: segEnd, facing: segFacing } : u,
            );
            const segFog = computeFogOfWar(
              s.grid,
              movedUnits,
              s.weather,
              s.fogSnapshot.exploredCoords,
              extractDynamicLights(s.blastZones),
              s.scenario,
            );
            return {
              activeFloor: nextFloor,
              gridVersion: s.gridVersion + (doorsOpenedInSeg ? 1 : 0),
              units: movedUnits,
              fogSnapshot: segFog,
            };
          });

          if (triggersOverwatchAtCut) {
            await performOverwatchReactionsIfAny(unit.id, segEnd, [segEnd]);
            if (isStaleSession(moveEpoch)) return;
          }

          // Zkontrolujeme, zda voják po přepadu ze zálohy stále žije a může pokračovat
          const afterOwUnit = get().units.find((u) => u.id === unit.id);
          if (
            !afterOwUnit ||
            !isUnitFighting(afterOwUnit) ||
            (afterOwUnit.detainedTurns ?? 0) > 0
          ) {
            break;
          }

          if (newlyRevealedAtCut.length > 0) {
            await performPodRevealAndScramble(
              unit.id,
              segEnd,
              newlyRevealedAtCut,
            );
            if (isStaleSession(moveEpoch)) return;
          }

          remainingPath = remainingPath.slice(cutIdx + 1);
        }

        const finalStep = actualFinalStep;
        const newFacing = facingFromDelta(
          prevStepForFacing,
          finalStep,
          unit.facing,
        );

        let moveRescuedColloredo = false;
        let moveDetainedColloredo = false;
        let guidedHandoffUnitId: string | null = null;

        set((s) => {
          const updatedUnits = s.units.map((u) =>
            u.id === unit.id
              ? {
                  ...u,
                  pos: finalStep,
                  facing: newFacing,
                  ap: Math.max(0, u.ap - reach.apCost),
                  movedThisTurn: true,
                  isOverwatch: false,
                }
              : u,
          );
          const captureSync = syncColloredoCaptureState(updatedUnits);
          moveRescuedColloredo = captureSync.rescued;
          moveDetainedColloredo = captureSync.newlyDetained;
          const syncedUnits = syncColloredoMobility(captureSync.units);

          const climb =
            finalStep.y !== startFloor
              ? finalStep.y > startFloor
                ? ("up" as const)
                : finalStep.y === 0
                  ? ("ground" as const)
                  : ("down" as const)
              : undefined;

          // Tutoriál: Krok 1 (Pohyb & Ovládání) automaticky přejde na Krok 2,
          // jakmile hráč poprvé pohne jednotkou
          const nextTutorialStep =
            s.tutorialStep === 1
              ? (2 as const)
              : s.tutorialStep;

          let nextGuidedStep = s.guidedTutorial.currentStep;
          if (s.scenario === "mission1" && s.guidedTutorial.enabled && !s.guidedTutorial.dismissed) {
            if (s.guidedTutorial.currentStep === "step_1_matej_move") {
              nextGuidedStep = "step_2_colloredo_escort";
              guidedHandoffUnitId = "player-colloredo";
            } else if (s.guidedTutorial.currentStep === "step_2_colloredo_escort") {
              nextGuidedStep = "step_3_vaclav_aim";
              guidedHandoffUnitId = "player-vaclav-michalovic";
            }
          }

          const extraLogs: CombatLogEntry[] = [];
          if (interactions.hasDoorBreach) {
            extraLogs.push(
              makeLog(
                s.round,
                "player",
                phrase("log.door.breach", { unitId: unit.id }),
                "overwatch",
              ),
            );
          }
          if (captureSync.rescued) {
            extraLogs.push(
              makeLog(
                s.round,
                "player",
                phrase("log.rescue.move", { unitId: unit.id }),
                "story",
              ),
            );
          } else if (captureSync.newlyDetained) {
            extraLogs.push(
              makeLog(
                s.round,
                "enemy",
                phrase("log.detained.escort"),
                "alert",
              ),
            );
          }

          const tutorialPatch = mirrorTutorialFields(
            { ...s.guidedTutorial, currentStep: nextGuidedStep },
            s.scenario,
            nextTutorialStep,
          );

          return {
            units: syncedUnits,
            activeFloor: resolveDynamicRoofCutawayFloor(
              s.grid,
              finalStep,
              finalStep.y,
            ),
            ...tutorialPatch,
            combatLog: [
              ...s.combatLog,
              makeLog(
                s.round,
                "player",
                phrase("log.move", {
                  unitId: unit.id,
                  zone: reach.zone,
                  x: finalStep.x,
                  y: finalStep.y,
                  z: finalStep.z,
                  climb,
                  floor: finalStep.y,
                }),
                "info",
              ),
              ...extraLogs,
            ],
          };
        });

        if (moveRescuedColloredo) {
          triggerUnitFx("player-colloredo", {
            banner: { phrase: phrase("banner.freed"), tone: "buff" },
          });
        } else if (moveDetainedColloredo) {
          triggerUnitFx("player-colloredo", {
            hit: true,
            banner: { phrase: phrase("banner.detainedHalf"), tone: "crit" },
          });
        }

        // State 4: Cover Settle & Camera Reset (animace zakleknutí do krytu a návrat do izometrického pohledu)
        const movedSurvivor = get().units.find(
          (u) => u.id === unit.id && isUnitFighting(u),
        );
        if (movedSurvivor) {
          const coverInfo = resolvePrimaryCoverDirection(get().grid, finalStep);
          triggerUnitFx(unit.id, {
            coverSettle: true,
            coverSettleDir: coverInfo.dir,
          });
          if (get().actionCamEnabled && (isActionCam || coverInfo.level !== "none")) {
            set((s) => ({
              cameraDirector: {
                ...s.cameraDirector,
                mode: "COVER_SETTLE_RESET",
                timeScale: 1.0,
                coverSettle: {
                  unitId: unit.id,
                  coord: finalStep,
                  coverLevel: coverInfo.level,
                  coverDir: coverInfo.dir,
                  startedAt: performance.now(),
                  durationMs: 380,
                },
              },
            }));
            await delay(360);
            if (isStaleSession(moveEpoch)) return;
          }
        }

        const afterState = get();
        const outcomeCheck = checkMissionOutcome(
          afterState.grid,
          afterState.units,
          afterState.m2,
          afterState.m3,
        );
        if (outcomeCheck.outcome !== "ongoing") {
          set((s) => ({
            cameraDirector: {
              ...s.cameraDirector,
              mode: "TACTICAL_ISO",
              timeScale: 1.0,
              coverSettle: null,
            },
          }));
          // Pokud hráč dosáhl vítězství a dosud nebyla vyřešena Paradoxní oběť, otevřeme dilematické okno!
          if (
            outcomeCheck.outcome === "victory" &&
            get().scenario === "mission1" &&
            !afterState.sacrificedHeroId
          ) {
            const aliveCompanions = afterState.units.filter(
              (u) =>
                u.faction === "player" &&
                isUnitFighting(u) &&
                u.id !== "player-colloredo",
            );
            if (aliveCompanions.length > 0) {
              set({
                isBusy: false,
                sacrificeDilemmaOpen: true,
              });
              return;
            }
          }

          if (outcomeCheck.outcome === "defeat") {
            await playCaptureFinalAnimationAndDefeat(
              outcomeCheck.defeatReason ?? "zero_hp",
              afterState.round,
            );
            return;
          }

          set({
            isBusy: false,
            outcome: outcomeCheck.outcome,
            victoryReason: outcomeCheck.victoryReason,
            defeatReason: null,
            combatLog: appendVictoryLog(
              afterState.combatLog,
              afterState.round,
              outcomeCheck,
              afterState.m3?.deliveries,
            ),
          });
          return;
        }

        // XCOM 2 Zteč zblízka (Run & Slash): Pokud byl pohyb spuštěn pravým klikem na nepřítele
        // a voják doběhl živý na sousední pole k cíli, okamžitě provede útok zblízka za 0 AP navíc!
        if (chainedMeleeTargetId) {
          const latestState = get();
          const attackerAfterMove = latestState.units.find(
            (u) => u.id === unit.id && isUnitFighting(u) && (u.detainedTurns ?? 0) === 0,
          );
          const targetAfterMove = latestState.units.find(
            (u) => u.id === chainedMeleeTargetId && isUnitFighting(u),
          );
          if (
            attackerAfterMove &&
            targetAfterMove &&
            isAdjacentForMelee(attackerAfterMove.pos, targetAfterMove.pos)
          ) {
            set((s) => ({
              isBusy: false,
              selectedUnitId: attackerAfterMove.id,
              selectedTargetId: targetAfterMove.id,
              hoveredSpottedEnemyIds: [],
              cameraDirector: {
                ...s.cameraDirector,
                mode: "TACTICAL_ISO",
                timeScale: 1.0,
                podReveal: null,
                overwatchSlowMo: null,
                coverSettle: null,
              },
            }));
            get().executeMelee(targetAfterMove.id, { freeChainAp: true });
            return;
          }
        }

        const handoffUnit = guidedHandoffUnitId
          ? (afterState.units.find(
              (u) => u.id === guidedHandoffUnitId && isUnitFighting(u),
            ) ?? null)
          : null;
        const autoNextUnit = handoffUnit
          ? null
          : findNextAvailablePlayerUnit(
              afterState.units,
              afterState.selectedUnitId,
            );
        const autoNextId =
          handoffUnit?.id ?? autoNextUnit?.id ?? afterState.selectedUnitId;
        const nextDerived = deriveSelectionData(
          afterState.grid,
          afterState.units,
          autoNextId,
          afterState.weather,
          afterState.selectedTargetId,
          afterState.fogSnapshot.exploredCoords,
          afterState.blastZones,
          afterState.fogOfWarEnabled,
          afterState.scenario,
        );

        set((s) => ({
          isBusy: false,
          cameraDirector: {
            ...s.cameraDirector,
            mode: "TACTICAL_ISO",
            timeScale: 1.0,
            podReveal: null,
            overwatchSlowMo: null,
            coverSettle: null,
          },
          selectedUnitId: autoNextId,
          activeFloor: (handoffUnit ?? autoNextUnit)
            ? (handoffUnit ?? autoNextUnit)!.pos.y
            : s.activeFloor,
          units: nextDerived.units,
          fogSnapshot: nextDerived.fogSnapshot,
          reachableTiles: nextDerived.reachableTiles,
          visibleTargets: nextDerived.visibleTargets,
          visibleMeleeTargets: nextDerived.visibleMeleeTargets,
          selectedTargetId: nextDerived.selectedTargetId,
        }));
      })();
    },

    completeUnitMovement: () => {
      resetLiveMovementTelemetry();
      set({ activeMovement: null });
      resolveAndClearMoveCallback();
    },


    executeReload: () => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const unit = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !unit ||
        !isUnitFighting(unit) ||
        (unit.detainedTurns ?? 0) > 0
      )
        return;

      if (unit.id === "player-colloredo") {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(s.round, "player", phrase("log.pistol.cannotReload"), "alert"),
          ],
        }));
        triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.pistolNoReload"), tone: "misfire" },
        });
        return;
      }

      if (unit.firearmLoaded !== false) {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.weapon.alreadyLoaded", {
                unitId: unit.id,
                weaponId: unit.weapon.id,
              }),
              "info",
            ),
          ],
        }));
        triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.alreadyLoaded"), tone: "buff" },
        });
        return;
      }

      if (unit.ap < 1) {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.reload.noAp", { weaponId: unit.weapon.id }),
              "alert",
            ),
          ],
        }));
        triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.needOneAp"), tone: "misfire" },
        });
        return;
      }

      playSpecialAbilitySound("klementinum_verdict");

      const { requiredAp, nextProgress, isNowLoaded, patch } = advanceReloadState(unit, 1);

      const updatedUnits = state.units.map((u) =>
        u.id === unit.id ? { ...u, ...patch } : u,
      );

      const autoNextUnit = findNextAvailablePlayerUnit(updatedUnits, unit.id);
      const autoNextId = autoNextUnit?.id ?? unit.id;

      let nextTutorialGuided = state.guidedTutorial.currentStep;
      let nextSelId = autoNextId;
      let nextFlr = autoNextUnit ? autoNextUnit.pos.y : unit.pos.y;
      if (
        state.scenario === "mission1" &&
        state.guidedTutorial.enabled &&
        !state.guidedTutorial.dismissed &&
        state.guidedTutorial.currentStep === "step_6_vaclav_reload"
      ) {
        nextTutorialGuided = "step_7_keg_explosion";
        nextSelId = "player-bartolomej";
        nextFlr = 0;
      }

      const sel = deriveSelectionData(
        state.grid,
        updatedUnits,
        nextSelId,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );

      set((s) => ({
        units: sel.units,
        selectedUnitId: nextSelId,
        activeFloor: nextFlr,
        ...mirrorTutorialFields(
          { ...s.guidedTutorial, currentStep: nextTutorialGuided },
          s.scenario,
          nextTutorialGuided === "step_7_keg_explosion" ? 3 : s.tutorialStep,
        ),
        actionMode: "move",
        fogSnapshot: sel.fogSnapshot,
        reachableTiles: sel.reachableTiles,
        visibleTargets: sel.visibleTargets,
        visibleMeleeTargets: sel.visibleMeleeTargets,
        selectedTargetId: sel.selectedTargetId,
        combatLog: [
          ...s.combatLog,
          makeLog(
            s.round,
            "player",
            phrase("log.reload.step", {
              unitId: unit.id,
              progress: nextProgress,
              required: requiredAp,
              heavy: requiredAp >= 4,
              loaded: isNowLoaded,
            }),
            "buff",
          ),
        ],
      }));

      triggerUnitFx(unit.id, {
        banner: {
          phrase: isNowLoaded
            ? phrase("banner.reloadDone", { required: requiredAp })
            : phrase("banner.reloadStep", {
                progress: nextProgress,
                required: requiredAp,
              }),
          tone: "buff",
        },
      });
    },


    activateOverwatch: () => {
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing")
        return;

      const unit = state.units.find((u) => u.id === state.selectedUnitId);
      if (
        !unit ||
        !unit.alive ||
        unit.ap < 1 ||
        unit.isOverwatch ||
        (unit.detainedTurns ?? 0) > 0 ||
        !isUnitFighting(unit)
      )
        return;

      if (
        unit.firearmLoaded === false ||
        (unit.id === "player-colloredo" && unit.pistolLoaded === false)
      ) {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.weapon.emptyOverwatch", { unitId: unit.id }),
              "alert",
            ),
          ],
        }));
        triggerUnitFx(unit.id, {
          banner: { phrase: phrase("banner.barrelEmpty"), tone: "misfire" },
        });
        return;
      }

      const requiredOwAp = unit.weapon.fireApCost ?? 1;
      if (unit.ap < requiredOwAp) {
        set((s) => ({
          combatLog: [
            ...s.combatLog,
            makeLog(
              s.round,
              "player",
              phrase("log.overwatch.needAp", {
                weaponId: unit.weapon.id,
                required: requiredOwAp,
              }),
              "alert",
            ),
          ],
        }));
        triggerUnitFx(unit.id, {
          banner: {
            phrase: phrase("banner.needAp", { required: requiredOwAp }),
            tone: "misfire",
          },
        });
        return;
      }

      const isConeVolley =
        unit.weapon.overwatchMode === "prepared_volley_cone";

      const updatedUnits = state.units.map((u) =>
        u.id === unit.id ? { ...u, ap: 0, isOverwatch: true } : u,
      );
      const autoNextUnit = findNextAvailablePlayerUnit(updatedUnits, unit.id);
      const autoNextId = autoNextUnit?.id ?? unit.id;
      const nextDerived = deriveSelectionData(
        state.grid,
        updatedUnits,
        autoNextId,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );

      set((s) => ({
        units: updatedUnits,
        selectedUnitId: autoNextId,
        activeFloor: autoNextUnit ? autoNextUnit.pos.y : s.activeFloor,
        actionMode: "move",
        fogSnapshot: nextDerived.fogSnapshot,
        reachableTiles: nextDerived.reachableTiles,
        visibleTargets: nextDerived.visibleTargets,
        visibleMeleeTargets: nextDerived.visibleMeleeTargets,
        selectedTargetId: nextDerived.selectedTargetId,
        combatLog: [
          ...s.combatLog,
          makeLog(
            s.round,
            "player",
            isConeVolley
              ? phrase("log.overwatch.cone", {
                  unitId: unit.id,
                  facing: unit.facing,
                })
              : phrase("log.overwatch.360", { unitId: unit.id }),
            "overwatch",
          ),
        ],
      }));

      triggerUnitFx(unit.id, {
        banner: {
          phrase: isConeVolley
            ? phrase("banner.overwatchCone")
            : phrase("banner.overwatch360"),
          tone: "overwatch",
        },
      });
    },


    toggleDoor: (coord: GridCoord) => {
      if (get().inspectKeyHeld) {
        set({
          inspectOpen: true,
          inspectClickConsumed: true,
          inspectPin: { kind: "tile", coord: { ...coord } },
        });
        return;
      }
      const state = get();
      if (state.isBusy || state.turn !== "player" || state.outcome !== "ongoing") {
        return;
      }
      const door = state.grid.getDoor(coord);
      if (!door) return;

      const actor = state.units.find((u) => u.id === state.selectedUnitId);
      const isAdjacent =
        actor &&
        actor.alive &&
        actor.pos.y === coord.y &&
        Math.abs(actor.pos.x - coord.x) <= 1 &&
        Math.abs(actor.pos.z - coord.z) <= 1;

      if (!isAdjacent) return;

      const nextState = state.grid.toggleDoor(coord);
      if (!nextState) return;

      const sel = deriveSelectionData(
        state.grid,
        state.units,
        state.selectedUnitId,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );

      set((s) => ({
        gridVersion: s.gridVersion + 1,
        fogSnapshot: sel.fogSnapshot,
        reachableTiles: sel.reachableTiles,
        visibleTargets: sel.visibleTargets,
        visibleMeleeTargets: sel.visibleMeleeTargets,
        selectedTargetId: sel.selectedTargetId,
        combatLog: [
          ...s.combatLog,
          makeLog(
            s.round,
            "player",
            phrase("log.door.toggle", {
              unitId: actor?.id,
              open: nextState === "open",
              doorId: door.id,
              x: coord.x,
              z: coord.z,
              y: coord.y,
            }),
            "info",
          ),
        ],
      }));
    },

    ...createCombatActions(set, get, runtimeDeps),
    ...createAiTurnRunner(set, get, runtimeDeps),

    layCordAt: (coord: GridCoord) => {
      const state = get();
      if (!mission3Ready(state) || state.actionMode !== "lay") return;
      const layer = state.units.find((unit) => unit.id === state.selectedUnitId);
      if (!layer || layer.faction !== "player" || (layer.detainedTurns ?? 0) > 0) return;
      const tiles = proposeCordLay(state.m3, layer, coord, state.grid, state.units);
      if (!tiles) return;
      const laid = layCord(state.m3, layer, tiles, state.grid, state.units);
      if (!laid) return;
      const units = state.units.map((unit) =>
        unit.id === layer.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      set(
        mission3VerbPatch(
          state,
          laid,
          units,
          layer.id,
          [makeLog(state.round, "player", phrase("log.m3.cord.lay"), "story")],
          false,
        ),
      );
    },

    lightMission3Cord: () => {
      const state = get();
      if (!mission3Ready(state)) return;
      const plachy = state.units.find((unit) => unit.id === state.selectedUnitId);
      if (!plachy || (plachy.detainedTurns ?? 0) > 0) return;
      const lit = lightCord(state.m3, plachy, state.grid);
      if (!lit) return;
      const nextClock = withSilenceRound(state.m3, lit, state.round);
      const units = state.units.map((unit) =>
        unit.id === plachy.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const logs: CombatLogEntry[] = [
        makeLog(
          state.round,
          "player",
          phrase(state.m3.sparkIndex > 0 ? "log.m3.spark.relight" : "log.m3.spark.light"),
          "story",
        ),
      ];
      if (state.m3.silent && !nextClock.silent) {
        logs.push(
          makeLog(state.round, "player", phrase("log.m3.silent.break", { reason: "cord" }), "alert"),
        );
        if (nextClock.reliefDoor) {
          logs.push(
            makeLog(state.round, "enemy", phrase("log.m3.relief", { dir: nextClock.reliefDoor }), "alert"),
          );
        }
      }
      set(mission3VerbPatch(state, nextClock, units, plachy.id, logs, true));
    },

    cutMission3Tackle: () => {
      const state = get();
      if (!mission3Ready(state)) return;
      const ondrej = state.units.find((unit) => unit.id === state.selectedUnitId);
      if (!ondrej || (ondrej.detainedTurns ?? 0) > 0) return;
      const cut = cutTackle(state.m3, state.grid, ondrej, state.units);
      if (!cut) return;
      const nextClock = withSilenceRound(state.m3, cut.clock, state.round);
      const units = cut.units.map((unit) =>
        unit.id === ondrej.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const logs: CombatLogEntry[] = [
        makeLog(state.round, "player", phrase("log.m3.tackle"), "story"),
        makeLog(state.round, "player", phrase("log.m3.cart.drop"), "story"),
      ];
      if (state.m3.silent && !nextClock.silent) {
        logs.push(
          makeLog(
            state.round,
            "player",
            phrase("log.m3.silent.break", { reason: "tackle" }),
            "alert",
          ),
        );
        if (nextClock.reliefDoor) {
          logs.push(
            makeLog(
              state.round,
              "enemy",
              phrase("log.m3.relief", { dir: nextClock.reliefDoor }),
              "alert",
            ),
          );
        }
      }
      set(mission3VerbPatch(state, nextClock, units, ondrej.id, logs, true));
    },

    armMission3Climb: () => {
      const state = get();
      if (!mission3Ready(state)) return;
      const climber = state.units.find((unit) => unit.id === state.selectedUnitId);
      if (!climber || (climber.detainedTurns ?? 0) > 0) return;
      const armed = armClimb(state.m3, climber);
      if (!armed) return;
      const units = state.units.map((unit) =>
        unit.id === climber.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      set(mission3VerbPatch(state, armed, units, climber.id, [], false));
    },

    disruptMission3Falconet: () => {
      const state = get();
      if (!mission3Ready(state)) return;
      const actor = state.units.find((unit) => unit.id === state.selectedUnitId);
      if (!actor || (actor.detainedTurns ?? 0) > 0) return;
      const disrupted = applyDisruptFalconet(state.m3, state.grid, actor, state.units);
      if (!disrupted) return;
      const units = disrupted.units.map((unit) =>
        unit.id === actor.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const logs: CombatLogEntry[] = [
        makeLog(
          state.round,
          "player",
          phrase("log.m3.falconet.disrupt", { unitId: actor.id }),
          "story",
        ),
      ];
      set(mission3VerbPatch(state, disrupted.clock, units, actor.id, logs, false));
    },

    kneelAtInscription: () => {
      const state = get();
      if (
        state.scenario !== "mission2" ||
        !state.m2 ||
        state.isBusy ||
        state.turn !== "player" ||
        state.outcome !== "ongoing"
      ) {
        return;
      }
      const plachy = state.units.find((unit) => unit.id === PLACHY_ID);
      if (!plachy) return;
      const nextClock = applyKneel(state.m2, plachy);
      if (!nextClock) return;
      const units = state.units.map((unit) =>
        unit.id === PLACHY_ID ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const derived = deriveSelectionData(
        state.grid,
        units,
        PLACHY_ID,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      set({
        m2: nextClock,
        units: derived.units,
        reachableTiles: derived.reachableTiles,
        visibleTargets: derived.visibleTargets,
        visibleMeleeTargets: derived.visibleMeleeTargets,
        selectedTargetId: derived.selectedTargetId,
        fogSnapshot: derived.fogSnapshot,
        combatLog: [
          ...state.combatLog,
          makeLog(state.round, "player", phrase("log.m2.kneel"), "story"),
        ],
      });
    },

    unpinWindlassPawl: () => {
      const state = get();
      if (
        state.scenario !== "mission2" ||
        !state.m2 ||
        state.m2.windlassArmed ||
        state.isBusy ||
        state.turn !== "player" ||
        state.outcome !== "ongoing"
      ) {
        return;
      }
      const selected = state.units.find((u) => u.id === state.selectedUnitId);
      if (!selected) return;
      const nextClock = applyUnpinAction(state.m2, selected);
      if (!nextClock) return;
      const units = state.units.map((unit) =>
        unit.id === selected.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const derived = deriveSelectionData(
        state.grid,
        units,
        selected.id,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      set({
        m2: nextClock,
        units: derived.units,
        reachableTiles: derived.reachableTiles,
        visibleTargets: derived.visibleTargets,
        visibleMeleeTargets: derived.visibleMeleeTargets,
        selectedTargetId: derived.selectedTargetId,
        fogSnapshot: derived.fogSnapshot,
        combatLog: [
          ...state.combatLog,
          makeLog(state.round, "player", phrase("log.m2.unpin"), "story"),
        ],
      });
    },

    severPortcullisRope: () => {
      const state = get();
      if (
        state.scenario !== "mission2" ||
        !state.m2 ||
        state.isBusy ||
        state.turn !== "player" ||
        state.outcome !== "ongoing"
      ) {
        return;
      }
      const selected = state.units.find((u) => u.id === state.selectedUnitId);
      if (!selected) return;
      const nextClock = applySeverRopeAction(state.m2, selected);
      if (!nextClock) return;
      const judged = judgeMission2(nextClock, state.units);
      const units = state.units.map((unit) =>
        unit.id === selected.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const derived = deriveSelectionData(
        state.grid,
        units,
        selected.id,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      playExplosionSound();
      set({
        m2: { ...nextClock, loss: judged.loss },
        outcome: judged.outcome,
        victoryReason: judged.victoryReason,
        defeatReason: null,
        units: derived.units,
        reachableTiles: derived.reachableTiles,
        visibleTargets: derived.visibleTargets,
        visibleMeleeTargets: derived.visibleMeleeTargets,
        selectedTargetId: derived.selectedTargetId,
        fogSnapshot: derived.fogSnapshot,
        combatLog: [
          ...state.combatLog,
          makeLog(state.round, "player", phrase("log.m2.ropeCut"), "alert"),
        ],
      });
    },

    douseWindlassFire: () => {
      const state = get();
      if (
        state.scenario !== "mission2" ||
        !state.m2 ||
        state.isBusy ||
        state.turn !== "player" ||
        state.outcome !== "ongoing"
      ) {
        return;
      }
      const selected = state.units.find((u) => u.id === state.selectedUnitId);
      if (!selected) return;
      const nextClock = applyDouseAction(state.m2, selected);
      if (!nextClock) return;
      const units = state.units.map((unit) =>
        unit.id === selected.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const derived = deriveSelectionData(
        state.grid,
        units,
        selected.id,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      set({
        m2: nextClock,
        units: derived.units,
        reachableTiles: derived.reachableTiles,
        visibleTargets: derived.visibleTargets,
        visibleMeleeTargets: derived.visibleMeleeTargets,
        selectedTargetId: derived.selectedTargetId,
        fogSnapshot: derived.fogSnapshot,
        combatLog: [
          ...state.combatLog,
          makeLog(state.round, "player", phrase("log.m2.douse"), "story"),
        ],
      });
    },

    disruptKeystoneRite: () => {
      const state = get();
      if (
        state.scenario !== "mission2" ||
        !state.m2 ||
        state.isBusy ||
        state.turn !== "player" ||
        state.outcome !== "ongoing"
      ) {
        return;
      }
      const selected = state.units.find((u) => u.id === state.selectedUnitId);
      if (!selected) return;
      const nextClock = applyDisruptKeystone(state.m2, selected, state.units);
      if (!nextClock) return;
      const units = state.units.map((unit) =>
        unit.id === selected.id ? { ...unit, ap: Math.max(0, unit.ap - 1) } : unit,
      );
      const derived = deriveSelectionData(
        state.grid,
        units,
        selected.id,
        state.weather,
        state.selectedTargetId,
        state.fogSnapshot.exploredCoords,
        state.blastZones,
        state.fogOfWarEnabled,
        state.scenario,
      );
      playHitSound();
      set({
        m2: nextClock,
        units: derived.units,
        reachableTiles: derived.reachableTiles,
        visibleTargets: derived.visibleTargets,
        visibleMeleeTargets: derived.visibleMeleeTargets,
        selectedTargetId: derived.selectedTargetId,
        fogSnapshot: derived.fogSnapshot,
        combatLog: [
          ...state.combatLog,
          makeLog(
            state.round,
            "player",
            phrase("log.m2.disrupt", { unitId: selected.id }),
            "alert",
          ),
        ],
      });
    },

    chooseOath: (which) => {
      const state = get();
      if (state.scenario !== "mission2" || state.outcome !== "victory" || state.oath) {
        return;
      }
      const living = (id: string) => {
        const unit = state.units.find((item) => item.id === id);
        return !!unit && unit.alive && unit.hp > 0;
      };
      const havelUp = living(HAVEL_ID);
      const ondrejUp = living(ONDREJ_ID);
      const havel =
        !havelUp ? "fallen" : which === "both" || which === "havel" ? "accept" : "refuse";
      const ondrej =
        !ondrejUp
          ? "fallen"
          : which === "both" || which === "ondrej"
            ? "accept"
            : "refuse";
      const line = (id: string, pick: "accept" | "refuse" | "fallen") =>
        makeLog(
          state.round,
          "player",
          phrase(
            pick === "accept"
              ? "log.m2.oath.accept"
              : pick === "refuse"
                ? "log.m2.oath.refuse"
                : "log.m2.oath.fallen",
            { unitId: id },
          ),
          "story",
        );
      set({
        oath: { havel, ondrej },
        campaign: persistCampaign({ ...state.campaign, oath: { havel, ondrej } }),
        combatLog: [
          ...state.combatLog,
          line(HAVEL_ID, havel),
          line(ONDREJ_ID, ondrej),
        ],
      });
    },
  };
});


subscribeLocale(() => {
  relabelCatalogs();
  useGameStore.setState((state) => {
    state.grid.applyLocaleLabels();
    const units = state.units.map((unit) => projectUnit(unit));
    const derived = deriveSelectionData(
      state.grid,
      units,
      state.selectedUnitId,
      state.weather,
      state.selectedTargetId,
      state.fogSnapshot.exploredCoords,
      state.blastZones,
      state.fogOfWarEnabled,
      state.scenario,
    );
    return {
      units: derived.units,
      reachableTiles: derived.reachableTiles,
      visibleTargets: derived.visibleTargets,
      visibleMeleeTargets: derived.visibleMeleeTargets,
      selectedTargetId: derived.selectedTargetId,
      fogSnapshot: derived.fogSnapshot,
      gridVersion: state.gridVersion + 1,
    };
  });
});
