# Research: Adaptive Difficulty

**Branch**: `018-adaptive-difficulty` | **Date**: 2026-03-29

## Existing Codebase Analysis

### Tier Calculation — Current State

`GameStateService.currentEffectiveTier()` (game-state.service.ts, ~line 175):

```ts
currentEffectiveTier(): QuestTier {
  const xp = this.xp();
  if (calcLevel(xp) >= 13) return 'master';
  if (calcLevel(xp) >= 6) return 'journeyman';
  return 'apprentice';
}
// TODO(F18): replace with DifficultyService.effectiveTier()
```

`QuestEngineService.generateNextQuest()` has a duplicate inline version (~line 282):

```ts
const effectiveTier: QuestTier = calcLevel(this.gameState.xp()) >= 13
  ? 'master'
  : calcLevel(this.gameState.xp()) >= 6
    ? 'journeyman'
    : 'apprentice';
```

**Decision**: Replace both with `DifficultyService.effectiveTier()`. The `TODO(F18)` confirms
this was the intended architecture. `GameStateService.currentEffectiveTier()` can be removed
(no other callers found).

### `ClaudeApiService.generateQuest()` — Parameters Already in Place

```ts
async generateQuest(
  completedQuests: string[],
  coveredConcepts: string[],
  currentBranch: string,
  effectiveTier: QuestTier,         // ← already present
  apiKey: string,
  questType: 'standard' | 'prediction' = 'standard',
  questCategory: 'write' | 'debug' | 'optimize' = 'write'  // ← already present (D-P4-09)
): Promise<Quest>
```

`effectiveTier` is already threaded through to the Claude system prompt as
`Their current tier is: ${effectiveTier}`. No prompt changes needed for this feature — the
mechanism is already in place.

### `BRANCH_PROGRESSION` — Sub-branches Present (C5 ✅)

```ts
[
  { branch: 'setup',                 minQuestsToAdvance: 3 },
  { branch: 'commands',              minQuestsToAdvance: 5 },
  { branch: 'globals',               minQuestsToAdvance: 5 },
  { branch: 'classes-properties',    minQuestsToAdvance: 4 },
  { branch: 'classes-methods',       minQuestsToAdvance: 4 },
  { branch: 'classes-inheritance',   minQuestsToAdvance: 4 },
  { branch: 'classes-relationships', minQuestsToAdvance: 4 },
  { branch: 'sql-queries',           minQuestsToAdvance: 3 },
  { branch: 'sql-joins',             minQuestsToAdvance: 3 },
  { branch: 'sql-aggregation',       minQuestsToAdvance: 3 },
  { branch: 'sql-embedded',          minQuestsToAdvance: 3 },
  { branch: 'capstone',              minQuestsToAdvance: null },
]
```

`DifficultyService.initialSubBranch` maps difficulty to a branch string and
`QuestEngineService` sets `currentBranch` to that value during first-run initialization.

### XP Level Thresholds

From `xp-table.ts`:

| Level | XP Required |
|-------|-------------|
| 1     | 0           |
| 6     | 500         |
| 13    | 3700        |
| 15    | 5000        |

Tier boundaries: L1–5 = apprentice, L6–12 = journeyman, L13–15 = master.

With `difficultyPreference = 'intermediate'`, the floor is journeyman (player never receives
apprentice quests, even at level 1).
With `difficultyPreference = 'advanced'`, always master.

### SettingsModalComponent — Current Form Fields

- Player name (text input)
- IRIS connection (baseUrl, namespace, username, password)
- Anthropic API Key
- Daily goal (minutes)
- Danger zone (Reset All Progress)

F18 adds a "Learning Difficulty" segmented control below Daily goal, before the Danger zone.

### `GameState.prestigeLevel` → `questCategory` mapping

Already implemented in `GameStateService` as a `computed` signal (D-P4-09):

```ts
readonly questCategory = computed((): 'write' | 'debug' | 'optimize' => {
  const p = this.state().prestigeLevel;
  if (p >= 2) return 'optimize';
  if (p === 1) return 'debug';
  return 'write';
});
```

This is orthogonal to `effectiveTier` and is already passed to `ClaudeApiService.generateQuest()`.
No changes required for this signal.

## Decisions Confirmed

| Decision | Source | Status |
|---|---|---|
| Manual toggle (Beginner/Intermediate/Advanced) as primary | D-P4-03 | ✅ Confirmed |
| Advanced secondary question (OOP vs SQL) | D-P4-08 | ✅ Confirmed |
| Entry sub-branches per difficulty | D-P4-08 | ✅ Confirmed |
| effectiveTier and questCategory as separate parameters | D-P4-09 | ✅ Already implemented |
| No score-based automatic adjustment | D-P4-03 | ✅ Out of scope for F18 |
| Two-consecutive-low-score nudge, in-memory only | Q3 analysis | ✅ Confirmed |
| "Low score" threshold = score < 70 | Q3 analysis (implementation note) | ✅ Confirmed |
