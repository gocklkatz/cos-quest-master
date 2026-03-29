---
description: "Task list for Enhanced Gamification (F19)"
---

# Tasks: Enhanced Gamification

**Input**: Design documents from `/specs/019-enhanced-gamification/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: Unit tests for all new services. E2E tests for each user story.

**Organization**: Tasks grouped by user story and implementation phase.

## Format: `[ID] [P?] [USx] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[USx]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Extend the data model — prerequisite for all user stories.

- [ ] T001 Add `HintLevel = 'none' | 'level1' | 'level2' | 'level3'` type export to `quest-master/src/app/models/game-state.models.ts`
- [ ] T002 Add `UnlockedTheme` interface to `quest-master/src/app/models/game-state.models.ts` (subBranchName, themeName, themeColor, unlockDate)
- [ ] T003 Add `QuestMeta` interface to `quest-master/src/app/models/game-state.models.ts` (isBossQuest, hintLevel, comboMultiplier, themeUnlockedOnCompletion)
- [ ] T004 Add `comboStreak: number` field to `GameState` interface in `quest-master/src/app/models/game-state.models.ts`
- [ ] T005 Add `unlockedThemes: UnlockedTheme[]` field to `GameState` interface
- [ ] T006 Add `meta: QuestMeta` field to `Quest` interface in `quest-master/src/app/models/quest.models.ts`
- [ ] T007 Add `comboStreak: 0` and `unlockedThemes: []` to `DEFAULT_GAME_STATE` in `quest-master/src/app/models/game-state.models.ts`
- [ ] T008 Update `normalizeGameState()` in `quest-master/src/app/models/game-state.models.ts` to default `comboStreak` to 0 and `unlockedThemes` to empty array if absent
- [ ] T009 Add `meta: QuestMeta` to `DEFAULT_QUEST` in `quest-master/src/app/models/quest.models.ts`

---

## Phase 2: Foundational Services

**Purpose**: Create `BossQuestService`, `HintSystemService`, `ComboService` — blocks all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### BossQuestService

- [ ] T010 Create `quest-master/src/app/services/boss-quest.service.ts` — injectable with `currentIsBossQuest: Signal<boolean>` computed signal
- [ ] T011 Add `shouldBeBossQuest(currentSubBranch, questsCompletedInSubBranch, minQuests)` to `BossQuestService`
- [ ] T012 Add `getBossQuestInstruction()` to return prompt instruction string
- [ ] T013 Add `bossQuestRewardMultiplier: Signal<number>` (1.5 standard, 2.0 Prestige)
- [ ] T014 Write unit tests for `BossQuestService` in `quest-master/src/app/spec/boss-quest.service.spec.ts` — verify all 5 sub-branch Boss Quest identification paths

### HintSystemService

- [ ] T015 Create `quest-master/src/app/services/hint-system.service.ts` — injectable with `hintCosts: Signal<{level, percent, minXP}[]>`
- [ ] T016 Add `canRequestHint(failedQuestsThisSession)` to `HintSystemService`
- [ ] T017 Add `calculateHintCost(baseXP, level)` to `HintSystemService` (apply percentage, clamp to 5 XP minimum)
- [ ] T018 Add `applyHintCost(baseXP, level)` to return effective XP after cost
- [ ] T019 Add `generateHint(quest, level)` to return level-appropriate hint content
- [ ] T020 Write unit tests for `HintSystemService` — verify all 3 hint levels produce correct costs and content

### ComboService

- [ ] T021 Create `quest-master/src/app/services/combo.service.ts` — injectable with `streak: Signal<number>` and `multiplier: Signal<1|2|3>`
- [ ] T022 Add `increment()` method to `ComboService` (streak += 1, update multiplier)
- [ ] T023 Add `reset()` method to `ComboService` (streak = 0, multiplier = 1)
- [ ] T024 Add `getXPMultiplier()` to return current multiplier value
- [ ] T025 Add `applyCombo(baseXP)` to apply multiplier to XP
- [ ] T026 Write unit tests for `ComboService` — verify 1x at 1–2, 2x at 3–4, 3x at 5+, reset behavior

### GameStateService Extensions

- [ ] T027 Add `comboStreak()` computed signal to `GameStateService`
- [ ] T028 Add `unlockedThemes()` computed signal to `GameStateService`
- [ ] T029 Add `unlockTheme(theme: UnlockedTheme)` method to `GameStateService`
- [ ] T030 Add `isThemeUnlocked(subBranchName: string)` method to `GameStateService`
- [ ] T031 Update `resetProgress()` in `GameStateService` to preserve `unlockedThemes` from localStorage (not reset on "Reset All Progress")
- [ ] T032 Write unit tests for `GameStateService` theme unlock methods

**Checkpoint**: All new services are injectable, all unit tests pass, data model complete.

---

## Phase 3: Boss Quest Integration (User Story 1 — Priority: P1) 🎯 MVP

**Goal**: Boss Quests appear at sub-branch climax with special victory handling.

### Tests for User Story 1

- [ ] T033 [P] [US1] Add E2E test for Boss Quest identification in `quest-master/e2e/quests.spec.ts` — verify Boss Quest mark, completion flow, theme unlock, next sub-branch advancement

### Implementation for User Story 1

- [ ] T034 [US1] Add Boss Quest identification logic to `quest-master/src/app/services/quest-engine.service.ts` — in `generateNextQuest()`, set `questMeta.isBossQuest = this.bossQuest.shouldBeBossQuest(...)`
- [ ] T035 [US1] Create `quest-master/src/app/components/boss-quest-victory/boss-quest-victory.component.ts` — standalone component with victory message and score display
- [ ] T036 [US1] Create `quest-master/src/app/components/boss-quest-victory/boss-quest-victory.component.html` — modal overlay with Boss Quest branding
- [ ] T037 [US1] Create `quest-master/src/app/components/boss-quest-victory/boss-quest-victory.component.scss` — modal styles consistent with existing modals
- [ ] T038 [US1] Integrate Boss Quest detection into `quest-master/src/app/services/quest-engine.service.ts` — in quest completion flow, check `quest.meta.isBossQuest` and show victory modal
- [ ] T039 [US1] Add theme unlock logic to `quest-master/src/app/services/quest-engine.service.ts` — on Boss Quest success, call `gameState.unlockTheme()`
- [ ] T040 [US1] Add sub-branch reset logic to `quest-engine.service.ts` — on Boss Quest success, reset `questsCompletedInCurrentSubBranch` and advance to next sub-branch

**Checkpoint**: US1 fully functional — Boss Quest marked at sub-branch end, victory modal appears, theme unlocks, next sub-branch begins.

---

## Phase 4: Hint System (User Story 2 — Priority: P1) 🎯 MVP

**Goal**: Hint system with XP costs available after failure.

### Tests for User Story 2

- [ ] T041 [P] [US2] Add E2E test for hint request flow in `quest-master/e2e/quests.spec.ts` — verify hint modal appears after fail, costs deducted, hint content shown, XP reduced

### Implementation for User Story 2

- [ ] T042 [US2] Create `quest-master/src/app/components/hint-modal/hint-modal.component.ts` — standalone component with three-level selector
- [ ] T043 [US2] Create `quest-master/src/app/components/hint-modal/hint-modal.component.html` — modal with three hint levels and cost indicators
- [ ] T044 [US2] Create `quest-master/src/app/components/hint-modal/hint-modal.component.scss` — modal styles
- [ ] T045 [US2] Integrate hint request button into failure modal in `quest-master/src/app/components/quest-view/quest-view.component.ts` — show hint button when `hintSystem.canRequestHint()` is true
- [ ] T046 [US2] Add hint modal trigger to `quest-view.component.ts` — on hint button click, open hint modal
- [ ] T047 [US2] Add hint cost deduction to `quest-engine.service.ts` — on hint selection, deduct XP before revealing hint
- [ ] T048 [US2] Add hint content display to `quest-view.component.ts` — show hint content in quest editor area after request
- [ ] T049 [US2] Write E2E test for hint application — verify XP deduction matches percentage calculation

**Checkpoint**: US2 fully functional — hint modal opens after failure, three levels available, XP deducted correctly, hint content displayed.

---

## Phase 5: Combo Multiplier (User Story 4 — Priority: P3)

**Goal**: Combo streak tracking and 2x/3x XP multiplier.

### Tests for User Story 4

- [ ] T050 [P] [US4] Add unit test extension to `quest-master/src/app/services/quest-engine.service.spec.ts` — verify combo increment on success, reset on failure, multiplier calculation

### Implementation for User Story 4

- [ ] T051 [US4] Add combo indicator display to `quest-master/src/app/components/quest-view/quest-view.component.ts` — read `combo.multiplier()` and show indicator when > 1
- [ ] T052 [US4] Add `quest-master/src/app/components/combo-indicator/combo-indicator.component.ts` — floating badge component
- [ ] T053 [US4] Add `quest-master/src/app/components/combo-indicator/combo-indicator.component.html` — small badge with "Combo xN" text
- [ ] T054 [US4] Add XP multiplier application to `quest-engine.service.ts` — on quest completion, apply `combo.applyCombo()` before calling `gameState.addXP()`
- [ ] T055 [US4] Add combo reset logic on failure to `quest-engine.service.ts` — on quest failure, call `combo.reset()`
- [ ] T056 [US4] Verify Boss Quest failure does NOT reset combo (edge case)

**Checkpoint**: US4 fully functional — combo indicator shows on streak >= 3, 2x at 3–4, 3x at 5+, reset on normal fail, persists through Boss fail.

---

## Phase 6: Unlockable Themes (User Story 3 — Priority: P2)

**Goal**: Theme unlocking and selection in Settings.

### Tests for User Story 3

- [ ] T057 [P] [US3] Add E2E test for theme unlock and application in `quest-master/e2e/quests.spec.ts` — verify theme unlocks on Boss completion, appears in Settings, can be selected and applied

### Implementation for User Story 3

- [ ] T058 [US3] Extend `SettingsModalComponent` to add "Editor Theme" section — dropdown showing unlocked themes
- [ ] T059 [US3] Add theme selector to `settings-modal.component.html` — dropdown with theme options and preview colors
- [ ] T060 [US3] Add theme selection logic to `settings-modal.component.ts` — on theme change, call `gameState.updateSelectedTheme()`
- [ ] T061 [US3] Add `updateSelectedTheme()` method to `GameStateService`
- [ ] T062 [US3] Create `quest-master/src/app/services/theme.service.ts` — manages Monaco editor theme application
- [ ] T063 [US3] Integrate theme application into Monaco editor in `quest-view.component.ts` — apply selected theme on quest load
- [ ] T064 [US3] Add theme preview to Settings modal — color swatch matching theme color
- [ ] T065 [US3] Verify theme persistence across reload — reload app, selected theme persists
- [ ] T066 [US3] Verify theme persistence across Reset All Progress — unlocked themes remain, combo resets

**Checkpoint**: US3 fully functional — Boss Quest unlocks theme, theme appears in Settings, can be selected, applies to editor, persists.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T067 [P] Add all new components to Angular declaration/import list in `quest-master/src/app/app.config.ts`
- [ ] T068 [P] Add all new services to `quest-master/src/app/app.config.ts` providers if not using `providedIn: 'root'`
- [ ] T069 [P] Verify hint cost calculation adapts to effective difficulty tier (D-P4-08 — hints for master-tier quests cost more XP, but same percentage)
- [ ] T070 [P] Verify Boss Quest XP reward is bumped (1.5x base) — add to quest generation
- [ ] T071 [P] Run `ng build` in `quest-master/` — must produce zero errors
- [ ] T072 [P] Run `npm test` in `quest-master/` — all Vitest tests pass including new service suites
- [ ] T073 [P] Run `npm run test:e2e` in `quest-master/` — Playwright E2E suite passes including US1, US2, US3, US4 tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Services)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with US1
- **Phase 5 (US4)**: Depends on Phase 2; independent of US1/US2
- **Phase 6 (US3)**: Depends on Phase 2; independent of other user stories
- **Phase 7 (Polish)**: Depends on all user stories complete

### Parallel Opportunities

```bash
# Phase 1 — sequential (same file changes)
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009

# Phase 2 — services can be built in parallel
T010-T014 [BossQuestService] || T015-T020 [HintSystemService] || T021-T026 [ComboService] || T027-T032 [GameStateService]

# Once Phase 2 done, user stories can start
Phase 3 (US1) || Phase 4 (US2) || Phase 5 (US4) || Phase 6 (US3)

# Within US3:
T058, T059 [P] → T060, T061 → T062, T063 → T064, T065, T066

# Phase 7 — all checks parallel
T067-T073 [P]
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only — Both P1)

1. Complete Phase 1: Data model types and defaults
2. Complete Phase 2: All new services + GameStateService extensions
3. **STOP**: Run unit tests — all service tests must pass
4. Complete Phase 3 (US1): Boss Quest identification and completion flow
5. Complete Phase 4 (US2): Hint request and XP deduction
6. **STOP AND VALIDATE**:
   - Clear localStorage → complete sub-branch → Boss Quest appears → victory modal shows → theme unlocks → next sub-branch starts
   - Complete quest → fail → hint request → 3 levels show → deduct XP → hint appears
7. Demo/review — US3, US4 can follow in separate sessions

### Incremental Delivery

1. Phase 1 + 2 → foundation ready
2. Phase 3 (US1) → Boss Quest flow working ← **first shippable increment**
3. Phase 4 (US2) → Hint system working ← **second shippable increment**
4. Phase 5 (US4) → Combo multiplier working ← **third shippable increment**
5. Phase 6 (US3) → Theme unlocking working ← **fourth shippable increment**

---

## Notes

- T009 (unit tests for data model) MUST be written before T001-T008 are implemented (TDD pattern)
- T033, T041, T050, T057 (E2E/unit test stubs) MUST be written before their corresponding implementation tasks
- Combo streak resets on normal fail but NOT on Boss fail — verify this behavior
- Hint costs use percentage of quest XP reward, clamped to 5 XP minimum (D-P4-07)
- Themes persist across Reset All Progress (legacy unlocks) — use separate localStorage key
