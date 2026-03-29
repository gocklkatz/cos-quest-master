# Data Model: Enhanced Gamification

**Branch**: `019-enhanced-gamification` | **Date**: 2026-03-29

## New Types

### `HintLevel`

```ts
// game-state.models.ts
export type HintLevel = 'none' | 'level1' | 'level2' | 'level3';
```

### `UnlockedTheme`

```ts
// game-state.models.ts
export interface UnlockedTheme {
  subBranchName: string;
  themeName: string;
  themeColor: string;          // Hex color for Monaco editor theme
  unlockDate: string;          // ISO timestamp
}
```

### `QuestMeta`

```ts
// game-state.models.ts
export interface QuestMeta {
  isBossQuest: boolean;
  hintLevel: HintLevel;
  comboMultiplier: 1 | 2 | 3;
  themeUnlockedOnCompletion: string | null; // sub-branch name
}
```

## Modified: `GameState`

### Per-Quest Gamification State

Add `meta: QuestMeta` to `Quest` interface:

```ts
// quest.models.ts — additions
meta: QuestMeta;  // gamification metadata for this specific quest
```

### Session State

Add fields to `GameState` interface:

```ts
// game-state.models.ts — additions
comboStreak: number;              // consecutive success count
unlockedThemes: UnlockedTheme[];  // themes unlocked across session
```

### Default Values

```ts
// DEFAULT_GAME_STATE additions
comboStreak: 0,
unlockedThemes: [],
```

### Persistence

- `comboStreak`: Reset to 0 on page reload (session-only, per specification).
- `unlockedThemes`: Stored in `localStorage` separately under key `helloiris_unlocked_themes`.
  Persisted across Reset All Progress to maintain legacy unlocks.

## New Services

### `BossQuestService`

**File**: `quest-master/src/app/services/boss-quest.service.ts`

```ts
import { Injectable, signal } from '@angular/core';
import { Signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BossQuestService {
  // Computed signals (all synchronous)
  readonly currentIsBossQuest: Signal<boolean>;
  readonly bossQuestRewardMultiplier: Signal<number>;

  /**
   * Check if next quest should be Boss based on sub-branch progress.
   * Boss Quest = last quest in sub-branch (where progress == minQuests - 1).
   */
  shouldBeBossQuest(
    currentSubBranch: string,
    questsCompletedInSubBranch: number,
    minQuestsToAdvance: number | null
  ): boolean;

  /**
   * Get Boss Quest-specific prompt instruction.
   * Used in ClaudeApiService.generateQuest().
   */
  getBossQuestInstruction(): string;

  /**
   * Get Boss Quest-specific score multiplier.
   * Boss Quests award 1.5x base XP; 2x on Prestige runs.
   */
  getScoreMultiplier(prestigeLevel: number): number;
}
```

**Validation Rules**:
- `shouldBeBossQuest()` MUST return `true` when `questsCompletedInSubBranch === minQuestsToAdvance - 1`
- `bossQuestRewardMultiplier` MUST return `1.5` (standard) or `2.0` (Prestige run)
- `getBossQuestInstruction()` MUST return: "This is a Boss Quest — synthesize all concepts from
  this sub-branch into a single comprehensive challenge."

---

### `HintSystemService`

**File**: `quest-master/src/app/services/hint-system.service.ts`

```ts
import { Injectable, signal } from '@angular/core';
import { Signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HintSystemService {
  // Computed signals
  readonly hintCosts: Signal<{ level: HintLevel; percent: number; minXP: number }[]>;
  readonly canRequest: Signal<boolean>;  // requires at least 1 failure this session

  /**
   * Check if player qualifies for hints (requires failed quest this session).
   */
  canRequestHint(failedQuestsThisSession: number): boolean;

  /**
   * Calculate hint cost as percentage of quest XP reward.
   * Minimum cost clamped to 5 XP.
   */
  calculateHintCost(baseXP: number, level: HintLevel): number;

  /**
   * Deduct hint cost and return effective XP reward.
   */
  applyHintCost(baseXP: number, level: HintLevel): number;

  /**
   * Generate hint content based on level.
   * Level 1: Conceptual guidance
   * Level 2: Code structure guidance
   * Level 3: Partial code solution
   */
  generateHint(quest: Quest, level: HintLevel): string;
}
```

**Hint Cost Values** (from D-P4-07):
- Level 1: 10% of XP reward, minimum 5 XP
- Level 2: 25% of XP reward, minimum 5 XP
- Level 3: 50% of XP reward, minimum 5 XP

**Validation Rules**:
- `canRequestHint()` MUST return `false` if `failedQuestsThisSession === 0`
- `calculateHintCost()` MUST apply percentage, then clamp to minimum 5 XP
- `applyHintCost()` MUST return `baseXP - hintCost`
- `generateHint()` MUST return level-appropriate guidance

---

### `ComboService`

**File**: `quest-master/src/app/services/combo.service.ts`

```ts
import { Injectable, signal } from '@angular/core';
import { Signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ComboService {
  // Computed signals
  readonly streak: Signal<number>;        // consecutive success count
  readonly multiplier: Signal<1 | 2 | 3>; // applied XP multiplier

  /**
   * Increment streak on successful quest completion.
   * Reset streak to 0 if it reaches a threshold for reset.
   */
  increment(): void;

  /**
   * Reset streak on quest failure (except Boss Quest failure).
   */
  reset(): void;

  /**
   * Get current XP multiplier based on streak.
   * 1–2: 1x (default)
   * 3–4: 2x
   * 5+: 3x
   */
  getXPMultiplier(): number;

  /**
   * Apply combo effect to quest XP reward.
   */
  applyCombo(baseXP: number): number;
}
```

**Validation Rules**:
- `streak` MUST be 0 after any failure (except Boss fail)
- `streak` MUST increment by 1 on each success
- `multiplier` MUST be `1` when `streak < 3`, `2` when `3 <= streak < 5`, `3` when `streak >= 5`

---

## Modified: `GameStateService`

### New Methods

```ts
// Add theme unlock tracking
unlockTheme(theme: UnlockedTheme): void;

// Check if theme is unlocked
isThemeUnlocked(subBranchName: string): boolean;

// Get all unlocked themes
getAllUnlockedThemes(): UnlockedTheme[];

// Get unlocked themes for a specific branch (for UI)
getUnlockedThemesForBranch(branchName: string): UnlockedTheme[];
```

### Modified Methods

**`resetProgress()`** must:
- Reset `comboStreak` to 0
- Clear `unlockedThemes` array
- **BUT**: Preserve `unlockedThemes` in localStorage for legacy status

**Note**: To preserve unlocks across Reset, store them in a separate localStorage key:
- `helloiris_gamestate` — resets on Reset All Progress
- `helloiris_unlocked_themes` — persists (array of `UnlockedTheme`)

---

## Modified: `QuestEngineService`

### Quest Meta Initialization

In `generateNextQuest()`, initialize quest meta:

```ts
const questMeta: QuestMeta = {
  isBossQuest: this.bossQuest.shouldBeBossQuest(
    gameState.currentBranch(),
    gameState.questsCompletedInCurrentSubBranch(),
    gameState.minQuestsToAdvance()
  ),
  hintLevel: 'none',
  comboMultiplier: this.combo.multiplier(),
  themeUnlockedOnCompletion: this.bossQuest.shouldBeBossQuest(...) ? gameState.currentBranch() : null,
};
```

### XP Calculation with Combo

```ts
// On quest completion (success)
const baseXP = this.xpTable.getXPForQuest(quest);
const comboXP = this.combo.applyCombo(baseXP);
this.gameState.addXP(comboXP);
```

### Hint Cost Application

```ts
// On hint request
const hintCost = this.hintSystem.calculateHintCost(baseXP, level);
this.gameState.deductXP(hintCost);
quest.meta.hintLevel = level;
```

## State Transitions

### Boss Quest Progression

```
Player completes quest N in sub-branch
  ↓ questsCompletedInSubBranch++ ( GameStateService )
  ↓ QuestEngineService checks: shouldBossQuest = (progress == minQuests - 1)
  ↓ If true: next quest is Boss Quest
  ↓ If false: next quest is standard
  ↓ On Boss Quest success:
    ↓ Unlock sub-branch theme (if not already)
    ↓ Reset questsCompletedInCurrentSubBranch to 0
    ↓ Advance to next sub-branch in BRANCH_PROGRESSION
```

### Hint System Flow

```
Player fails quest
  ↓ QuestEngineService tracks: failedThisSession++
  ↓ Next quest generation or quest view shows "Request Hint" button
  ↓ Player clicks hint request
  ↓ HintModalComponent opens with three levels
  ↓ Player selects level
  ↓ HintSystemService.calculateHintCost() computes cost
  ↓ GameStateService.deductXP(cost) called
  ↓ Hint content revealed in QuestViewComponent
  ↓ Quest continues with hint visible
```

### Combo Multiplier Flow

```
Player completes quest successfully
  ↓ ComboService.increment()
    ↓ streak = previousStreak + 1
    ↓ if streak >= 5: multiplier = 3
    ↓ else if streak >= 3: multiplier = 2
    ↓ else: multiplier = 1
  ↓ QuestEngineService applies combo: baseXP * multiplier
  ↓ GameStateService.addXP(comboXP)

Player fails quest (non-Boss)
  ↓ ComboService.reset()
    ↓ streak = 0
    ↓ multiplier = 1
```
