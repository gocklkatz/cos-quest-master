# Feature 12: Branch Progression System (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ✅ Complete |
| Depends On | [Feature 01 — Dynamic Quest Regeneration](feature-01-dynamic-quest-regeneration.md) |
| Pedagogical Principle | Spiral Curriculum / Mastery-Based Progression |

---

## Task Prompt

Implement a curriculum-driven mechanism that automatically advances the player to a new skill branch after they have completed enough quests in the current one. The transition must be invisible to the player during normal flow (no required action) but announced via a brief UI notification when it occurs. The branch used for generation must be persisted across sessions.

**Acceptance criteria:**
1. After completing the configured number of quests in `setup`, the next generated quest uses branch `commands`.
2. After completing the configured number of quests in `commands`, the next generated quest uses branch `globals`.
3. The progression continues through all configured branches in order: `setup → commands → globals → classes → sql → capstone`. The final branch (`capstone`) has no advancement threshold.
4. Completing `quest-zero` (the static starter quest, branch `setup`) counts toward the `setup` threshold. The player therefore only needs 2 additional AI-generated `setup` quests before advancing to `commands`.
5. A "Branch Unlocked" toast is displayed in the Quest Panel when a transition occurs.
6. The current branch is stored in `GameStateService` (persisted to `localStorage`) so it survives page reload.
7. All existing behaviour is unchanged when no transition occurs.

---

## Pedagogical Design

**The Learning Problem**: Without a progression mechanism the AI always generates quests in the same branch (`setup`). The player never encounters globals, classes, or commands as distinct topics — the curriculum stalls at the introductory tier.

**The Cognitive Solution**: Spiral Curriculum (Bruner). Skills should be revisited with increasing complexity and from new angles. By gating branch transitions on demonstrated mastery (N successful quests), the system ensures each concept layer is practised before the next is introduced. The automatic advance removes the burden of curriculum navigation from the learner, keeping the focus on the task at hand.

---

## Implementation Details

### Branch Progression Config

Add a new file `quest-master/src/app/data/branch-progression.ts`:

```typescript
export interface BranchStage {
  branch: string;
  /** Number of completed quests required in this branch before advancing. null = terminal. */
  minQuestsToAdvance: number | null;
}

export const BRANCH_PROGRESSION: BranchStage[] = [
  { branch: 'setup',    minQuestsToAdvance: 3 },   // quest-zero counts; 2 more generated quests needed
  { branch: 'commands', minQuestsToAdvance: 5 },
  { branch: 'globals',  minQuestsToAdvance: 5 },
  { branch: 'classes',  minQuestsToAdvance: 5 },
  { branch: 'sql',      minQuestsToAdvance: 3 },   // focused bridge before capstone
  { branch: 'capstone', minQuestsToAdvance: null }, // terminal — F5 Spiral Quests live here
];
```

The constants are deliberately conservative (3 / 5 / 5 / 5 / 3) — enough to practise each topic without overstaying. `sql` gets a shorter threshold (3) because it is a focused bridge paradigm before the capstone rather than a full curriculum tier.

### GameStateService changes

- Add a `currentBranch` signal (type `string`) initialised from `localStorage` with fallback to `BRANCH_PROGRESSION[0].branch` (`'setup'`).
- Add `setCurrentBranch(branch: string): void` that writes the signal and persists to `localStorage`.

### QuestEngineService changes

- Add a private `resolveBranch(completedFromBranch: string): string` method:
  1. Count how many of `allQuests()` (i.e., quests already in the bank) have `branch === completedFromBranch`.
  2. Look up the `BranchStage` for `completedFromBranch` in `BRANCH_PROGRESSION`.
  3. If `count >= minQuestsToAdvance` (and `minQuestsToAdvance` is not `null`), return the next stage's branch; otherwise return `completedFromBranch`.
- In `generateNextQuest(branch, apiKey)`:
  1. Call `resolveBranch(branch)` to obtain `targetBranch`.
  2. If `targetBranch !== branch`, call `gameState.setCurrentBranch(targetBranch)` and set the new `branchUnlocked` signal (see below).
  3. Pass `targetBranch` to `claude.generateQuest(...)` instead of the raw `branch` argument.
- Add a `branchUnlocked` signal (`string | null`) that holds the name of the newly unlocked branch (cleared after the toast is dismissed).

### QuestPanelComponent changes

- Read the `branchUnlocked` signal from `QuestEngineService`.
- When non-null, display a transient toast: **"New branch unlocked: [branch]"** (auto-dismisses after 4 s or on click).
- After dismissal, call `questEngine.clearBranchUnlocked()`.

### QuestView / Settings changes

- On reset (`doReset` in `SettingsModalComponent`): call `gameState.setCurrentBranch('setup')` to reset the branch alongside progress.
- Change the hardcoded `'setup'` argument in `settings-modal.component.ts:60` to `gameState.currentBranch()` — though after a reset this will always be `'setup'`, this keeps the argument consistent.

### Claude prompt changes

No changes required to the system prompt — the branch is already templated as `currentBranch` in `claude-api.service.ts`.

---

## Files Changed

- `quest-master/src/app/data/branch-progression.ts` — new config file (created)
- `quest-master/src/app/models/game-state.models.ts` — added `currentBranch: string` to `GameState`; default `'setup'`
- `quest-master/src/app/services/game-state.service.ts` — added `currentBranch` computed signal + `setCurrentBranch()`
- `quest-master/src/app/services/quest-engine.service.ts` — added `resolveBranch()`, `branchUnlocked` signal, `clearBranchUnlocked()`; wired into `generateNextQuest()`
- `quest-master/src/app/components/quest-panel/quest-panel.component.ts` — reads `branchUnlocked`, computes `branchUnlockedLabel`, auto-dismiss timer, `dismissBranchToast()`
- `quest-master/src/app/components/quest-panel/quest-panel.component.html` — toast markup
- `quest-master/src/app/components/quest-panel/quest-panel.component.scss` — toast styles
- `quest-master/src/app/components/settings-modal/settings-modal.component.ts` — uses `gameState.currentBranch()` for post-reset generation
- `quest-master/src/app/components/settings-modal/settings-modal.component.spec.ts` — added `currentBranch` signal to mock
- `quest-master/src/app/services/quest-engine.service.spec.ts` — added 4 unit tests for `resolveBranch()` and branch progression

---

## Open Questions

- [x] ~~**Quest counting strategy**: `resolveBranch` counts quests already in `allQuests()` (the quest bank). Should it count *completed* quests only (those with a history entry), or *all quests generated* in that branch including unattempted ones?~~ **Resolved**: Implemented using **completed quests only** — intersection of `gameState.completedQuests()` and `allQuests()` filtered by branch. Safer: prevents accidental advance if the player skips an early quest.

- [x] ~~**Branch name display**: The toast shows the raw branch string (`'commands'`, `'globals'`, etc.). Should there be a display-name map?~~ **Resolved**: Added `BRANCH_DISPLAY_NAMES` map in `branch-progression.ts` (e.g. `globals` → `"Global Variables"`). Used in `QuestPanelComponent.branchUnlockedLabel`.

- [x] ~~**What happens at quest-zero**: Quest-zero (`setup` branch) is a static starter quest, not a generated one. Should completing quest-zero count toward the `setup` threshold?~~ **Resolved**: Yes. Quest-zero counts. The player needs 2 more generated `setup` quests (total threshold: 3) before advancing to `commands`.

- [ ] **Thresholds are tunable**: The values 3 / 5 / 5 / 5 / 3 are first guesses. They should be validated against real player sessions. Consider making them configurable via a developer flag in `branch-progression.ts` rather than hardcoding.

---

## Verification Plan

1. Complete quest-zero. Confirm branch stays `setup` (threshold not yet reached: 1 of 3).
2. Complete 2 more quests with branch `setup`. On the 2nd AI-generated completion (3rd overall including quest-zero), verify the next quest is generated with `commands` branch (check network request payload or `QuestEngine.currentQuest().branch`).
3. Verify the "Branch Unlocked: commands" toast appears in the Quest Panel after the 3rd `setup` quest is submitted.
4. Reload the page. Verify `currentBranch` is still `commands` (persisted to localStorage).
5. Open Settings → Reset All Progress. Verify `currentBranch` resets to `setup`.
6. Complete 5 `commands` quests. Verify transition to `globals` branch.
7. Complete 5 `globals` quests. Verify transition to `classes` branch.
8. Complete 5 `classes` quests. Verify transition to `sql` branch.
9. Complete 3 `sql` quests. Verify transition to `capstone` branch (F5 Spiral Quests).
10. Confirm no further advancement occurs from `capstone` (terminal stage).

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
