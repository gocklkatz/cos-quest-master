---
description: "Task list for Adaptive Difficulty (F18)"
---

# Tasks: Adaptive Difficulty

**Input**: Design documents from `/specs/018-adaptive-difficulty/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: Unit tests for `DifficultyService` are included per Constitution Principle III
(new services MUST ship with unit tests). E2E tests are included for each user story.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Extend the data model — prerequisite for all user stories.

- [ ] T001 Add `DifficultyPreference = 'beginner' | 'intermediate' | 'advanced'` and `AdvancedFocus = 'oop' | 'sql'` type exports to `quest-master/src/app/models/game-state.models.ts`
- [ ] T002 Add `difficultyPreference: DifficultyPreference | null` and `advancedFocus: AdvancedFocus | null` fields to the `GameState` interface in `quest-master/src/app/models/game-state.models.ts`
- [ ] T003 Add `difficultyPreference: null` and `advancedFocus: null` to `DEFAULT_GAME_STATE` in `quest-master/src/app/models/game-state.models.ts`
- [ ] T004 Update `normalizeGameState()` in `quest-master/src/app/models/game-state.models.ts` to default `difficultyPreference` and `advancedFocus` to `null` if absent (handles old localStorage blobs)

---

## Phase 2: Foundational

**Purpose**: Create `DifficultyService` and wire it into `GameStateService` — blocks all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create `quest-master/src/app/services/difficulty.service.ts` — standalone injectable with `effectiveTier: Signal<QuestTier>` computed signal (advanced → 'master'; intermediate → 'journeyman'|'master' by XP; beginner/null → standard XP gate via `calcLevel`)
- [ ] T006 Add `initialSubBranch: Signal<string>` to `DifficultyService` in `quest-master/src/app/services/difficulty.service.ts` (advanced+oop → 'classes-methods'; advanced+sql → 'sql-queries'; intermediate → 'classes-properties'; beginner/null → 'setup')
- [ ] T007 Add `updateDifficultyPreference(preference: DifficultyPreference, focus: AdvancedFocus | null): void` to `GameStateService` in `quest-master/src/app/services/game-state.service.ts`
- [ ] T008 Expose `readonly difficultyPreference: Signal<DifficultyPreference | null>` as a computed signal on `GameStateService` in `quest-master/src/app/services/game-state.service.ts`
- [ ] T009 Write unit tests for `DifficultyService` in `quest-master/src/app/services/difficulty.service.spec.ts` — cover all 5 entry-point paths and all 3 tier-floor mappings; ensure tests FAIL before T005–T006 are implemented

**Checkpoint**: `DifficultyService` is injectable and all unit tests pass. User story implementation can now begin.

---

## Phase 3: User Story 1 — First-Session Difficulty Selection (Priority: P1) 🎯 MVP

**Goal**: New players see a difficulty selection prompt before their first quest.

**Independent Test**: Clear localStorage, reload app, verify difficulty prompt appears and selecting "Advanced — OOP" results in the first quest being in the `classes-methods` sub-branch.

### Tests for User Story 1

> **NOTE: Write E2E test stubs FIRST (they will fail until implementation is complete)**

- [ ] T010 [P] [US1] Add E2E test for first-run difficulty prompt in `quest-master/e2e/quests.spec.ts` — verify prompt appears on fresh session, selections route to correct sub-branches, preference persists after reload

### Implementation for User Story 1

- [ ] T011 [US1] Create `quest-master/src/app/components/difficulty-prompt/difficulty-prompt.component.ts` — standalone Angular component with `confirmed` output event emitter; internal signals for selected preference and advanced focus; Confirm button disabled until full selection is made
- [ ] T012 [US1] Create `quest-master/src/app/components/difficulty-prompt/difficulty-prompt.component.html` — three-option selector (Beginner / Intermediate / Advanced); conditional secondary OOP/SQL question when Advanced is selected; Confirm button
- [ ] T013 [US1] Create `quest-master/src/app/components/difficulty-prompt/difficulty-prompt.component.scss` — modal overlay styles consistent with existing modal components
- [ ] T014 [US1] Show `DifficultyPromptComponent` in `quest-master/src/app/components/quest-view/quest-view.component.ts` when `gameState.difficultyPreference() === null`; on `confirmed` event call `gameState.updateDifficultyPreference()` then `gameState.setCurrentBranch(difficulty.initialSubBranch())`
- [ ] T015 [US1] Replace the inline tier calculation (~line 282) in `quest-master/src/app/services/quest-engine.service.ts` with `this.difficulty.effectiveTier()` and remove the `TODO(F18)` comment
- [ ] T016 [US1] Remove `currentEffectiveTier()` from `quest-master/src/app/services/game-state.service.ts` and update any remaining callers to use `DifficultyService.effectiveTier()` instead

**Checkpoint**: US1 fully functional — fresh session shows prompt, advanced OOP starts at `classes-methods`, beginner starts at `setup`, preference persists.

---

## Phase 4: User Story 2 — Difficulty Preference in Settings (Priority: P1)

**Goal**: Players can change their difficulty preference at any time via the Settings panel.

**Independent Test**: On an existing session with "Advanced", open Settings, change to "Intermediate", save, complete the current quest, verify next quest is journeyman-tier.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add E2E test for settings difficulty change in `quest-master/e2e/quests.spec.ts` — verify preference change in Settings takes effect on next quest generation without disrupting current quest; verify localStorage persistence

### Implementation for User Story 2

- [ ] T018 [US2] Add a "Learning Difficulty" segmented control (Beginner / Intermediate / Advanced) to `quest-master/src/app/components/settings-modal/settings-modal.component.html` — below Daily Goal, above Danger Zone; show secondary OOP/SQL selector when Advanced is selected
- [ ] T019 [US2] Add `difficultyPreference` and `advancedFocus` signals to `quest-master/src/app/components/settings-modal/settings-modal.component.ts` initialized from `gameState.difficultyPreference()` and `gameState.advancedFocus()`
- [ ] T020 [US2] Update `save()` in `quest-master/src/app/components/settings-modal/settings-modal.component.ts` to call `gameState.updateDifficultyPreference(difficultyPreference(), advancedFocus())` alongside existing settings save

**Checkpoint**: US2 fully functional — Settings panel shows current preference; changing it persists and affects next quest.

---

## Phase 5: User Story 3 — Soft Recalibration Nudge (Priority: P2)

**Goal**: After two consecutive low-score completions in a session, a dismissible nudge appears suggesting the player review their difficulty setting.

**Independent Test**: Submit two consecutive quests with score < 70. Verify a non-blocking nudge appears with a Settings link. Dismiss it. Verify it does not reappear that session even after further low scores.

### Tests for User Story 3

- [ ] T021 [P] [US3] Add unit test extension to `quest-master/src/app/services/quest-engine.service.spec.ts` — verify `suggestDifficultyAdjustment` becomes `true` after two consecutive score < 70 completions, and remains `false` after a score >= 70 resets the counter

### Implementation for User Story 3

- [ ] T022 [US3] Add `private consecutiveLowScores = 0` and `readonly suggestDifficultyAdjustment = signal(false)` to `quest-master/src/app/services/quest-engine.service.ts`
- [ ] T023 [US3] In the quest completion flow in `quest-master/src/app/services/quest-engine.service.ts`, increment `consecutiveLowScores` when `evaluation.score < 70`; reset to 0 when score >= 70; when counter reaches 2 set `suggestDifficultyAdjustment(true)` and reset counter to 0
- [ ] T024 [US3] In `quest-master/src/app/components/quest-view/quest-view.component.ts`, read `questEngine.suggestDifficultyAdjustment()` and show a dismissible toast/inline banner when `true`; dismiss action calls `questEngine.suggestDifficultyAdjustment.set(false)`
- [ ] T025 [US3] Add Settings modal trigger to the nudge UI in `quest-master/src/app/components/quest-view/quest-view.component.html` — clicking "Adjust in Settings" opens the Settings modal and dismisses the nudge

**Checkpoint**: US3 fully functional — two consecutive low scores show the nudge; dismiss works; nudge does not reappear in the same session.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Add `DifficultyPromptComponent` to the Angular declaration/import list in `quest-master/src/app/app.config.ts` or wherever standalone components are registered (verify it is importable)
- [ ] T027 [P] Add `DifficultyService` to `quest-master/src/app/app.config.ts` providers list if not using `providedIn: 'root'`
- [ ] T028 [P] Verify `GameStateService.resetProgress()` resets `difficultyPreference` and `advancedFocus` to `null` in `quest-master/src/app/services/game-state.service.ts` (so the prompt reappears after Reset All Progress)
- [ ] T029 Run `ng build` in `quest-master/` — must produce zero errors
- [ ] T030 Run `npm test` in `quest-master/` — all Vitest tests pass including new DifficultyService suite
- [ ] T031 Run `npm run test:e2e` in `quest-master/` — Playwright E2E suite passes including US1 and US2 tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 2; can start in parallel with US1 once T005–T008 are done
- **US3 (Phase 5)**: Depends on Phase 2; independent of US1 and US2
- **Polish (Phase 6)**: Depends on all user stories complete

### Parallel Opportunities

```bash
# Phase 1 tasks are independent:
T001, T002, T003, T004 → can run sequentially (same file — order matters)

# Phase 2 — DifficultyService first, then GameStateService:
T005, T006  →  T007, T008  →  T009 (tests)

# Once Phase 2 is complete, US1, US2, US3 can start in parallel:
Phase 3 (US1) || Phase 4 (US2) || Phase 5 (US3)

# Within US1, component files can be parallel:
T011, T012, T013 [P] → T014, T015, T016

# Within US2:
T018, T019 [P] → T020

# Within US3:
T022, T023 → T024, T025
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only — Both P1)

1. Complete Phase 1: Data model types and defaults
2. Complete Phase 2: `DifficultyService` + GameStateService wiring
3. **STOP**: Run unit tests — all DifficultyService tests must pass
4. Complete Phase 3: First-run prompt
5. Complete Phase 4: Settings panel control
6. **STOP AND VALIDATE**: Clear localStorage → prompt appears → Advanced OOP → first quest in `classes-methods`; then Settings → change to Beginner → next quest at apprentice tier
7. Demo/review — US3 (recalibration nudge) can follow in a separate session

### Incremental Delivery

1. Phase 1 + 2 → foundation ready
2. Phase 3 (US1) → first-run prompt working ← **first shippable increment**
3. Phase 4 (US2) → settings control working ← **second shippable increment**
4. Phase 5 (US3) → recalibration nudge ← **third shippable increment**

---

## Notes

- [P] tasks = different files or no cross-dependencies; safe to run in parallel
- T009 (DifficultyService unit tests) MUST be written before T005–T006 are implemented (TDD)
- T010, T017, T021 (E2E/unit test stubs) MUST be written before their corresponding implementation tasks
- Reset All Progress must leave `difficultyPreference = null` so the prompt reappears — verify T028 before closing
- Do not remove `challengeMode` from GameState (unrelated field — leave untouched)
