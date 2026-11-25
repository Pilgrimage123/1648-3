# 22. Lazy Scene Lifecycle, Shader Stability, and 2D Sprite Default

Status: accepted

1. **Split-shell lazy loading & persistent paused `<Canvas>`**: `TitleScreen` loads without Three.js, R3F, drei, or procedural 3D assets, and initial mission grid/FoW/Dijkstra construction is deferred until `beginScenario`. Once a mission starts, `<TacticalScene>` stays mounted-but-paused (`frameloop="never"` inside a hidden container) when returning to the briefing screen (`openBriefing`), avoiding WebGL2 context destruction, PMREM environment rebuilds, and 19 city geometry re-extrusions on mission switches.
2. **Fixed-slot `pointLight` pool (`visible={true}`, `intensity = 0`)**: Pooled practical and flash `<pointLight>`s stay permanently `visible={true}` and zero their `intensity` when inactive instead of toggling `.visible`. Changing `NUM_POINT_LIGHTS` mid-combat or on floor cutaway forces synchronous PBR shader recompilation; keeping light counts constant eliminates mid-frame shader stalls.
3. **Unified `2D_SPRITE` default across all 3 missions (`preferredRenderMode`)**: Missions 1, 2, and 3 all default to `"2D_SPRITE"`, while `[M]` persists `preferredRenderMode` across scenario resets and mission switches and lazy-loads `UnitVisual3D`.
