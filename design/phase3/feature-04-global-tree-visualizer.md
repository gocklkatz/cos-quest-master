# Feature 04: Global Tree Visualizer (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Pedagogical Principle | Dual Coding |
| Depends On | Feature 05 |

---

## Task Prompt
Build a live-updating visualizer that renders the structure of IRIS globals as an interactive tree.

---

## Pedagogical Design
**The Learning Problem**: Globals are "invisible." Students struggle to visualize how a multidimensional array in memory differs from a flat SQL table.
**The Cognitive Solution**: Dual Coding (Paivio). Providing a visual representation (the tree) alongside the verbal representation (the code) helps form a stronger mental model of InterSystems' unique storage engine.

---

## Implementation Details
- **Frontend**: 
    - New `GlobalVisualizer` component using D3.js or a simple SVG tree.
    - Sidebar tab to toggle the visualizer.
- **IRIS Backend**: 
    - Add `/api/quest/globals` endpoint to `QuestMaster.REST.Execute`.
    - Implement a safe, depth-limited global walker using `$ORDER`.
- **AI Prompts**: —

---

## Verification Plan
1. Run `SET ^Test(1, "data") = "Hello"`.
2. Verify the `GlobalVisualizer` reflects the new node in the tree.
3. Run `KILL ^Test` and verify the tree clears.
