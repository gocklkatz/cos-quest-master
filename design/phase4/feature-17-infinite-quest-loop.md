# Feature 17: Infinite Quest Loop — Prestige System and Free Practice Mode (Phase 4)

| Field | Value |
|---|---|
| Phase | Phase 4 |
| Priority | phase4-high |
| Status | ⬜ Not started |
| Depends On | [Change 05 — Branch Architecture](change-05-branch-architecture.md) |
| Pedagogical Principle | Goal Gradient Effect / Self-Determination Theory (Autonomy) |

---

## Task Prompt

Implement a prestige system (New Game+) so the game never ends, and expose a free-practice mode unlocked after the first prestige.

Acceptance criteria:

1. Add `prestigeLevel` and `totalXpAllTime` as persisted, never-resetting fields to `GameState` and expose them as computed signals in `GameStateService`.
2. Add `prestigeTitle` and `questCategory` computed signals to `GameStateService` derived from `prestigeLevel` per D-P4-01 and D-P4-09.
3. Add `triggerPrestige()` to `GameStateService`: accumulate current-run `xp` into `totalXpAllTime`, increment `prestigeLevel`, reset all per-run state (same fields as `resetProgress()`), reset `currentBranch` to `'setup'` — but preserve `totalXpAllTime`, `prestigeLevel`, `playerName`, `irisConfig`, and `anthropicApiKey`.
4. Refactor `VictoryOverlayComponent` to accept the prestige signals as inputs and render the "Begin [Next Prestige Title] Track" button; emit a new `prestige` output when the player clicks it; keep the existing `dismissed` output.
5. Wire `VictoryOverlayComponent.prestige` in `QuestViewComponent` to call `gameState.triggerPrestige()` then navigate to `/quest`.
6. In `ClaudeApiService.generateQuest()`: rename parameter `tier` to `effectiveTier` (same `QuestTier` type, same XP-based source until F18 lands); add `questCategory: 'write' | 'debug' | 'optimize' = 'write'` as a new parameter after `effectiveTier`; extend the system prompt with a `questCategory` instruction block.
7. Wire `questCategory` in `QuestEngineService.generateNextQuest()` from `gameStateService.questCategory()`.
8. Add a `/free-practice` route with a `FreePracticeComponent`; gate the navigation link in `HeaderBarComponent` behind `gameState.prestigeLevel() >= 1`.
9. `FreePracticeComponent` provides a topic selector (populated from `BRANCH_DISPLAY_NAMES`) and a "Generate Quest" button that calls `ClaudeApiService.generateQuest()` ad-hoc — no XP awarded, no `completeQuest()` called, no branch progression.
10. `ng build` and `ng test` produce zero errors and zero regressions.

---

## Pedagogical Design

**The Learning Problem**: ObjectScript mastery requires multiple deliberate passes through the same curriculum at increasing cognitive demand. A single linear run covers the syntax surface but does not develop diagnostic skill (reading broken code) or optimisation intuition. Ending the game at capstone cuts the learning curve short precisely when retention consolidation begins.

**The Cognitive Solution**:

- **Goal Gradient Effect**: naming each prestige tier ("Begin Journeyman Track") creates a concrete, reachable horizon. Players accelerate toward a visible endpoint rather than facing an abstract "play again" loop.
- **Self-Determination Theory — Autonomy**: the player explicitly opts into re-entry by clicking a named button, preserving perceived choice. The game does not auto-restart.
- **Desirable Difficulty**: the `questCategory` progression (`write` → `debug` → `optimize`) increases cognitive demand across runs without adding new syntax. Writing code activates recall; debugging activates error diagnosis (transfer-appropriate processing); optimising activates comparative evaluation of alternatives. Each pass recycles familiar material through a harder processing mode.
- **Free Practice — Autonomy + Spacing**: after the first prestige, the player can generate quests on any topic at any time. This supports self-directed review and spacing retrieval practice between structured runs.

---

## Implementation Details

### Frontend

#### `GameState` interface — add two fields

```ts
// quest-master/src/app/models/game-state.models.ts

export interface GameState {
  // ... existing fields ...

  /** Lifetime XP across all prestige runs. Never resets. */
  totalXpAllTime: number;
  /** Number of times the player has completed the full curriculum. Increments on prestige. */
  prestigeLevel: number;
}
```

Add to `DEFAULT_GAME_STATE`:

```ts
totalXpAllTime: 0,
prestigeLevel: 0,
```

Both fields must be included in the `persist()` serialisation path (they are plain state fields — no additional change needed if `persist()` serialises the whole state object).

#### `GameStateService` — new computed signals and `triggerPrestige()`

Add the following members to `GameStateService`:

```ts
readonly totalXpAllTime = computed(() => this.state().totalXpAllTime);
readonly prestigeLevel = computed(() => this.state().prestigeLevel);

readonly prestigeTitle = computed(() => {
  const labels: string[] = ['Initiate', 'Journeyman', 'Practitioner', 'Expert', 'Master'];
  return labels[Math.min(this.prestigeLevel(), labels.length - 1)];
});

readonly questCategory = computed((): 'write' | 'debug' | 'optimize' => {
  const p = this.prestigeLevel();
  if (p === 0) return 'write';
  if (p === 1) return 'debug';
  return 'optimize';
});
```

Add `triggerPrestige()` — do NOT delegate to `resetProgress()`. Implement the reset inline to preserve the fields that must survive a prestige:

```ts
triggerPrestige(): void {
  this.state.update(s => ({
    ...DEFAULT_GAME_STATE,
    // Preserved across prestige
    playerName: s.playerName,
    irisConfig: s.irisConfig,
    anthropicApiKey: s.anthropicApiKey,
    // Accumulated / incremented
    totalXpAllTime: s.totalXpAllTime + s.xp,
    prestigeLevel: s.prestigeLevel + 1,
    // Unlock setup branch for the new run
    unlockedBranches: ['setup'],
    currentBranch: 'setup',
  }));
  this.persist();
}
```

The spread of `DEFAULT_GAME_STATE` resets `xp`, `level`, `completedQuests`, `questBank`, `coveredConcepts`, `questLog`, `currentQuestId`, `challengeMode`, `noHintsStreak`, `dailyGoalMinutes`, `timeLog`, and `unlockedAchievements` in one step. The explicit overrides then restore the preserved fields and set the incremented ones.

#### `ClaudeApiService.generateQuest()` — parameter changes and prompt extension

Replace the current signature:

```ts
async generateQuest(
  completedQuests: string[],
  coveredConcepts: string[],
  currentBranch: string,
  tier: QuestTier,
  apiKey: string,
  questType: 'standard' | 'prediction' = 'standard',
): Promise<Quest>
```

With:

```ts
async generateQuest(
  completedQuests: string[],
  coveredConcepts: string[],
  currentBranch: string,
  effectiveTier: QuestTier,
  apiKey: string,
  questType: 'standard' | 'prediction' = 'standard',
  questCategory: 'write' | 'debug' | 'optimize' = 'write',
): Promise<Quest>
```

All internal references to `tier` inside the method body change to `effectiveTier`. No logic change — the XP-based tier computation in `QuestEngineService` continues to supply the value until F18 introduces `DifficultyService`.

In the system prompt string, add the following instruction block immediately after the existing tier/difficulty instructions:

```
## Quest Category

The quest category for this quest is: ${questCategory}

- write: The player must write code from a description. starterCode may be empty or contain scaffolding stubs.
- debug: The player must find and fix a bug in the provided code. starterCode MUST contain broken or incorrect ObjectScript code with a subtle error. The objective describes the expected correct behaviour when the bug is fixed.
- optimize: The player must improve working code for performance, clarity, or idiomatic ObjectScript style. starterCode MUST be correct but suboptimal. The objective describes the specific dimension to optimise (e.g. eliminate redundant SET, use $SELECT instead of IF/ELSE chain, reduce loop iterations).

Honour the category strictly. For "debug" and "optimize", starterCode must never be empty.
```

#### `QuestEngineService` — wire `questCategory`

In `generateNextQuest()` (or equivalent method that calls `claudeApi.generateQuest()`), add the `questCategory` argument:

```ts
const quest = await this.claudeApi.generateQuest(
  completedQuests,
  coveredConcepts,
  currentBranch,
  effectiveTier,   // renamed from tier
  apiKey,
  questType,
  this.gameState.questCategory(),
);
```

No other logic change in this service for F17.

#### `VictoryOverlayComponent` — inputs, outputs, and template

Add inputs to `victory-overlay.component.ts`:

```ts
prestigeLevel = input(0);
totalXpAllTime = input(0);
prestigeTitle = input('Initiate');
```

Add output alongside the existing `dismissed`:

```ts
prestige = output<void>();
```

Add a helper to compute the next prestige title (used in the template):

```ts
protected nextPrestigeTitle(): string {
  const labels = ['Initiate', 'Journeyman', 'Practitioner', 'Expert', 'Master'];
  return labels[Math.min(this.prestigeLevel() + 1, labels.length - 1)];
}
```

Template changes in `victory-overlay.component.html`:

- Replace the existing single XP display with a conditional block:
  - When `prestigeLevel() === 0`: show current run XP only (existing behaviour).
  - When `prestigeLevel() > 0`: show "Total XP across all runs: [totalXpAllTime() + current run xp]" in addition to or instead of the per-run figure. Exact copy TBD at implementation, but the label must read "Total XP across all runs".
- Replace the existing "Continue" button with:

```html
<button (click)="prestige.emit()">
  Begin {{ nextPrestigeTitle() }} Track
</button>
```

Keep the `rankForLevel()` rank display unchanged. The rank label and the prestige title are independent systems — do not merge them.

#### `QuestViewComponent` — wire prestige output

In `quest-view.component.ts`, pass prestige signals to the overlay and handle the new output:

```ts
// In the template where <app-victory-overlay> is used:
// [prestigeLevel]="gameState.prestigeLevel()"
// [totalXpAllTime]="gameState.totalXpAllTime()"
// [prestigeTitle]="gameState.prestigeTitle()"
// (prestige)="onPrestige()"
// (dismissed)="onDismissed()"  ← keep existing

onPrestige(): void {
  this.gameState.triggerPrestige();
  this.router.navigate(['/quest']);
}
```

#### `FreePracticeComponent` — new component

Create `quest-master/src/app/components/free-practice/free-practice.component.ts`.

Architecture decision: `FreePracticeComponent` does NOT reuse `QuestViewComponent` via the router. Reusing `QuestViewComponent` would require passing quest state through route params or a shared signal, coupling the progression state machine to a non-progression context. Instead, `FreePracticeComponent` imports `CodeEditorComponent` directly and renders its own minimal quest panel. This avoids duplicating Monaco editor setup because `CodeEditorComponent` is an importable standalone component.

Component responsibilities:

- Import `BRANCH_DISPLAY_NAMES` from `branch-progression.ts` (or equivalent constant file) and populate a `<select>` or chip group with `Object.entries(BRANCH_DISPLAY_NAMES)` where the value is the branch ID and the display text is the display name.
- Track `selectedTopic` as a local signal (`signal<string>(firstBranchId)`).
- Track `isGenerating` as a local signal (`signal(false)`).
- Track `currentQuest` as a local signal (`signal<Quest | null>(null)`).
- On "Generate Quest" click:

```ts
async generateQuest(): Promise<void> {
  this.isGenerating.set(true);
  try {
    const quest = await this.claudeApi.generateQuest(
      [],                                      // no completedQuests
      [],                                      // no coveredConcepts
      this.selectedTopic(),
      this.gameState.currentEffectiveTier(),   // use existing tier utility
      this.gameState.state().anthropicApiKey,
      'standard',
      this.gameState.questCategory(),
    );
    this.currentQuest.set(quest);
  } finally {
    this.isGenerating.set(false);
  }
}
```

- Render the quest's `title`, `objective`, and `starterCode` in the panel. Include `CodeEditorComponent` for the code editor area.
- Do NOT call `completeQuest()`, do NOT award XP, do NOT mutate `completedQuests` or any other game state.

Note: `currentEffectiveTier()` is a forward declaration for the F18 `DifficultyService` integration. For F17, expose a simple getter in `GameStateService` that returns the existing XP-based tier value (the same utility already used in `QuestEngineService`):

```ts
currentEffectiveTier(): QuestTier {
  // Temporary until F18: derive from current XP
  return xpToTier(this.xp());   // xpToTier = existing utility function
}
```

#### `HeaderBarComponent` — free practice link

In `header-bar.component.html`, add a navigation link conditionally rendered:

```html
@if (gameState.prestigeLevel() >= 1) {
  <a routerLink="/free-practice">Free Practice</a>
}
```

#### `app.routes.ts` — add free-practice route

```ts
{
  path: 'free-practice',
  loadComponent: () =>
    import('./components/free-practice/free-practice.component').then(
      m => m.FreePracticeComponent
    ),
},
```

---

### IRIS Backend

No changes required.

---

### AI Prompts

The complete `questCategory` instruction block to splice into the system prompt in `ClaudeApiService.generateQuest()`:

```
## Quest Category

The quest category for this quest is: ${questCategory}

Apply the following rules strictly based on the category:

write
  The player must produce ObjectScript code from a written description.
  starterCode may be empty or may contain scaffolding (e.g. method signature, partial variable declarations).
  The solution must be writable from scratch by the player.

debug
  The player must locate and correct a bug in existing code.
  starterCode MUST be non-empty and MUST contain syntactically valid but semantically incorrect ObjectScript.
  The bug must be subtle: a wrong operator, an off-by-one index, an incorrect variable reference, or a missing edge-case guard.
  The objective describes the correct expected behaviour so the player knows what "fixed" means.
  Do not place the bug in a comment — it must be in executable code.

optimize
  The player must improve working ObjectScript code along a specific dimension.
  starterCode MUST be non-empty and MUST produce correct output but be suboptimal.
  Suboptimal examples: redundant SET statements, IF/ELSE chain replaceable with $SELECT, N+1 query pattern, unnecessary string concatenation in a loop.
  The objective names the specific optimisation dimension (e.g. "reduce the number of SET statements", "replace the IF/ELSE with $SELECT").
  The solution must still produce identical output to the original.
```

This block is inserted as a top-level section in the system prompt, after the tier/difficulty section and before the output-format section.

---

## Files Changed

- `quest-master/src/app/models/game-state.models.ts` — add `totalXpAllTime` and `prestigeLevel` fields and defaults
- `quest-master/src/app/services/game-state.service.ts` — add `totalXpAllTime`, `prestigeLevel`, `prestigeTitle`, `questCategory` computed signals; add `triggerPrestige()` method; add `currentEffectiveTier()` temporary getter
- `quest-master/src/app/services/claude-api.service.ts` — rename `tier` to `effectiveTier`; add `questCategory` parameter; extend system prompt with questCategory instruction block
- `quest-master/src/app/services/quest-engine.service.ts` — pass `questCategory` argument to `generateQuest()`; rename `tier` call-site to `effectiveTier`
- `quest-master/src/app/components/victory-overlay/victory-overlay.component.ts` — add `prestigeLevel`, `totalXpAllTime`, `prestigeTitle` inputs; add `prestige` output; add `nextPrestigeTitle()` helper
- `quest-master/src/app/components/victory-overlay/victory-overlay.component.html` — update XP display; replace "Continue" button with "Begin [Next Title] Track" button
- `quest-master/src/app/components/quest-view/quest-view.component.ts` — wire prestige inputs/output on `VictoryOverlayComponent`; add `onPrestige()` handler
- `quest-master/src/app/components/header-bar/header-bar.component.html` — add conditional free-practice link
- `quest-master/src/app/components/free-practice/free-practice.component.ts` *(new)*
- `quest-master/src/app/components/free-practice/free-practice.component.html` *(new)*
- `quest-master/src/app/components/free-practice/free-practice.component.scss` *(new)*
- `quest-master/src/app/app.routes.ts` — add lazy-loaded `/free-practice` route

---

## Open Questions

- [ ] `FreePracticeComponent` uses `CodeEditorComponent` directly rather than reusing `QuestViewComponent`. Confirm that `CodeEditorComponent` exposes a `code` input and a `(codeChange)` output (or equivalent) that the free-practice panel can bind without requiring the full `QuestViewComponent` state machine.
- [ ] When `questCategory === 'debug'`, the AI response must have non-empty `starterCode`. Add a guard in `QuestEngineService` (or `ClaudeApiService`) to regenerate (up to one retry) if the returned quest has `starterCode === ''` and `questCategory === 'debug'`. Decide whether the retry lives in the service or is a prompt-enforcement-only approach.
- [ ] `triggerPrestige()` must NOT delegate to `resetProgress()`. Review `resetProgress()` at implementation time to confirm it does not share internal helper functions that would inadvertently overwrite `totalXpAllTime` or `prestigeLevel`. If a shared helper exists, extract it into a `resetPerRunFields()` private method used by both.
- [ ] `rankForLevel()` in `VictoryOverlayComponent` and the prestige title labels both use the label "Journeyman" at different points in the player journey (XP-based rank vs. prestige tier). Decide at implementation time whether to rename one to avoid confusion — e.g., rename the prestige tier label sequence to `['Initiate', 'Seeker', 'Practitioner', 'Expert', 'Master']` — or accept the dual usage and add a UI label to distinguish ("Quest Rank" vs. "Prestige Track").
- [ ] The `currentEffectiveTier()` getter added to `GameStateService` for F17 is a temporary shim. Annotate it with a `// TODO(F18): replace with DifficultyService.effectiveTier()` comment so it is easy to locate and remove when F18 lands.
- [ ] `totalXpAllTime` displayed on the Victory Overlay: when `prestigeLevel === 0` the value is 0 (no prior runs), so displaying it would be misleading. The spec says show current run XP only on `prestigeLevel === 0`. Verify that the template's conditional correctly suppresses the "across all runs" label on the first run.

---

## Verification Plan

1. Complete a first full run through all branches ending at capstone. Verify that the Victory Overlay appears with `prestigeLevel === 0` and the button reads "Begin Journeyman Track".
2. Click "Begin Journeyman Track". Verify: `gameState.prestigeLevel()` equals 1; `gameState.totalXpAllTime()` equals the XP value that was displayed during the completed run; `gameState.xp()` equals 0; `gameState.currentBranch()` equals `'setup'`; the router navigates to `/quest`.
3. Verify `gameState.questCategory()` returns `'debug'` immediately after the first prestige.
4. Generate a quest while `questCategory === 'debug'`. Inspect the returned `Quest` object: `starterCode` must be non-empty and contain visibly broken ObjectScript; the `objective` text must describe the correct expected behaviour.
5. Verify the "Free Practice" link is now visible in `HeaderBarComponent` (it must have been absent before prestige).
6. Navigate to `/free-practice`. Verify the topic selector lists all entries from `BRANCH_DISPLAY_NAMES` with their display names.
7. Select a topic and click "Generate Quest". Verify a quest renders in the panel. Verify `gameState.completedQuests()` does not change and `gameState.xp()` remains 0 after generation.
8. Complete a second full run. Verify the Victory Screen shows "Begin Practitioner Track" and the displayed total XP equals run-1 XP plus run-2 XP.
9. After the second prestige, verify `gameState.questCategory()` returns `'optimize'`.
10. Generate a quest while `questCategory === 'optimize'`. Verify `starterCode` is non-empty, correct but suboptimal, and the objective specifies the optimisation dimension.
11. Run `ng build` in `quest-master/`. Verify zero TypeScript or template compilation errors.
12. Run `ng test` in `quest-master/`. Verify zero test regressions. If new unit tests are written for `triggerPrestige()` and `questCategory`, verify they pass.

---

## Back-links

- Phase: [Phase 4 Main](phase4_main.md)
- Decisions: [D-P4-01 — Infinite game model](DECISIONS.md) · [D-P4-09 — Prestige quest types and Claude prompt parameters](DECISIONS.md)
- Unblocks: [F19 — Enhanced Gamification](feature-19-enhanced-gamification.md) · [F20 — Narrative Story Arc](feature-20-narrative-story-arc.md)
