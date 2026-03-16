# Feature 15: Tree Visualizer Global Filter (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ✅ Complete |
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

- `quest-master/src/app/services/global.service.ts` — add `filterTerm`, `loading`, `error`, `lastRefreshed` signals; error-handling in `refresh()`
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

---

## Bug Fixes (post-completion)

### 2026-03-13: Dropped keystrokes in filter input

**Symptom**: Characters typed into the filter field were intermittently ignored; the user had to retype them. Filtering by an existing global name (e.g. `MyGlobal`) showed nothing in the tree.

**Root cause**: The `[value]="globalService.filterTerm()"` one-way binding and the 300 ms debounce fought each other. Angular's change detection ran after every keystroke and reset the input's DOM `value` to the stale signal value (the signal only updated after the debounce timer fired), effectively erasing each typed character before the next could be entered. Both symptoms — dropped keystrokes and the filter appearing not to work — were the same bug.

**Fix (v1 — incomplete)**: Removed the debounce. `onFilterInput` calls `globalService.filterTerm.set(value)` directly. The `[value]` binding remained.

**Relapse 2026-03-13**: The filter still failed to apply. Root cause: even without a debounce, Angular's CD ran after each `(input)` event and re-set `input.value` from the signal via `[value]`. Because signal updates and CD scheduling are asynchronous in Angular 17's push model, the binding could overwrite the user's typed characters before the next `input` event fired — keeping the signal empty and the tree unfiltered.

**Fix (v2 — final)**: Removed `[value]` entirely. The input is now uncontrolled from Angular's perspective. `(input)` updates the signal directly without interference. Restoration of the persisted term on navigation back is handled imperatively in `ngAfterViewInit` via a `@ViewChild('filterInputEl')` reference. `clearFilter()` also resets `filterInputEl.nativeElement.value` alongside the signal.

**Files changed**: `quest-master/src/app/components/tree-visualizer/tree-visualizer.component.ts`, `tree-visualizer.component.html`

---

## UX Audit Findings (2026-03-13)

Expert heuristic evaluation of the completed component against the primary learner workflow (write code → switch to Tree tab → inspect globals). Issues are ordered by impact.

### Critical

| # | Issue | Status | Symptom for learner |
|---|---|---|---|
| 1 | **No loading state or refresh button** | ✅ Fixed 2026-03-13 | `refresh()` fires only once, on first tab visit. If the learner visits Tree before running code, then runs code and returns, they see stale data with no indication. The empty-state message "Run code in Quest View…" is shown both when no globals exist *and* while the fetch is in flight — a false negative that makes learners think their code failed. |
| 2 | **No error handling on refresh** | ✅ Fixed 2026-03-13 | If the HTTP call fails (IRIS down, Docker stopped), `globals()` stays at its previous value silently. The user sees either an outdated tree or the empty-state message with no error message. |
| 3 | **SVG has no ARIA structure** | ⬜ Open | The entire D3 tree is invisible to screen readers. No `role`, no `aria-label`, no `<title>` elements on nodes. |

**Fix for 1+2**: Added `loading`, `error`, and `lastRefreshed` signals to `GlobalService`. `refresh()` now sets `loading(true)` at start and clears it on success/error; sets `error()` on failure. Component shows "Loading globals…" in the SVG empty state while loading; shows an error banner with a Retry button on failure; shows a ↻ refresh button (spins while loading) and "Updated HH:MM:SS" timestamp in the header.

### High

| # | Issue | Status | Symptom for learner |
|---|---|---|---|
| 4 | **Two invisible truncation systems / stale data** | ✅ Partially fixed 2026-03-13 | The backend caps at 50 children / 3 levels (marks `truncated: true`); the frontend silently drops nodes when the 300-node budget runs out. Backend truncation shows a `…` dashed circle (unexplained); frontend truncation leaves no trace at all. Learners can't tell their data is incomplete. |
| 5 | **Node budget jumps 300 → 2000 when filter is active** | ⬜ Open | The tree renders dramatically more nodes when filtered than when browsing unfiltered. Removing the filter causes nodes to disappear with no explanation. |

**Fix for 4 (partial)**: The "last refreshed" timestamp makes stale data visible. The unexplained `…` dashed circle and the silent frontend node budget drop remain open (tracked under issue 5 / future sprint).

### Medium

| # | Issue | Status | Symptom for learner |
|---|---|---|---|
| 6 | **No node hover / click interaction** | ⬜ Open | Beginners try clicking the `…` truncation nodes and get no response. No canonical IRIS path (`^Global("sub1","sub2")`) is shown anywhere, so learners can't connect the visual to the ObjectScript syntax they write. |
| 7 | **No zoom reset** | ⬜ Open | After zooming in or panning off-screen, the only recovery is navigating away and back. |
| 8 | **Filter input fixed at 220px** | ⬜ Open | Long global names (e.g. `^MyApplicationConfig`) plus subscript paths can exceed the visible input width. |

### Accessibility / Contrast Failures

| Element | Color | Background | Ratio | WCAG AA | Status |
|---|---|---|---|---|---|
| `.tree-hint` | ~~`#6b5f94`~~ `#9b8fc4` | `#0d0b1a` | ~5:1 | Pass | ✅ Fixed 2026-03-13 |
| `.filter-count` (default) | ~~`#6b5f94`~~ `#9b8fc4` | `#0d0b1a` | ~5:1 | Pass | ✅ Fixed 2026-03-16 |
| Truncated node label | ~~`#4a3f6b`~~ `#7c6ea8` | `#0d0b1a` | ~4.5:1 | Pass | ✅ Fixed 2026-03-16 |
| Filter placeholder | ~~`#4a3f6b`~~ `#8a7db5` | `#1a1630` | ~4.8:1 | Pass | ✅ Fixed 2026-03-16 |

Additional ARIA gaps: ~~the filter `<input>` has no `<label>` element~~ → added `aria-label="Filter globals"`. ~~the clear button (`×`) uses only a `title` attribute~~ → replaced with `aria-label="Clear filter"`. Both fixed 2026-03-13.
