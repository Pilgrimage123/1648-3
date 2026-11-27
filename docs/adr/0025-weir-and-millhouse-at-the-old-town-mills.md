# The weir floods the ford, and through-draft vents the millhouse flour

Missions 1–3 followed Marshal Colloredo's escape, the Old Town Bridge Tower defense on 26 July 1648, and Father Plachý's night sortie against the powder yard. By mid-August 1648, Swedish forces tightening the siege across the Vltava sent a burning pitch-and-powder barge down the Old Town millrace in the morning river fog (`12 August 1648`), hoping to fire the Old Town Mills (*Staroměstské mlýny*) that grind bread for the garrison and power the wooden water tower beside Novotného lávka. Mission 4 (**Jez a mlýnice** / *Weir and Millhouse*) shifts command to three guildsmen and defenders of Prague's civilian estates—head miller **Mistr Prokop Šípek** (VIP), apothecary **Klára z Lékárny u Zlatého orla**, and water-tower smith **Matyáš „Hrom“ Kovář**—without recycling heroes from Missions 1–3 (`ADR-0014`).

## Architectural Decisions

1. **Pure Headless Simulation Module (`src/core/mission4.ts`)**:
   Following `mission2.ts` and `mission3.ts` (`ADR-0002`), all Mission 4 grid layout (`24 × 28 × 3`, `RoofKind = "mill"`), sluice state (`SLUICE_WEST`, `SLUICE_TOWER`), fire-barge movement (`bargeX: 4 → 14`, `bargeKegsRemaining: 2`), anchor grapples (`grappleCount: 0..2`), flour-dust hazard (`FLOUR_TILES`, `flourVented`, `millBurningTurns`), vinegar compress (`applyVinegarCompress`), and dual win conditions (`"weir_flood"` | `"barge_sunk"`) live in pure TypeScript with zero Three.js or React imports.

2. **Two Symmetric, Non-RNG Victory Paths & Hydraulic Consequence**:
   - **Hydrotechnical Path (`"weir_flood"`)**: Opening both the bank sluice (`SLUICE_WEST = (10, 0, 10)`) and the upper hoist chain (`SLUICE_TOWER = (16, 1, 14)`) triggers `resolveFlood`: the millrace surge sweeps the fire-barge away from the waterwheels (instant victory) while flooding `FORD_TILES` (`x: 8..10, z: 12..16`) from `cobble` (`walkable: true`) into deep `water` (`walkable: false`). Any living defenders on the ford or bank sluice step safely east onto `(11, z)` before flooding, while Swedish forders take surge damage and are pushed back westward (`x: 7`), preserving tile invariants so no living soldier ever stands on impassable water.
   - **Gunnery Path (`"barge_sunk"`)**: Elevated defenders—especially Klára from the water-tower crown (`y = 2`, parapet half-cover) or Matyáš from the granary windows (`y = 1`)—can target the two volatile powder kegs aboard the burning barge (`shootBargeKeg`, `1 AP`, direct 3D Line of Sight, loaded weapon). Destroying both kegs sinks the barge in mid-channel.

3. **Flour Dust Explosion & Through-Draft Portal Venting (`ADR-0011`)**:
   - While both exterior millhouse doors (`MILL_DOOR_N = (14, 0, 9)`, `MILL_DOOR_W = (11, 0, 13)`) remain closed (`!flourVented`), airborne mill flour lingers inside the roofed millhouse (`x: 11..18, z: 9..17`, `y <= 1`). Any **matchlock** discharge (`lockType === "matchlock"`) fired from inside—or directly striking inside—an unvented enclosed millhouse ignites the suspended flour (`checkFlourDustIgnition`), injuring units standing on `FLOUR_TILES`, adding persistent indoor smoke (`+3` turns), and incrementing `millBurningTurns`.
   - Opening at least one exterior mill door (`toggleDoor` / `getOpenExteriorDoors()`) establishes a physical cross-draft, venting the flour cleanly (`flourVented = true`) and activating `Through-Draft Portal Venting` smoke decay, at the tactical cost of exposing the interior to Swedish forders and musket lines. Wheellock weapons (`sipek_wheellock_pistol`, `klara_apothecary_carbine`) never carry a lit matchcord and can fire safely even indoors before venting.

4. **Asymmetric Trio & Resource-Bounded Mitigation**:
   - **Prokop Šípek (`player-sipek`, `commander`, VIP)**: `sipek_wheellock_pistol` + `mill_pole_hook` (`polearm` with 1-tile knockback `displaceFromMelee`), opens either sluice in `1` action (allies take `2` steps), and cuts anchor grapples for `1 AP`. Falling loses the mission (`loss: "sipek"`).
   - **Klára (`player-klara`, `sniper`)**: `klara_apothecary_carbine` (accurate wheellock carbine safe in unvented rooms) + `apothecary_knife`, plus **Vinegar Compress (`applyVinegarCompress`, `1 AP`, 2 charges)** curing `isChoking`/`isShaken`, restoring `+4 HP` (up to `maxHp`), and clearing tile smoke on self or adjacent allies.
   - **Matyáš „Hrom“ Kovář (`player-matyas`, `trooper`)**: `Armor 3` (`Cuirassier Respiratory Resistance` in smoky rooms), `matchlock_musket_fork` (high-impact musket with flour-dust risk indoors if unvented) + `forge_hammer` (`armorPierce: 2`, `armorShred: 2`, `stunChance: 25`), plus `1 AP` grapple-breaking (`breakGrapple`) at the riverbank.

5. **Render-Mode & Light-Budget Compliance (`ADR-0007`, `ADR-0022`)**:
   `OldTownMillDressing.tsx` renders composite Baroque waterwheels, timber tower framing, flour sacks, sluice gates, and the drifting burning barge using `0` additional `<pointLight>` components, preserving `RoomEnvironment` PBR reflections and fixed practical light slots.

## Consequences

- `ScenarioId` expands to `"mission1" | "mission2" | "mission3" | "mission4"`.
- `RoofKind` adds `"mill"` in `GridSystem.ts`, completely isolated from Missions 1–3.
- All Mission 4 terms are documented in `GLOSSARY.md`, `docs/design/mission-4-jez-a-mlynice-tactical-design.md`, and verified by `scripts/test-mission4.ts`.
