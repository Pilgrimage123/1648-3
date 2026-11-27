# 24. WorldHtml Deferred Unmount, Coroutine Epochs, and Regression Hardening

Date: 2026-11-26
Status: Accepted

## Context

Running on React 19 alongside `@react-three/fiber` v9 exposed subtle lifecycle and timing hazards during rapid scenario resets, floor cutaways, and combat VFX:

- `@react-three/drei`'s `<Html>` could trigger React 19's `"Attempted to synchronously unmount a root while React was already rendering"` race when unit/tile overlays unmounted mid-R3F commit.
- Long async combat and AI coroutines (`executeShoot`, `executeKegShot`, `performOverwatchReactionsIfAny`, `endTurn`) risked mutating state after `openBriefing` or `beginScenario` restarted a mission.
- Collateral `powder_keg` detonations and `lightFlashes` needed strict alignment with `performance.now()` epochs and projectile impact arrival (`~730ms`), while `CombatLines3D.tsx` allocated repeated debris geometries per shot.

## Decision

1. **Custom `<WorldHtml>` Overlay (`src/components/canvas/WorldHtml.tsx`)**:
   - Replace `@react-three/drei`'s `<Html>` with `WorldHtml`, which mounts an overlay container into `gl.domElement.parentElement` inside a passive `useEffect` and defers `root.unmount()` via `setTimeout(..., 0)` outside the R3F reconciler commit phase.
   - Reuse module-level scratch `THREE.Vector3` instances (`_v1`, `_v2`, `_v3`) in `useFrame` to update screen position, clamped distance scale, behind-camera hiding, and z-index only when epsilon thresholds are exceeded.

2. **Store Modularization & Epoch/Timer Cancellation (`src/store/`)**:
   - Split store responsibilities cleanly across `storeTypes.ts`, `storeUtils.ts`, `combatResolution.ts`, `scenarioLifecycle.ts`, `combatActions.ts`, `aiTurnRunner.ts`, and `useGameStore.ts`.
   - Centralize `sessionEpoch` (`bumpSessionEpoch`, `isStaleSession`), `activeTimers` cleanup (`registerTimer`, `clearRegisteredTimers`, `scheduleTimer`), and `openBriefing()` transient state clearing (`isBusy: false`, `activeMovement: null`, `activeProjectile: null`, `suspendAudio()`).
   - Standardize `addLightFlash` timestamps on `performance.now()` and guard `isFixtureDucked` / `retainFlashes` against negative ages.

3. **Arrival-Synchronized VFX & Shared Geometries (`CombatLines3D.tsx`, `combatActions.ts`)**:
   - Hoist repeated particle, debris, armor-spark, splinter, and sight-sphere geometries in `CombatLines3D.tsx` to module-level shared singletons.
   - Defer collateral `powder_keg` `blastZone` and `lightFlash` emission inside `executeShoot` / `executeKegShot` until bullet arrival rather than firing at `t = 0`.
   - Enforce zero non-diegetic `<pointLight>` tags inside `GrandPrioryPalaceDressing.tsx` (ADR-0015) and isolate Mission 2/3 miss obstacle metadata from Mission 1 palace stucco/wood classifications.

4. **Automated Regression Suite (`scripts/test-regressions.ts`)**:
   - Wire `scripts/test-regressions.ts` into `npm test` covering flash epochs, Mission 3 mute-vs-scar victory logs, `klementinum_verdict` smoke piercing, powder-keg tutorial/loaded guards & firearm discharge, reload tutorial step syncing, `ui.epilogue.defeatMeta` variants, `2D_SPRITE` persistence, cached `getMission1EscapeTile`, `GrandPrioryPalaceDressing` light count, `openBriefing` coroutine cancellation, and collateral keg arrival timing.

## Consequences

- Scenario switches and returning to the briefing screen cancel pending timers and coroutines cleanly without React 19 root unmount warnings.
- Timing, lighting budget, and tutorial/combat edge cases stay continuously verified by `npm test`.
