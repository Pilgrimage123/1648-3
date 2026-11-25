import { phrase, projectUnit, type Phrase } from "../i18n/runtime";
import { createInitialCameraDirectorState, resetLiveMovementTelemetry } from "../core/CameraDirector";
import {
  createInitialGrid,
  createInitialUnits,
  GRID_DEPTH,
  GRID_FLOORS,
  GRID_WIDTH,
  GridSystem,
} from "../core/GridSystem";
import {
  createMission2Explored,
  createMission2Grid,
  createMission2Units,
  freshClock as freshMission2Clock,
  PLACHY_ID,
} from "../core/mission2";
import {
  createMission3Grid,
  createMission3Units,
  freshClock as freshMission3Clock,
} from "../core/mission3";
import type {
  GuidedTutorialState,
  GuidedTutorialStep,
  ScenarioId,
  WeatherType,
} from "../core/types";
import { deriveSelectionData, syncColloredoMobility } from "./combatResolution";
import type { GameStoreState, StoreGet, StoreSet } from "./storeTypes";
import { bumpSessionEpoch, makeLog } from "./storeUtils";
import { suspendAudio } from "../utils/audioSystem";

export function deriveLegacyTutorialStep(
  guided: GuidedTutorialState,
  scenario: ScenarioId = "mission1",
): 1 | 2 | 3 | 4 | null {
  if (scenario !== "mission1") return null;
  if (!guided.enabled && guided.dismissed) return null;
  const step = guided.currentStep;
  if (step === "step_1_matej_move" || step === "step_2_colloredo_escort") return 1;
  if (step === "step_3_vaclav_aim" || step === "step_4_vaclav_shoot") return 2;
  if (
    step === "step_5_enemy_turn_react" ||
    step === "step_6_vaclav_reload" ||
    step === "step_7_keg_explosion" ||
    step === "step_8_melee_finish"
  ) {
    return 3;
  }
  return 4;
}

export function mirrorTutorialFields(
  guidedTutorial: GuidedTutorialState,
  scenario: ScenarioId = "mission1",
  explicitStep?: 1 | 2 | 3 | 4 | null,
): Pick<GameStoreState, "guidedTutorial" | "tutorialStep" | "tutorialDismissed"> {
  return {
    guidedTutorial,
    tutorialStep:
      explicitStep !== undefined
        ? explicitStep
        : deriveLegacyTutorialStep(guidedTutorial, scenario),
    tutorialDismissed: guidedTutorial.dismissed,
  };
}

export function createDefaultGuidedTutorial(scenario: ScenarioId): GuidedTutorialState {
  const isM1 = scenario === "mission1";
  return {
    enabled: isM1,
    currentStep: "step_1_matej_move",
    dismissed: !isM1,
    rejectFeedback: null,
    rejectTimestamp: 0,
  };
}

export function createIdleBriefingSnapshot() {
  const initialGrid = new GridSystem(GRID_WIDTH, GRID_DEPTH, GRID_FLOORS, true);
  const initialWeather: WeatherType = "rain";
  const guided = createDefaultGuidedTutorial("mission1");
  return {
    initialGrid,
    initialWeather,
    firstPlayerId: null as string | null,
    derived: {
      units: [],
      fogSnapshot: {
        visibleCoords: new Set<string>(),
        exploredCoords: new Set<string>(),
        visibleEnemyIds: new Set<string>(),
        soundContacts: [],
        unitSightRadii: {},
      },
      reachableTiles: new Map(),
      visibleTargets: [],
      visibleMeleeTargets: [],
      selectedTargetId: null,
    },
    guided,
    tutorialMirrors: mirrorTutorialFields(guided, "mission1", 1),
  };
}

export function buildScenarioResetState(state: GameStoreState): Partial<GameStoreState> {
  bumpSessionEpoch();
  resetLiveMovementTelemetry();

  const currentWeather: WeatherType = "rain";
  const baseCleared = {
    round: 1,
    turn: "player" as const,
    weather: currentWeather,
    gridVersion: state.gridVersion + 1,
    smokeVersion: state.smokeVersion + 1,
    combatIntensity: 0,
    blastZones: [],
    outcome: "ongoing" as const,
    victoryReason: null,
    defeatReason: null,
    briefingOpen: false,
    oath: null,
    isCapturingAnim: false,
    sacrificeDilemmaOpen: false,
    sacrificedHeroId: null,
    ironVigilPerk: null,
    demonstratedAbilities: {},
    actionMode: "move" as const,
    inspectOpen: false,
    inspectKeyHeld: false,
    inspectClickConsumed: false,
    inspectPin: null,
    hoveredTile: null,
    hoveredPath: [],
    hoveredSpottedEnemyIds: [],
    isBusy: false,
    cameraDirector: createInitialCameraDirectorState(),
    activeMovement: null,
    activeProjectile: null,
    lightFlashes: [],
    unitFx: {},
  };

  if (state.scenario === "mission3") {
    const nextGrid = createMission3Grid();
    const party = createMission3Units(state.campaign).map((unit) => projectUnit(unit));
    const firstId = PLACHY_ID;
    const nextDerived = deriveSelectionData(
      nextGrid,
      party,
      firstId,
      currentWeather,
      null,
      undefined,
      [],
      false,
      "mission3",
    );
    const survivor = state.campaign.mission1SurvivorId;
    const guided = createDefaultGuidedTutorial("mission3");
    return {
      ...baseCleared,
      scenario: "mission3",
      m2: null,
      m3: freshMission3Clock(),
      grid: nextGrid,
      units: nextDerived.units,
      reinforcementsSpawned: true,
      reinforcementRound: 99,
      ...mirrorTutorialFields(guided, "mission3", null),
      selectedUnitId: firstId,
      activeFloor: 0,
      renderMode: state.preferredRenderMode,
      fogOfWarEnabled: false,
      fogSnapshot: nextDerived.fogSnapshot,
      reachableTiles: nextDerived.reachableTiles,
      visibleTargets: nextDerived.visibleTargets,
      visibleMeleeTargets: nextDerived.visibleMeleeTargets,
      selectedTargetId: nextDerived.selectedTargetId,
      revealedPodEnemyIds: new Set(nextDerived.fogSnapshot.visibleEnemyIds),
      combatLog: [
        makeLog(1, "player", phrase("log.m3.briefing"), "story"),
        ...(survivor
          ? [makeLog(1, "player", phrase("log.m3.watergate"), "story")]
          : []),
      ],
    };
  }

  if (state.scenario === "mission2") {
    const nextGrid = createMission2Grid();
    const nextUnits = createMission2Units().map((unit) => projectUnit(unit));
    const explored = createMission2Explored(nextGrid);
    const firstId = PLACHY_ID;
    const currentFogEnabled = state.preferredFogOfWar;
    const nextDerived = deriveSelectionData(
      nextGrid,
      nextUnits,
      firstId,
      currentWeather,
      null,
      explored,
      [],
      currentFogEnabled,
      "mission2",
    );
    const guided = createDefaultGuidedTutorial("mission2");
    return {
      ...baseCleared,
      scenario: "mission2",
      m2: freshMission2Clock(nextUnits),
      m3: null,
      grid: nextGrid,
      units: nextDerived.units,
      reinforcementsSpawned: true,
      reinforcementRound: 99,
      ...mirrorTutorialFields(guided, "mission2", null),
      selectedUnitId: firstId,
      activeFloor: 2,
      renderMode: state.preferredRenderMode,
      fogOfWarEnabled: currentFogEnabled,
      fogSnapshot: nextDerived.fogSnapshot,
      reachableTiles: nextDerived.reachableTiles,
      visibleTargets: nextDerived.visibleTargets,
      visibleMeleeTargets: nextDerived.visibleMeleeTargets,
      selectedTargetId: nextDerived.selectedTargetId,
      revealedPodEnemyIds: new Set(nextDerived.fogSnapshot.visibleEnemyIds),
      combatLog: [
        makeLog(1, "player", phrase("log.m2.briefing.gate"), "alert"),
        makeLog(1, "player", phrase("log.m2.briefing.ward"), "story"),
      ],
    };
  }

  const nextGrid = createInitialGrid();
  const nextUnits = syncColloredoMobility(createInitialUnits());
  const firstId =
    nextUnits.find((u) => u.id === "player-jan-matej")?.id ??
    nextUnits.find((u) => u.faction === "player")?.id ??
    null;
  const currentFogEnabled = state.preferredFogOfWar;
  const nextDerived = deriveSelectionData(
    nextGrid,
    nextUnits,
    firstId,
    currentWeather,
    null,
    undefined,
    [],
    currentFogEnabled,
    "mission1",
  );
  const guided = createDefaultGuidedTutorial("mission1");
  return {
    ...baseCleared,
    scenario: "mission1",
    m2: null,
    m3: null,
    grid: nextGrid,
    units: nextUnits,
    reinforcementsSpawned: false,
    reinforcementRound: 5,
    renderMode: state.preferredRenderMode,
    ...mirrorTutorialFields(guided, "mission1", 1),
    selectedUnitId: firstId,
    activeFloor: 1,
    fogOfWarEnabled: currentFogEnabled,
    fogSnapshot: nextDerived.fogSnapshot,
    reachableTiles: nextDerived.reachableTiles,
    visibleTargets: nextDerived.visibleTargets,
    visibleMeleeTargets: nextDerived.visibleMeleeTargets,
    selectedTargetId: nextDerived.selectedTargetId,
    revealedPodEnemyIds: new Set(nextDerived.fogSnapshot.visibleEnemyIds),
    combatLog: [
      makeLog(1, "player", phrase("log.briefing.gate"), "alert"),
      makeLog(1, "player", phrase("log.briefing.escape"), "story"),
    ],
  };
}

export function createScenarioLifecycleActions(set: StoreSet, get: StoreGet) {
  return {
    setGuidedTutorialStep: (step: GuidedTutorialStep) => {
      set((s) => {
        const nextGuided: GuidedTutorialState = {
          ...s.guidedTutorial,
          currentStep: step,
          rejectFeedback: null,
        };
        return mirrorTutorialFields(nextGuided, s.scenario);
      });
    },

    skipGuidedTutorial: () => {
      set((s) => {
        const nextGuided: GuidedTutorialState = {
          ...s.guidedTutorial,
          enabled: false,
          currentStep: "step_9_free_combat",
          rejectFeedback: null,
        };
        return mirrorTutorialFields(nextGuided, s.scenario, 4);
      });
    },

    toggleGuidedTutorial: () => {
      set((s) => {
        const nextDismissed = !s.guidedTutorial.dismissed;
        const nextGuided: GuidedTutorialState = {
          ...s.guidedTutorial,
          dismissed: nextDismissed,
        };
        return {
          guidedTutorial: nextGuided,
          tutorialDismissed: nextDismissed,
        };
      });
    },

    setGuidedTutorialReject: (msg: Phrase | null) => {
      set((s) => ({
        guidedTutorial: {
          ...s.guidedTutorial,
          rejectFeedback: msg,
          rejectTimestamp: performance.now(),
        },
      }));
    },

    setTutorialStep: (step: 1 | 2 | 3 | 4 | null) => {
      set((s) => {
        let nextGuided: GuidedTutorialStep = s.guidedTutorial.currentStep;
        if (step === 1) nextGuided = "step_1_matej_move";
        else if (step === 2) nextGuided = "step_3_vaclav_aim";
        else if (step === 3) nextGuided = "step_6_vaclav_reload";
        else if (step === 4) nextGuided = "step_9_free_combat";
        return mirrorTutorialFields(
          {
            ...s.guidedTutorial,
            currentStep: nextGuided,
            enabled: step !== null,
          },
          s.scenario,
          step,
        );
      });
    },

    advanceTutorialStep: () => {
      set((s) => {
        if (s.tutorialStep === null) return { tutorialStep: 1 };
        if (s.tutorialStep < 4) {
          const next = (s.tutorialStep + 1) as 1 | 2 | 3 | 4;
          let nextGuided: GuidedTutorialStep = s.guidedTutorial.currentStep;
          if (next === 2) nextGuided = "step_3_vaclav_aim";
          else if (next === 3) nextGuided = "step_6_vaclav_reload";
          else if (next === 4) nextGuided = "step_9_free_combat";
          return mirrorTutorialFields(
            { ...s.guidedTutorial, currentStep: nextGuided },
            s.scenario,
            next,
          );
        }
        return mirrorTutorialFields(
          {
            ...s.guidedTutorial,
            enabled: false,
            currentStep: "step_9_free_combat",
          },
          s.scenario,
          null,
        );
      });
    },

    toggleTutorial: () => {
      set((s) => {
        const nextDismissed = !s.tutorialDismissed;
        return {
          tutorialDismissed: nextDismissed,
          guidedTutorial: {
            ...s.guidedTutorial,
            dismissed: nextDismissed,
          },
        };
      });
    },

    resetGame: () => {
      set((s) => buildScenarioResetState(s));
    },

    beginScenario: (scenario: "mission1" | "mission2" | "mission3") => {
      set((s) => buildScenarioResetState({ ...s, scenario }));
    },

    openBriefing: () => {
      suspendAudio();
      set({ briefingOpen: true });
    },
  };
}
