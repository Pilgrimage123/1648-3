/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { TitleScreen } from "./components/ui/TitleScreen";
import { isUnitFighting } from "./core/CombatSystem";
import { useGameStore } from "./store/useGameStore";

const loadTacticalWorkspace = () => import("./components/ui/TacticalWorkspace");
const TacticalWorkspace = lazy(() =>
  loadTacticalWorkspace().then((m) => ({ default: m.TacticalWorkspace })),
);

function isInspectKey(e: KeyboardEvent): boolean {
  return e.key === "F1" || e.code === "Digit0" || e.code === "Numpad0" || e.key === "0";
}

export default function App() {
  const briefingOpen = useGameStore((s) => s.briefingOpen);
  const [hasStartedMission, setHasStartedMission] = useState(!briefingOpen);

  useEffect(() => {
    if (!briefingOpen) {
      setHasStartedMission(true);
    }
  }, [briefingOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get("autostart");
    const missionParam = params.get("mission");
    const floorParam = params.get("floor");
    const noTutorial = params.get("notutorial") === "1";
    if (autostart === "1" || missionParam === "1" || missionParam === "2" || missionParam === "3") {
      const targetScenario =
        missionParam === "3" ? "mission3" : missionParam === "2" ? "mission2" : "mission1";
      useGameStore.getState().beginScenario(targetScenario);
      if (noTutorial) {
        useGameStore.getState().skipGuidedTutorial();
      }
      if (floorParam === "0" || floorParam === "1" || floorParam === "2") {
        useGameStore.getState().setActiveFloor(Number(floorParam) as 0 | 1 | 2);
      }
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      useGameStore
        .getState()
        .setFullscreenState(Boolean(document.fullscreenElement));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const state = useGameStore.getState();
      if (state.briefingOpen) return;

      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        state.toggleFullscreen();
        return;
      }

      if (isInspectKey(e) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (!e.repeat) state.beginInspectHold();
        return;
      }

      if (e.key === "Escape" && state.inspectOpen) {
        e.preventDefault();
        state.closeInspect();
        return;
      }

      if (state.sacrificeDilemmaOpen || state.outcome !== "ongoing") {
        return;
      }

      if (e.key === "Escape") {
        state.setActionMode("move");
        return;
      }

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        state.toggleFloor();
        return;
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        const maxFloor = state.scenario === "mission3" ? 1 : 2;
        state.setActiveFloor(Math.min(maxFloor, state.activeFloor + 1) as 0 | 1 | 2);
        return;
      }
      if (e.key === "PageDown") {
        e.preventDefault();
        state.setActiveFloor(Math.max(0, state.activeFloor - 1) as 0 | 1 | 2);
        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        state.toggleActionCam();
        return;
      }

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        state.toggleRenderMode();
        return;
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        state.toggleFogOfWar();
        return;
      }

      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        if (state.scenario === "mission1") {
          if (e.shiftKey) {
            state.skipGuidedTutorial();
          } else {
            state.toggleGuidedTutorial();
          }
        }
        return;
      }

      if (state.turn === "player" && !state.isBusy) {
        if (e.key === "1") {
          e.preventDefault();
          state.setActionMode("move");
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          state.setActionMode(state.actionMode === "shoot" ? "move" : "shoot");
          return;
        }
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          state.executeReload();
          return;
        }
        if (e.key === "b" || e.key === "B" || e.key === "6") {
          e.preventDefault();
          state.setActionMode(state.actionMode === "melee" ? "move" : "melee");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          state.activateOverwatch();
          return;
        }
        if (e.key === "4") {
          e.preventDefault();
          state.setActionMode("grenade");
          return;
        }
        if (e.key === "5") {
          e.preventDefault();
          state.activateSpecialAbility();
          return;
        }
      }

      if (e.key === "Tab" && state.turn === "player" && !state.isBusy) {
        e.preventDefault();
        if (state.actionMode === "shoot") {
          if (state.visibleTargets.length > 0) {
            state.cycleTarget(e.shiftKey ? -1 : 1);
          }
        } else if (state.actionMode === "melee") {
          if (state.visibleMeleeTargets.length > 0) {
            state.cycleTarget(e.shiftKey ? -1 : 1);
          }
        } else {
          const activeSquad = state.units.filter(
            (u) => u.faction === "player" && isUnitFighting(u) && u.ap > 0,
          );
          if (activeSquad.length > 0) {
            const currentIdx = activeSquad.findIndex(
              (u) => u.id === state.selectedUnitId,
            );
            const delta = e.shiftKey ? -1 : 1;
            const nextIdx =
              currentIdx < 0
                ? 0
                : (currentIdx + delta + activeSquad.length) % activeSquad.length;
            const nextUnit = activeSquad[nextIdx];
            if (nextUnit) state.selectUnit(nextUnit.id);
          }
        }
        return;
      }

      if (state.turn === "player" && !state.isBusy) {
        if (state.actionMode === "shoot" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          state.executeShoot();
          return;
        }
        if (state.actionMode === "melee" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          state.executeMelee();
          return;
        }
        if (state.actionMode !== "shoot" && state.actionMode !== "melee" && e.key === " ") {
          e.preventDefault();
          state.endTurn();
          return;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isInspectKey(e)) return;
      useGameStore.getState().endInspectHold();
    };

    const onBlur = () => {
      useGameStore.getState().cancelInspectHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  return (
    <>
      {hasStartedMission && (
        <Suspense
          fallback={
            !briefingOpen ? (
              <div className="flex h-dvh w-screen items-center justify-center bg-[#0d0a08] font-cinzel text-sm uppercase tracking-widest text-amber-300">
                Praha 1648…
              </div>
            ) : null
          }
        >
          <TacticalWorkspace paused={briefingOpen} />
        </Suspense>
      )}
      {briefingOpen && (
        <main className="relative z-10 h-dvh w-screen overflow-x-hidden overflow-y-auto bg-[#0d0a08] text-amber-50 select-none">
          <TitleScreen prefetchWorkspace={loadTacticalWorkspace} />
        </main>
      )}
    </>
  );
}
