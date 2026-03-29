# Research: Enhanced Gamification

**Branch**: `019-enhanced-gamification` | **Date**: 2026-03-29

## Existing Codebase Analysis

### Quest Generation — Current State

`QuestEngineService.generateNextQuest()` (quest-engine.service.ts):

Current flow:
1. Get current branch and progress
2. Determine effective tier (from GameStateService or DifficultyService)
3. Determine quest category (from GameStateService.questCategory computed)
4. Call `ClaudeApiService.generateQuest()` with parameters

**Decision**: Add Boss Quest detection before quest generation.
Boss Quest = `questsCompletedInCurrentSubBranch === minQuestsToAdvance - 1`

### Existing Services

**GameStateService** (game-state.service.ts):
- `xp()`: Computed signal tracking player XP
- `level()`: Computed signal based on XP
- `currentBranch()`: Current branch string
- `questCountForBranch(branch)`: Returns number of quests completed in branch
- `addXP(xp: number)`: Adds XP to game state
- `resetProgress()`: Resets all state, preserves settings

**ClaudeApiService** (claude-api.service.ts):
- `generateQuest(completedQuests, coveredConcepts, currentBranch, effectiveTier, apiKey, questType, questCategory)`

**QuestEngineService** (quest-engine.service.ts):
- `generateNextQuest()`: Generates next quest based on state
- `calculateXP(quest, evaluation)`: Calculates XP from quest completion

### Existing Components

**QuestViewComponent** (quest-view.component.ts):
- Displays quest content in Monaco editor
- Shows evaluation/result after submission
- Tracks `failedQuestsThisSession` for recalibration nudge

**SettingsModalComponent** (settings-modal.component.ts):
- Player name, IRIS connection, API key, daily goal settings
- Reset All Progress in Danger Zone

### Boss Quest Location in BRANCH_PROGRESSION

From game-state.models.ts:

```ts
export const BRANCH_PROGRESSION: BranchProgression[] = [
  { branch: 'setup', minQuestsToAdvance: 3 },
  { branch: 'commands', minQuestsToAdvance: 5 },
  { branch: 'globals', minQuestsToAdvance: 5 },
  { branch: 'classes-properties', minQuestsToAdvance: 4 },
  { branch: 'classes-methods', minQuestsToAdvance: 4 },
  { branch: 'classes-inheritance', minQuestsToAdvance: 4 },
  { branch: 'classes-relationships', minQuestsToAdvance: 4 },
  { branch: 'sql-queries', minQuestsToAdvance: 3 },
  { branch: 'sql-joins', minQuestsToAdvance: 3 },
  { branch: 'sql-aggregation', minQuestsToAdvance: 3 },
  { branch: 'sql-embedded', minQuestsToAdvance: 3 },
  { branch: 'capstone', minQuestsToAdvance: null },
];
```

**Decision**: Boss Quest is the quest where `questCountForBranch(subBranch) === minQuestsToAdvance - 1`.

### Combo Tracking — Existing Pattern

`QuestEngineService` already has:
```ts
private consecutiveLowScores = 0;
readonly suggestDifficultyAdjustment = signal(false);
```

**Decision**: Add `successStreak` counter following same pattern.

### Hint System Integration Point

No existing hint system.

**Decision**: New `HintSystemService` with percentage-based costs.

### Theme System — Existing Capabilities

Monaco editor supports theming via `editor.setTheme()`.

**Decision**: Store unlocked themes in localStorage under `helloiris_unlocked_themes`.

### XP Calculation — Current State

From `xp-table.ts`:
- Level 1–5: Apprentice
- Level 6–12: Journeyman
- Level 13–15: Master

Quest XP varies by difficulty tier and branch complexity.

### Prestige Level → Quest Category

Already implemented (D-P4-09):
```ts
readonly questCategory = computed((): 'write' | 'debug' | 'optimize' => {
  const p = this.state().prestigeLevel;
  if (p >= 2) return 'optimize';
  if (p === 1) return 'debug';
  return 'write';
});
```

Boss Quests should receive 1.5x base XP, 2.0x on Prestige runs.

### Boss Quest Score Multiplier

**Decision**: Boss Quests award 1.5x base XP. On Prestige runs (prestigeLevel >= 1), award 2.0x base XP.

### Hint Cost Model

From D-P4-07:
- Level 1: 10% of quest XP reward, minimum 5 XP
- Level 2: 25% of quest XP reward, minimum 5 XP
- Level 3: 50% of quest XP reward, minimum 5 XP

Minimum 5 XP ensures cost is always perceptible.

### Theme Storage Strategy

**Decision**: Use separate localStorage key for unlocked themes:
- `helloiris_gamestate` — resets on Reset All Progress
- `helloiris_unlocked_themes` — persists (array of `UnlockedTheme`)

This maintains legacy unlocks and provides motivation for return visitors.

## Decisions Confirmed

| Decision | Source | Status |
|---|---|---|
| Boss Quest = last quest in sub-branch | D-P4-06 | ✅ Confirmed |
| Boss Quest 1.5x XP, 2.0x on Prestige | D-P4-06 | ✅ Confirmed |
| Hint costs: 10%/25%/50% with 5 XP min | D-P4-07 | ✅ Confirmed |
| Combo: 2x at 3–4, 3x at 5+ | Q6 analysis | ✅ Confirmed |
| Combo resets on fail, NOT Boss fail | Q6 analysis | ✅ Confirmed |
| Themes unlock on sub-branch completion | D-P4-06 | ✅ Confirmed |
| Themes persist across Reset All Progress | Q6 analysis | ✅ Confirmed |
| Hint system requires at least 1 failure | D-P4-06 | ✅ Confirmed |

## No NEEDS CLARIFICATION Items

All technical decisions are covered by D-P4-06, D-P4-07, and Q6 analyses.
