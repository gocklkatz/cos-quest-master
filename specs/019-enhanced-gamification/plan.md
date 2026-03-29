# Implementation Plan: Enhanced Gamification

**Branch**: `019-enhanced-gamification` | **Date**: 2026-03-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-enhanced-gamification/spec.md`

## Summary

Implement three engagement mechanics from the Q6 analysis:
1. **Boss Quests** — one per sub-branch, serving as climax with special scoring and progression.
2. **Hint System** — percentage-based XP costs (L1=10%, L2=25%, L3=50%) with minimum 5 XP clamp.
3. **Unlockable Cosmetics** — branch-themed editor themes unlockable on sub-branch completion.
4. **Combo Bonus XP** — 2x at streak=3–4, 3x at streak=5+ (resets on fail, persists on Boss fail).

**Technical approach**: Add new services and components; extend existing services with gamification
state; modify quest generation to mark Boss Quests; integrate Monaco theming.

## Technical Context

**Language/Version**: TypeScript 5.x / Angular 21.1 (standalone, zoneless, signals)
**Primary Dependencies**: Angular signals, GameStateService, QuestEngineService, ClaudeApiService
**Storage**: `localStorage` via GameStateService
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Browser SPA
**Project Type**: Web application — Angular frontend only
**Performance Goals**: No new latency; all computed signals synchronous
**Constraints**: No new npm packages; bundle ≤1MB

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Signal-First Reactivity | ✅ Pass | All new state uses `signal()` and `computed()` |
| II. Graceful Degradation | ✅ Pass | Missing features don't break core flow |
| III. Test Coverage Standards | ✅ Pass | All new services have unit tests; E2E for UI |
| IV. UX Consistency | ✅ Pass | Modal/dialog patterns match existing components |
| V. Security & Data Locality | ✅ Pass | All data in localStorage, no external calls |
| VI. Simplicity & Minimal Dependencies | ✅ Pass | New services only; no external libs |
| VII. ObjectScript Execution Integrity | N/A | No IRIS backend changes |

**No violations. Gate passed.**

## Project Structure

### Documentation

```text
specs/019-enhanced-gamification/
├── spec.md              # This feature's specification
├── plan.md              # This file
├── research.md          # Phase 0 — existing codebase analysis
├── data-model.md        # Phase 1 — new fields and service contracts
└── tasks.md             # Phase 2 — /speckit.tasks output
```

### Source Code

```text
quest-master/src/app/
├── models/
│   └── game-state.models.ts          # Add BossQuest, ComboMultiplier, UnlockedTheme types
├── services/
│   ├── boss-quest.service.ts         # NEW — identifies and scores Boss Quests
│   ├── hint-system.service.ts        # NEW — manages hint levels and XP deductions
│   ├── combo-service.ts              # NEW — tracks streak and applies multipliers
│   ├── game-state.service.ts         # Add unlockTheme(), isThemeUnlocked() methods
│   └── quest-engine.service.ts       # Mark Boss Quests; add combo indicator; hint integration
├── components/
│   ├── settings-modal/
│   │   ├── settings-modal.component.ts   # Add theme selector
│   │   └── settings-modal.component.html # Theme dropdown
│   ├── boss-quest-victory/           # NEW — Boss Quest success modal
│   │   ├── boss-quest-victory.component.ts
│   │   └── boss-quest-victory.component.html
│   ├── hint-modal/                   # NEW — hint request modal
│   │   ├── hint-modal.component.ts
│   │   └── hint-modal.component.html
│   └── combo-indicator/              # NEW — floating combo multiplier badge
│       ├── combo-indicator.component.ts
│       └── combo-indicator.component.html
└── spec/
    ├── boss-quest.service.spec.ts    # NEW
    ├── hint-system.service.spec.ts   # NEW
    ├── combo-service.spec.ts         # NEW
    └── quest-engine.service.spec.ts  # Extend existing suite
```

## Phase 0: Research

*Findings from codebase analysis — all unknowns resolved.*

### Quest Engine Current State

`QuestEngineService.generateNextQuest()` determines quest type and generates quest body.

Current quest types: `standard`, `prediction`

**Decision**: Add `isBossQuest: boolean` flag derived from sub-branch progress tracking.

### Existing Services

- `GameStateService`: XP, levels, branch progress — already has streak tracking.
- `ClaudeApiService`: Quest generation with `questCategory` and `effectiveTier`.
- `TimeTrackingService`: Not needed — streak is quest count, not time-based.

### Existing Components

- `QuestViewComponent`: Already displays quest content and evaluation.
- `SettingsModalComponent`: Already handles settings persistence.
- `BossQuestVictoryComponent`: NEW — similar to `VictoryScreenComponent`.
- `HintModalComponent`: NEW — modal overlay like `DifficultyPromptComponent`.

### Boss Quest Identification

Boss Quest = last quest in sub-branch (where `minQuestsToAdvance` is satisfied).

With C5 completed:
- `classes-methods`: quest 4 is Boss
- `classes-inheritance`: quest 4 is Boss
- etc.

**Decision**: Track `questsCompletedInCurrentSubBranch` in GameState; when it equals
`minQuestsToAdvance - 1`, next quest is Boss.

### Hint System Integration Point

`QuestEngineService` already tracks `consecutiveLowScores` for recalibration nudge.

**Decision**: Add `hintLevel` field to per-quest state; deduct XP on hint selection.

### Combo Multiplier Implementation

`QuestEngineService` already has `consecutiveLowScores` pattern.

**Decision**: Add `successStreak` counter; apply multiplier at completion.

### Theme Storage

Themes should persist across Reset All Progress (legacy unlocks).

**Decision**: Store unlocked themes in a separate localStorage key (e.g., `helloiris_unlocked_themes`).

## Phase 1: Design

### Data Model

**New types:**

```ts
// game-state.models.ts
export type HintLevel = 'none' | 'level1' | 'level2' | 'level3';

export interface QuestMeta {
  isBossQuest: boolean;
  hintLevel: HintLevel;
  comboMultiplier: 1 | 2 | 3;
  themeUnlockedOnCompletion: string | null; // sub-branch name
}

export type UnlockedTheme = {
  subBranchName: string;
  themeName: string;
  themeColor: string;
  unlockDate: string;
};
```

**GameState additions:**

```ts
// Per-quest gamification state
meta: QuestMeta;

// Per-session combo streak
comboStreak: number;

// Unlocked themes (preserved across reset)
unlockedThemes: UnlockedTheme[];
```

### New Services

**`BossQuestService`** (`quest-master/src/app/services/boss-quest.service.ts`):

```ts
@Injectable({ providedIn: 'root' })
export class BossQuestService {
  readonly currentIsBossQuest: Signal<boolean>;
  readonly bossQuestRewardMultiplier: Signal<number>; // 2x for prestige runs

  // Identify if next quest should be Boss
  shouldBeBossQuest(currentSubBranch: string, progress: number, minQuests: number): boolean;

  // Generate Boss Quest-specific prompt instruction
  getBossQuestInstruction(): string;
}
```

**`HintSystemService`** (`quest-master/src/app/services/hint-system.service.ts`):

```ts
@Injectable({ providedIn: 'root' })
export class HintSystemService {
  readonly hintCost: Signal<{ level: HintLevel; percent: number; minXP: number }>;

  // Check if player qualifies for hints
  canRequestHint(failedQuestsThisSession: number): boolean;

  // Deduct hint cost and return effective XP
  applyHintCost(baseXP: number, level: HintLevel): number;

  // Hint content generation
  generateHint(quest: Quest, level: HintLevel): string;
}
```

**`ComboService`** (`quest-master/src/app/services/combo.service.ts`):

```ts
@Injectable({ providedIn: 'root' })
export class ComboService {
  readonly streak: Signal<number>;
  readonly multiplier: Signal<1 | 2 | 3>;

  increment(): void;     // On successful quest
  reset(): void;         // On failure (except Boss fail)
  getXPMultiplier(): number;
}
```

### Modified Services

**GameStateService additions:**

```ts
unlockTheme(theme: UnlockedTheme): void;
isThemeUnlocked(subBranchName: string): boolean;
resetProgress(): void;   // Clear comboStreak but preserve unlockedThemes
```

**QuestEngineService modifications:**

```ts
// In generateNextQuest():
- Mark quest as Boss if BossQuestService.shouldBeBossQuest()
- Add combo indicator if comboService.multiplier() > 1
- Initialize hintLevel: 'none' in QuestMeta

// On quest completion:
- If success: comboService.increment()
- If failure: comboService.reset()
- Apply XP multiplier from comboService
```

## Phase 2: Implementation Phases

### Phase 1: Data Model & Core Services (Week 1)

- Add types to `game-state.models.ts`
- Create `BossQuestService`, `HintSystemService`, `ComboService`
- Extend `GameStateService` with theme unlock methods
- Write unit tests for all new services

### Phase 2: Boss Quest Integration (Week 1)

- Modify `QuestEngineService.generateNextQuest()` to mark Boss Quests
- Create `BossQuestVictoryComponent` for success modal
- Modify `QuestViewComponent` to show Boss Quest status
- Write E2E for Boss Quest completion flow

### Phase 3: Hint System (Week 2)

- Create `HintModalComponent` with three-level selector
- Integrate `HintSystemService` into `QuestEngineService`
- Add hint request button to failure modal
- Write E2E for hint request and XP deduction flow

### Phase 4: Combo Multiplier (Week 2)

- Integrate `ComboService` into `QuestEngineService`
- Add combo indicator to `QuestViewComponent`
- Modify XP calculation to apply multiplier
- Write E2E for combo tracking and reset

### Phase 5: Unlockable Themes (Week 3)

- Add theme selector to `SettingsModalComponent`
- Integrate theme storage with `GameStateService`
- Modify `QuestViewComponent` to unlock theme on Boss completion
- Write E2E for theme unlock and application flow

### Phase 6: Polish & Cross-Cutting (Week 3)

- Adjust hint costs based on effective tier (D-P4-08)
- Ensure Boss Quest XP rewards are bumped (1.5x base)
- Add theme preview in Settings modal
- Run `ng build` — zero errors
- Run `npm test` — zero regressions
- Run `npm run test:e2e` — all new E2E pass

## Complexity Tracking

*No constitution violations requiring justification.*
