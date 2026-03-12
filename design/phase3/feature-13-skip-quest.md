# Feature 13: Skip Quest (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Depends On | F1 (Dynamic Quest Regeneration), F9 (Quest Generation Loading Indicator) |
| Pedagogical Principle | Desirable Difficulty / Engagement Preservation |

---

## Task Prompt

Add a **Skip** button to the Quest Panel. When the player presses it:

1. An inline confirmation prompt appears ("Skip this quest? **Skip** / **Cancel**").
2. If confirmed, the current quest is discarded and `generateNextQuest(currentBranch, apiKey)` is called immediately.
3. The existing Quest Generation Loading Indicator (F9) activates while the new quest is being generated.
4. The skipped quest does **not** count toward the branch progression threshold (F12).
5. A `skipsThisSession` counter is incremented on `GameStateService` (not shown in UI by default, available for future analytics).
6. The Skip button is disabled while `questGenerating` is `true`.

**Acceptance criteria**:
- Skip button is visible in the Quest Panel alongside the Submit button.
- Confirmation guard prevents single-click accidents.
- Skipping a quest triggers quest generation with the same branch as the discarded quest.
- No XP penalty or negative feedback is shown to the player.
- Skip button is visually disabled (greyed out) while a quest is already generating.
- `skipsThisSession` is stored in `GameStateService` and resets on Reset All Progress.

---

## Pedagogical Design

**The Learning Problem**: AI-generated quests occasionally land outside the player's current context — wrong difficulty, topic already mastered, or an edge-case the player cannot debug without more background. Forcing the player to either struggle unproductively or abandon the app entirely leads to dropout.

**The Cognitive Solution**: A low-friction escape valve keeps the player in the learning loop. Allowing a skip without penalty respects learner autonomy (Self-Determination Theory) and avoids learned helplessness. The confirmation guard adds a minimal friction cost that preserves the signal — a player who skips intentionally is giving meaningful feedback about quest quality.

---

## Implementation Details

- **`QuestEngineService`**: Add `skipQuest()` method — discards current quest, increments `GameStateService.skipsThisSession`, calls `generateNextQuest(currentBranch, apiKey)`. Does NOT call `recordQuestComplete()`.
- **`GameStateService`**: Add `skipsThisSession` signal (number, default `0`). Reset to `0` in `resetProgress()`.
- **`QuestPanelComponent`**: Add Skip button next to Submit. Button binds to a local `confirmingSkip` boolean signal. When `confirmingSkip` is `false`, shows "Skip". When `true`, shows "Skip this quest?" + **Confirm** / **Cancel** inline. Button disabled when `questGenerating()` is `true`.
- **No IRIS backend changes** required.
- **No AI prompt changes** required — skip reuses the existing `generateNextQuest` flow.

---

## Files Changed

- `quest-master/src/app/quest-view/quest-panel/quest-panel.component.ts` — Skip button logic, `confirmingSkip` signal
- `quest-master/src/app/quest-view/quest-panel/quest-panel.component.html` — Skip button + inline confirmation UI
- `quest-master/src/app/quest-view/quest-panel/quest-panel.component.scss` — Skip button styles
- `quest-master/src/app/services/quest-engine.service.ts` — `skipQuest()` method
- `quest-master/src/app/services/game-state.service.ts` — `skipsThisSession` signal

---

## Open Questions

- [ ] Should skips be persisted across sessions (e.g., in `localStorage`) for future analytics, or reset-only?
- [ ] Should there be a visual indicator (e.g., toast "Generating a new quest…") separate from the F9 loading skeleton, or is F9 sufficient?

---

## Verification Plan

1. Load app, reach a quest. Click **Skip** — confirmation prompt appears.
2. Click **Cancel** — quest remains unchanged, button returns to normal state.
3. Click **Skip** again, then **Confirm** — F9 loading indicator appears, new quest loads in same branch.
4. Verify skipped quest did not advance branch progression counter (check `completedQuestIds` length).
5. Verify `GameStateService.skipsThisSession` incremented by 1.
6. Click Skip while quest is generating — button is disabled / non-interactive.
7. Run `ng build` — zero errors.
8. Run `ng test` — zero regressions.
