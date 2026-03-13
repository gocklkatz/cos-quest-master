# Feature 15: Tree Visualizer Global Filter (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Depends On | F4 (Global Tree Visualizer) |
| Pedagogical Principle | Learner Agency / Directed Attention |

---

## Task Prompt

Add a filter input field at the top of the Tree Visualizer view. The backend returns all user globals (no total-node cap); the frontend filters the visible tree in real time as the user types. A global is shown if the filter string matches its name **or** any subscript key or value anywhere in its subtree (case-insensitive, substring match). Clearing the field restores the full tree. The filter term persists in `GlobalService` so it survives navigation away and back.

**Acceptance criteria:**
- A text input labelled "Filter globals…" appears above the tree.
- Typing `Learning` hides all globals except those with `Learning` in their name.
- Typing `Albert` surfaces `^Learning.AdventurerD` because subscript key or value contains `"Albert"`.
- The filter is applied to the D3 render only — no new API call is made.
- An "X / Y globals" count is shown next to the field (`Showing 2 of 7 globals`).
- When the filter matches nothing, an empty-state message is shown: _"No globals matching '…'"_.
- An × clear button resets the filter.
- Escape key clears the filter.
- The filter term is stored on `GlobalService` and restored when the user navigates back to `/tree`.
- The backend regex filter is kept for system globals (`^%…`, `^ROUTINE`) but the 200-node total cap is removed; per-global depth limits (50 children per level, 3 levels) remain.

---

## Pedagogical Design

**The Learning Problem**: As the learner progresses through Globals and Classes quests, the namespace accumulates many globals (`^GuildMemberD`, `^Learning.AdventurerD`, `^MyCounterG`, …). The full tree becomes visually noisy, making it hard to focus on the single global just created by the current quest.

**The Cognitive Solution**: A filter field gives the learner *directed attention* — they can type the name of the class or variable they just worked with and see only its data. This reinforces the connection between code written and data stored, which is the core mental model F4 is trying to build.

---

## Implementation Details

### Frontend

- **Filter signal (persisted)**: `filterTerm = signal('')` lives on `GlobalService` (not the component), so it survives navigation. `TreeVisualizerComponent` reads it via `this.globalService.filterTerm`.
- **Match logic**: A global passes the filter if the term matches its name **or** appears in any `key` or `value` string anywhere in its `children` array (recursive). Extract a pure helper `globalMatchesFilter(entry: GlobalEntry, term: string): boolean` in a utility file for testability.
- **Computed filtered list**: `filteredGlobals = computed(() => { const t = this.globalService.filterTerm().toLowerCase(); return t ? this.globalService.globals().filter(g => globalMatchesFilter(g, t)) : this.globalService.globals(); })`.
- **Re-render trigger**: The existing `effect()` must depend on `filteredGlobals()` — pass its value to `toTreeData()`.
- **Count label**: Derive `"Showing X of Y globals"` from `filteredGlobals().length` vs `globals().length`.
- **Input field**: Plain `<input>` with `(input)` binding → `globalService.filterTerm.set(...)`. Escape key handler clears term.
- **Debounce**: 150 ms debounce on the input event to avoid thrashing D3 on every keystroke.

### Backend

- Remove the `tTotalNodes < 200` total cap in `QuestMaster.REST.Execute.cls` `Globals()` method.
- Keep per-level limits (50 children per subscript at each of the three levels).
- Keep the existing system-global regex filter (`^\^[A-Za-z][A-Za-z0-9.]*$`).

> **Rationale for removing total cap**: the filter makes visual complexity manageable on the frontend; the total cap was a coarse workaround that inadvertently hid legitimate user globals (e.g. `^Learning.AdventurerD`). Per-level limits are sufficient to prevent runaway response sizes.

---

## Open Questions

- ~~Should the filter also match on subscript *keys* (not just global names)?~~ **Yes** — match name, keys, and values recursively. `globalMatchesFilter()` helper keeps it testable.
- ~~Should the filter term persist across navigations?~~ **Yes** — stored on `GlobalService` signal so it survives route changes.

---

## Files Changed

- `quest-master/src/app/services/global.service.ts` — add `filterTerm` signal
- `quest-master/src/app/utils/global-filter.ts` — new `globalMatchesFilter()` helper
- `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.ts`
- `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.html`
- `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.scss`
- `quest-master/iris/QuestMaster.REST.Execute.cls` (remove total node cap)

---

## Verification Plan

1. Compile and run `^Learning.AdventurerD` quest; navigate to Tree Visualizer — full tree visible.
2. Type `Learning` in filter field — only `^Learning.AdventurerD` node rendered; count shows `Showing 1 of N globals`.
3. Type `Albert` — `^Learning.AdventurerD` still shown (value match in subtree); other globals hidden.
4. Clear with × button — all globals reappear.
5. Press Escape — filter clears.
6. Type `Learning`, navigate to Quest View, navigate back — filter term `Learning` is restored; count still filtered.
7. Type `xyz` — empty-state message shown.
