# Implementation Plan: Adaptive Difficulty

**Branch**: `018-adaptive-difficulty` | **Date**: 2026-03-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/018-adaptive-difficulty/spec.md`

## Summary

Give players explicit control over their starting difficulty (Beginner / Intermediate / Advanced)
before the first quest is generated. The preference sets the curriculum entry sub-branch and floors
the effective complexity tier passed to AI quest generation. A recalibration nudge appears after two
consecutive low-score completions in a session. Technical approach: add a new `DifficultyService`
that merges the stored preference with XP-derived level into a single `effectiveTier` signal; replace
the existing inline tier calculation in `QuestEngineService`; add a first-run prompt and a Settings
panel control.

## Technical Context

**Language/Version**: TypeScript 5.x / Angular 21.1 (standalone, zoneless, signals)
**Primary Dependencies**: Angular signals, GameStateService, QuestEngineService, ClaudeApiService
**Storage**: `localStorage` via GameStateService (`persist()` pattern)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Browser SPA (local development, no backend changes)
**Project Type**: Web application — Angular frontend only
**Performance Goals**: No new latency surface; `effectiveTier` is a synchronous computed signal
**Constraints**: No new external dependencies; bundle must remain ≤1MB; no RxJS state additions
**Scale/Scope**: Single player, local tool; 3 difficulty levels × 2 advanced focus options = 5 paths

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Signal-First Reactivity | ✅ Pass | `DifficultyService.effectiveTier` is a `computed()` signal; `suggestDifficultyAdjustment` is a `signal()`; no RxJS state |
| II. Graceful Degradation | ✅ Pass | If no preference stored, defaults to 'beginner' — same behavior as today |
| III. Test Coverage Standards | ✅ Pass | `DifficultyService` logic is unit-testable; first-run prompt and nudge covered in E2E |
| IV. UX Consistency | ✅ Pass | Difficulty prompt is blocking before first quest; nudge is non-blocking/dismissible |
| V. Security & Data Locality | ✅ Pass | `difficultyPreference` stored in localStorage; no new credentials or external calls |
| VI. Simplicity & Minimal Dependencies | ✅ Pass | One new service, two new model fields, one new component; no new npm packages |
| VII. ObjectScript Execution Integrity | N/A | No IRIS backend changes |

**No violations. Gate passed.**

## Project Structure

### Documentation (this feature)

```text
specs/018-adaptive-difficulty/
├── plan.md              # This file
├── research.md          # Phase 0 — existing codebase analysis
├── data-model.md        # Phase 1 — new fields and service contracts
└── tasks.md             # Phase 2 — /speckit.tasks output
```

### Source Code (affected files)

```text
quest-master/src/app/
├── models/
│   └── game-state.models.ts          # Add DifficultyPreference, AdvancedFocus fields to GameState
├── services/
│   ├── difficulty.service.ts         # NEW — computes effectiveTier, initialSubBranch
│   ├── game-state.service.ts         # Add updateDifficultyPreference(), expose new signals
│   └── quest-engine.service.ts       # Replace inline tier calc; add recalibration nudge logic
├── components/
│   ├── settings-modal/
│   │   ├── settings-modal.component.ts   # Add difficultyPreference + advancedFocus controls
│   │   └── settings-modal.component.html # Segmented control (Beginner/Intermediate/Advanced)
│   ├── difficulty-prompt/             # NEW — first-run modal component
│   │   ├── difficulty-prompt.component.ts
│   │   └── difficulty-prompt.component.html
│   └── quest-view/
│       └── quest-view.component.ts   # Show recalibration nudge toast; trigger difficulty prompt
└── spec/
    ├── difficulty.service.spec.ts    # NEW — unit tests
    └── quest-engine.service.spec.ts  # Extend existing suite
```

## Phase 0: Research

*Findings from codebase analysis — all unknowns resolved.*

See [research.md](research.md) for full details.

**Key findings:**

1. `GameStateService.currentEffectiveTier()` already has a `TODO(F18)` comment noting it should
   be replaced with `DifficultyService.effectiveTier()`. The inline calc is at ~line 175.

2. `ClaudeApiService.generateQuest()` already accepts `questCategory: 'write' | 'debug' | 'optimize'`
   and `effectiveTier: QuestTier` as separate parameters (D-P4-09 was already implemented in F17).

3. `GameState` does **not** yet have `difficultyPreference` or `advancedFocus` — these are new fields.

4. `BRANCH_PROGRESSION` already contains all sub-branches from C5 (setup → ... → capstone).
   Entry point lookup is a simple `findIndex()` on the array.

5. `SettingsModalComponent` has no difficulty control yet. Its `save()` method calls
   `gameState.updateSettings()` — a parallel `updateDifficultyPreference()` method is the
   cleanest addition without touching the existing save path.

6. No first-run prompt mechanism exists. A new standalone `DifficultyPromptComponent` is needed,
   shown by `QuestViewComponent` when `gameState.difficultyPreference()` returns `null` (unset).

**No NEEDS CLARIFICATION items remain.** All technical decisions are covered by D-P4-03, D-P4-08,
and D-P4-09.

## Phase 1: Design

### Data Model

See [data-model.md](data-model.md).

**New GameState fields:**

```ts
difficultyPreference: 'beginner' | 'intermediate' | 'advanced' | null;
// null = not yet set; triggers first-run prompt
advancedFocus: 'oop' | 'sql' | null;
// non-null only when difficultyPreference === 'advanced'
```

**Default values:**

```ts
difficultyPreference: null,   // triggers prompt on first session
advancedFocus: null,
```

**New service: `DifficultyService`**

```ts
// Computed signals (all synchronous)
readonly effectiveTier: Signal<QuestTier>
// Merges difficultyPreference with XP level:
// advanced  → always 'master'
// intermediate → 'journeyman' until XP level >= 13, then 'master'
// beginner / null → standard XP gate (apprentice/journeyman/master)

readonly initialSubBranch: Signal<string>
// advanced + oop  → 'classes-methods'
// advanced + sql  → 'sql-queries'
// intermediate    → 'classes-properties'
// beginner / null → 'setup'
```

**`QuestEngineService` additions:**

```ts
readonly suggestDifficultyAdjustment: signal(false)
// Set to true after 2 consecutive session-low-score completions; reset after dismiss
private consecutiveLowScores = 0   // in-memory only, not persisted
```

### No External Contracts

No new IRIS endpoints. No external API contract changes. The only interface change is the
`effectiveTier` parameter to `ClaudeApiService.generateQuest()`, which is already present and
already called correctly — only the source of the value changes (DifficultyService instead of
the inline GameStateService calculation).

### Quickstart Validation

After implementation:

```bash
cd quest-master
npm test                           # Vitest — zero regressions + new DifficultyService tests pass
npm run test:e2e                   # Playwright — first-run prompt, settings change, nudge flows
ng build                           # Zero errors
```

Manual smoke-test sequence:
1. Clear localStorage → reload → difficulty prompt appears.
2. Select Advanced → OOP → verify first quest is in `classes-methods` branch.
3. Fail two quests in a row → recalibration nudge appears → dismiss → no second nudge.
4. Open Settings → change to Beginner → complete current quest → next quest is apprentice-tier.
5. Reload browser → preference is preserved.

## Complexity Tracking

*No constitution violations requiring justification.*
