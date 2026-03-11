# Feature 04: Global Tree Visualizer (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ✅ Complete |
| Pedagogical Principle | Dual Coding |
| Depends On | C3 (Navbar Navigation) — the `/tree` route and `TreeVisualizerComponent` stub are created by C3; F4 implements the component body |

---

## Task Prompt
Build a visualizer that renders the structure of IRIS globals as an interactive tree, refreshed each time the user clicks Run.

---

## Pedagogical Design
**The Learning Problem**: Globals are "invisible." Students struggle to visualize how a multidimensional array in memory differs from a flat SQL table.
**The Cognitive Solution**: Dual Coding (Paivio). Providing a visual representation (the tree) alongside the verbal representation (the code) helps form a stronger mental model of InterSystems' unique storage engine.

---

## Implementation Details
- **Frontend**:
    - `TreeVisualizerComponent` (stub created by C3) implements the full `/tree` page body — it is a full-width routed view, not a sidebar tab.
    - Uses **D3.js** (`d3-hierarchy` + `d3-zoom`) for tree layout. Add `d3` and `@types/d3` to `package.json`.
    - `GlobalService` injects `IrisApiService` (for the `getGlobals(config)` call) and `GameStateService` (for `irisConfig()`). Exposes a `globals` signal updated on each refresh.
    - Refresh triggered by `QuestViewComponent.runAllFiles()` success path — `GlobalService.refresh()` is called after a successful execute. No auto-polling; no timer.
- **IRIS Backend**:
    - Add `GET /api/quest/globals` route to `QuestMaster.REST.Execute`.
    - Implement a safe, depth-limited global walker using `$ORDER` (max depth: 3 levels).
    - **Inclusion filter**: only globals whose names match `$MATCH(name, "^\^[A-Za-z][A-Za-z0-9]*$")` are returned. This naturally excludes `^%*`, `^IRIS*`, `^Cache*`, `^rOBJ`, `^oddDEF`, and all other IRIS-internal globals without an enumerated deny-list.
    - **Node-count cap**: max 50 children per node, max 200 nodes total. When truncated, the affected node includes `"truncated": true`.
    - Response schema:
      ```json
      {
        "globals": [
          {
            "name": "^MyGlobal",
            "children": [
              { "key": "1", "value": "Hello", "children": [] },
              { "key": "2", "value": null, "children": [
                  { "key": "data", "value": "World", "children": [] }
              ]},
              { "key": "...", "truncated": true, "children": [] }
            ]
          }
        ]
      }
      ```
- **AI Prompts**: —

---

## Files Changed

- `quest-master/iris/QuestMaster.REST.Execute.cls` — add `GET /globals` route and `Globals()` method
- `quest-master/src/app/services/iris-api.service.ts` — add `getGlobals(config)` method
- `quest-master/src/app/services/global.service.ts` — new `GlobalService` (wraps `IrisApiService.getGlobals`, exposes `globals` signal)
- `quest-master/src/app/services/global.service.spec.ts` — Vitest unit tests for `GlobalService` (mock `IrisApiService`)
- `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.ts` — implement component body (D3 tree); replaces C3 stub
- `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.html` — template (SVG host element)
- `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.scss` — styles
- `quest-master/src/app/components/quest-view/quest-view.component.ts` — call `GlobalService.refresh()` in `runAllFiles()` success path
- `quest-master/package.json` — add `d3` and `@types/d3`

---

## Open Questions

- ~~**D3.js vs. pure SVG**~~ — **Use D3** (`d3-hierarchy` + `d3-zoom`). Reingold-Tilford layout math is non-trivial to write by hand; D3's ~80 KB cost is acceptable for a local dev tool. Add `d3` + `@types/d3`.
- ~~**UI placement**~~ — C3 already resolved this: the visualizer is a **full-width routed page at `/tree`**, not a sidebar tab. `TreeVisualizerComponent` (stub from C3) becomes the page body. No changes to `app.html` are needed.
- ~~**Node-count safety cap**~~ — **50 children per node, 200 nodes total**. Truncated nodes include `"truncated": true` in the JSON response.
- ~~**Scope of excluded globals**~~ — **Allow-list by regex**: only globals matching `^\^[A-Za-z][A-Za-z0-9]*$` are returned. This excludes `^%*`, `^IRIS*`, `^Cache*`, `^rOBJ`, `^oddDEF`, etc. without an enumerated deny-list.
- ~~**`GlobalService` HTTP pattern**~~ — **Add `getGlobals(config: IRISConfig)` to `IrisApiService`**; `GlobalService` injects `IrisApiService` + `GameStateService`. Consistent with existing service pattern.
- ~~**Test coverage**~~ — **Vitest unit test** for `GlobalService` (`global.service.spec.ts`). Mock `IrisApiService.getGlobals()` with a fixture and assert signal value. Playwright E2E for the SVG tree is too brittle at this stage.

---

## Verification Plan
1. Run `SET ^Test(1, "data") = "Hello"` and click Run.
2. Verify the `GlobalVisualizerComponent` reflects the new node in the tree without a manual page refresh.
3. Run `KILL ^Test` and click Run again — verify the tree clears.
4. Verify system globals (`^%`) do not appear in the tree.
