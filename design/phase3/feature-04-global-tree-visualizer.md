# Feature 04: Global Tree Visualizer (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Pedagogical Principle | Dual Coding |
| Depends On | — |

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

## Verification Plan
1. Run `SET ^Test(1, "data") = "Hello"` and click Run.
2. Verify the `GlobalVisualizerComponent` reflects the new node in the tree without a manual page refresh.
3. Run `KILL ^Test` and click Run again — verify the tree clears.
4. Verify system globals (`^%`) do not appear in the tree.
