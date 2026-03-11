# Feature 04: Global Tree Visualizer (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
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
    - New `GlobalVisualizerComponent` using D3.js or a lightweight SVG tree.
    - Sidebar tab to toggle the visualizer panel.
    - Refresh triggered by the existing "Run" event — after a successful execute call, `GlobalService.refresh()` is called.
    - No auto-polling; no timer.
- **IRIS Backend**:
    - Add `GET /api/quest/globals` route to `QuestMaster.REST.Execute`.
    - Implement a safe, depth-limited global walker using `$ORDER` (max depth: 3 levels).
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
              ]}
            ]
          }
        ]
      }
      ```
    - Limit scope to globals in the `USER` namespace whose names start with `^` (exclude system globals like `^%`).
- **AI Prompts**: —

---

## Files Changed

- `quest-master/iris/QuestMaster.REST.Execute.cls` — add `GET /globals` route and `Globals()` method
- `quest-master/src/app/services/global.service.ts` — new `GlobalService` (calls `/api/quest/globals`, exposes signal)
- `quest-master/src/app/components/global-visualizer/global-visualizer.component.ts` — new component (SVG/D3 tree)
- `quest-master/src/app/components/global-visualizer/global-visualizer.component.html` — template
- `quest-master/src/app/components/global-visualizer/global-visualizer.component.scss` — styles
- `quest-master/src/app/app.ts` — wire up `GlobalService.refresh()` after Run, add visualizer to layout
- `quest-master/src/app/app.html` — add visualizer panel and toggle
- `quest-master/package.json` — add `d3` dependency (if D3 approach is chosen)

---

## Open Questions

- [ ] **D3.js vs. pure SVG**: D3 is not currently in `package.json`. Decision needed before implementation. D3 adds ~80 KB (minified+gzip) but simplifies tree layout math. Pure SVG is zero-dependency but requires manual layout. Choose one.
- [ ] **UI placement**: The doc says "sidebar tab" but doesn't specify where in the existing layout. The architecture diagram shows `GlobalVisualizer [NEW]` alongside `AIPairChat`. Should the visualizer be a tab within the left sidebar (alongside `QuestPanel`)? A panel below `AiPairChat` on the right? Or a toggle that replaces the AI chat area?
- [ ] **Node-count safety cap**: Depth limit of 3 is specified, but no maximum node count. A global with thousands of first-level subscripts could produce an oversized JSON payload. Add a per-level or total-node cap (e.g., max 50 children per node, max 200 nodes total) and return a truncation indicator.
- [ ] **Scope of excluded globals**: The spec only excludes names starting with `^%`. IRIS also has internal globals like `^CacheTemp*`, `^IRIS*`, `^SYS*`. Clarify whether "user globals only" means strictly "not starting with `^%`" or a broader exclusion list.
- [ ] **`GlobalService` HTTP pattern**: Should `GlobalService` call `IrisApiService` (following the existing service pattern) or make its own `HttpClient` calls directly?
- [ ] **Test coverage**: No test file is specified. Per CLAUDE.md, an automated test is required. Decide: Vitest unit test for `GlobalService` (mock HTTP), or Playwright E2E for the visual component?

---

## Verification Plan
1. Run `SET ^Test(1, "data") = "Hello"` and click Run.
2. Verify the `GlobalVisualizerComponent` reflects the new node in the tree without a manual page refresh.
3. Run `KILL ^Test` and click Run again — verify the tree clears.
4. Verify system globals (`^%`) do not appear in the tree.
