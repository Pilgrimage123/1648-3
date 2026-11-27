# 23. 2D Cut-Out Skeletal Rig, 1648 Uniforms, and Biomechanical Kinematics

Date: 2026-11-26
Status: Accepted

## Context

With `"2D_SPRITE"` established as the default render mode across all three missions (ADR-0022), static SVG billboards could not convey the material, doctrinal, and anatomical distinctions of the 1648 Prague siege:

- Swedish forces under Königsmark and Karl Gustav fielded both modernized lightened M1624 muskets fired offhand with paper cartridges (`patronkök`) and older heavy matchlocks braced on a wooden *furketa* with a "Twelve Apostles" bandolier.
- Prague defenders (*Pražané*) range from Field Marshal Rudolf Count Colloredo — awakened in a white linen *noční košile* with a permanent 1632 Lützen leg limp — to towering Jesuit commander Father Jiří Plachý (~2 m), Old Town butcher Havel Řezáč, rooftop scout Ondřej Štěrba, and Clementinum students.
- Static billboards also lacked true horizontal directional flips relative to the rotating isometric camera, secondary cloth/flask inertia, and synchronized HUD bust portraits.

## Decision

1. **Pure TypeScript Skeletal Rig & State Machine (`src/utils/swedishRig2D.ts`)**:
   - Decouple kinematics from React and Three.js in a zero-DOM module tested directly under `node:test` (`src/utils/swedishRig2D.test.ts`).
   - Support 18 historically grounded 1648 profiles via `resolveSwedishProfile(archetype, unitId, scenario, faction)`:
     - **Prague Defenders (8)**: `colloredo_marshal`, `jan_matej_valet`, `vaclav_scribe`, `bartolomej_armorer`, `plachy_jesuit`, `havel_butcher`, `ondrej_thief`, `klementinum_student`.
     - **Swedish Troops (10)**: `odowalsky_officer`, `yellow_brigade`, `blue_brigade`, `green_veteran`, `belvedere_heavy_musketeer`, `red_pikeman`, `artillery_constable`, `m3_carolean`, `m2_harrier`, `m2_occultist`.
   - Separate offhand M1624 firearms (`hasFurketa === false`: faster shoulder-aim at `0.00–0.22s`, pan flash at `0.22–0.32s`, `+0.10s` ignition delay, stronger muzzle climb) from furketa-braced heavy matchlocks (`hasFurketa === true`: *furketa* plant at `0.00–0.18s`, braced aim, pan flash at `0.34s`, heavier rearward torso kick) via `resolveUsesFurketa` and `evaluateFireSequence`.
   - Model Field Marshal Colloredo's Lützen limp (`hasLimp`) with an asymmetric march cycle where the injured back leg drags with reduced hip swing (`maxBackLimp < maxFrontLimp * 0.65`) while the torso dips onto his walking cane.
   - Drive damped harmonic secondary-motion springs (`apostleSwing`, `coatHemSwing`, `cloakSwing`, `plumeSwing`) and dynamic metallic specular highlights (`specularShift`).

2. **Analytical 2-Bone IK & Layered 2D Canvas Renderer (`src/utils/swedishCanvasRenderer.ts`)**:
   - Render 420×420 cut-out sprites (`SWEDISH_CANVAS_W`, `SWEDISH_CANVAS_H`) in strict depth order: rear limb, cloak/scabbard, breeches/stockings/*skor* or riding boots/velvet slippers, torso garment (`kabátec`, `nightshirt`, or `jesuit_cassock`) with matte wool gradients vs. specular steel cuirass/gorget scratches and trench mud splatters, cross-belt bandoliers or cartridge boxes, brow-seated headgear (`slokhatt`, `zischagge`, `morion`, `karpus`, `constable_cap`, `nightcap`, `jesuit_biretta`, `burgher_hat`, `student_hat`), weapon, and front arm.
   - Use `solveTwoBoneIK` with clamped reach (zero `NaN` on over-extension) and non-crossing shoulder-to-hand assignment for dual-hand heroes (`isDualHandedOffhand`: forward/`+X` shoulder extends the pistol/luntstock/carbine while near/`-X` shoulder holds the cane, crucifix, cleaver, dagger, rapier, or censer).
   - Expose `getSwedishPortraitDataUri` to crop synchronized HUD bust portraits directly from the live profile renderer, forwarded with `faction` through `proceduralSprites.ts` and `UnitPortrait.tsx`.

3. **3D Billboard Integration (`UnitVisual2D.tsx`, `UnitActor.tsx`)**:
   - Project unit 3D facing onto the camera's screen-right axis to flip `facingSign` (`1 | -1`) cleanly during Q/E camera rotation.
   - Step springs every frame (`stepSwedishRig`) and redraw the offscreen canvas onto a shadow-casting `THREE.CanvasTexture` at ~60 Hz during action and ~12 Hz in idle, while scaling down outer billboard march hop/recoil in `UnitActor.tsx` when `renderMode === "2D_SPRITE"` to avoid double-tilting.

## Consequences

- All 1648 combatants share a single testable kinematic and material pipeline across battlefield sprites and HUD portraits.
- Furketa vs. offhand M1624 drill differences and Colloredo's nightshirt/Lützen limp remain verifiable in headless `node:test` suites without a browser.
