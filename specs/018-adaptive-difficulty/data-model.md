# Data Model: Adaptive Difficulty

**Branch**: `018-adaptive-difficulty` | **Date**: 2026-03-29

## New Types

### `DifficultyPreference`

```ts
// game-state.models.ts
export type DifficultyPreference = 'beginner' | 'intermediate' | 'advanced';
```

### `AdvancedFocus`

```ts
// game-state.models.ts
export type AdvancedFocus = 'oop' | 'sql';
```

## Modified: `GameState`

Add two nullable fields. `null` means "not yet set" — absence of a stored preference is the
trigger for the first-run prompt.

```ts
// game-state.models.ts — additions to GameState interface
difficultyPreference: DifficultyPreference | null;  // null = first-run prompt required
advancedFocus: AdvancedFocus | null;                // non-null only when preference = 'advanced'
```

### Default Values

```ts
// DEFAULT_GAME_STATE additions
difficultyPreference: null,
advancedFocus: null,
```

### Persistence

Both fields are stored in `localStorage` as part of the GameState JSON blob. No schema
migration needed — `null` is the correct default for new fields and `JSON.parse` of an old
blob without these fields will produce `undefined`, which `normalizeGameState()` MUST treat
as `null`.

## New Service: `DifficultyService`

**File**: `quest-master/src/app/services/difficulty.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class DifficultyService {

  // ── computed signals ────────────────────────────────────────────────────

  /**
   * The effective quest complexity tier, merging player preference with XP level.
   * This replaces the inline tier calculation in QuestEngineService and the
   * TODO(F18)-tagged method in GameStateService.
   */
  readonly effectiveTier: Signal<QuestTier>
  // Mapping:
  //   advanced                 → 'master'  (always, regardless of XP)
  //   intermediate             → 'journeyman' (XP L1–12) | 'master' (XP L13+)
  //   beginner | null (default)→ 'apprentice' (L1–5) | 'journeyman' (L6–12) | 'master' (L13+)

  /**
   * The sub-branch the player should start in, based on their difficulty preference.
   * Only meaningful at first-session initialization or after Reset All Progress.
   * Branch names match BRANCH_PROGRESSION entries exactly.
   */
  readonly initialSubBranch: Signal<string>
  // Mapping:
  //   advanced + oop  → 'classes-methods'
  //   advanced + sql  → 'sql-queries'
  //   intermediate    → 'classes-properties'
  //   beginner | null → 'setup'
}
```

### Validation Rules

- `initialSubBranch` MUST return a string that exists in `BRANCH_PROGRESSION`.
- `effectiveTier` MUST return one of `'apprentice' | 'journeyman' | 'master'`.
- When `difficultyPreference` is `null` (unset), both signals fall back to Beginner defaults.

## Modified: `GameStateService`

### New method: `updateDifficultyPreference()`

```ts
updateDifficultyPreference(
  preference: DifficultyPreference,
  focus: AdvancedFocus | null
): void
// - Writes difficultyPreference and advancedFocus to GameState
// - Calls persist() after update
// - Does NOT change currentBranch or any quest state (branch change only applies on next
//   quest generation, which is handled by QuestEngineService consuming DifficultyService)
```

### New computed signal: `difficultyPreference()`

```ts
readonly difficultyPreference: Signal<DifficultyPreference | null>
// Exposed for DifficultyPromptComponent and SettingsModalComponent to read
```

### Remove: `currentEffectiveTier()`

The TODO(F18)-tagged `currentEffectiveTier()` method is removed. All callers switch to
`DifficultyService.effectiveTier()`.

## Modified: `QuestEngineService`

### Remove: inline tier calculation

Replace lines ~282–286 (inline `effectiveTier` calculation) with:

```ts
const effectiveTier = this.difficulty.effectiveTier();
```

### New signal: `suggestDifficultyAdjustment`

```ts
readonly suggestDifficultyAdjustment = signal(false);
// Set to true when consecutiveLowScores reaches 2 within a session.
// Consumed by QuestViewComponent to show a toast.
// Reset to false by QuestViewComponent when the toast is dismissed.
```

### New private field: `consecutiveLowScores`

```ts
private consecutiveLowScores = 0;
// In-memory only — not persisted. Resets to 0 on page reload.
// Increments on each quest completion where EvaluationResult.score < 70.
// Resets to 0 on any quest completion where score >= 70.
// When it reaches 2, sets suggestDifficultyAdjustment to true and resets to 0.
```

## New Component: `DifficultyPromptComponent`

**File**: `quest-master/src/app/components/difficulty-prompt/difficulty-prompt.component.ts`

A standalone modal-style overlay shown by `QuestViewComponent` when
`gameState.difficultyPreference() === null`.

**Inputs**: none
**Outputs**: `confirmed: EventEmitter<{ preference: DifficultyPreference; focus: AdvancedFocus | null }>`

**Behavior**:
- Shows Beginner / Intermediate / Advanced as three mutually exclusive options.
- When "Advanced" is selected, renders a secondary question: "More OOP background or SQL?"
- Confirm button is disabled until a full selection is made.
- On confirmation, emits the selection; `QuestViewComponent` calls
  `gameState.updateDifficultyPreference()` and then sets `currentBranch` to
  `difficulty.initialSubBranch()`.

## State Transitions

```
First session (difficultyPreference === null)
  ↓ DifficultyPromptComponent shown
  ↓ Player confirms selection
  ↓ gameState.updateDifficultyPreference(pref, focus)
  ↓ gameState.setCurrentBranch(difficulty.initialSubBranch())
  ↓ QuestEngineService.generateNextQuest() uses DifficultyService.effectiveTier()
  → Normal quest loop begins

Mid-session preference change (via Settings)
  ↓ SettingsModalComponent calls gameState.updateDifficultyPreference(pref, focus)
  ↓ DifficultyService.effectiveTier() recomputes (signal update)
  ↓ QuestViewComponent continues current quest unaffected
  → Next generateNextQuest() call uses new effectiveTier

Two consecutive low scores in session
  ↓ QuestEngineService.consecutiveLowScores reaches 2
  ↓ suggestDifficultyAdjustment.set(true)
  ↓ QuestViewComponent shows non-blocking toast
  → Player dismisses: QuestViewComponent calls questEngine.suggestDifficultyAdjustment.set(false)
  → Player clicks Settings link: Settings modal opens
```
