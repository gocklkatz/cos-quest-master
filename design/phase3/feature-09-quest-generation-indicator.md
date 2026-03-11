# Feature 09: Quest Generation Loading Indicator (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Depends On | F1 — Dynamic Quest Regeneration |
| Pedagogical Principle | Motivation & Flow — removing friction and anxiety between learning cycles |

---

## Task Prompt

After a player completes a quest and the app triggers AI quest generation, a silent pause of several seconds occurs before the next quest appears. The user has no indication that work is happening. This feature adds a clear, animated loading state to the `QuestPanel` that activates the moment generation begins and resolves automatically when the new quest is ready.

**Acceptance criteria:**
- Immediately after quest completion triggers `generateNextQuest()`, the quest area shows a loading state (no manual refresh needed).
- The loading state displays the thematic label *"The anvil is hot…"* alongside an animation.
- Once the quest is stored, the loading state disappears and the new quest renders normally.
- If generation fails, the loading state is replaced by an error message with a retry option.
- No regression to existing quest display or submission flow.

---

## Pedagogical Design

**The Learning Problem**: A silent gap after completing a quest breaks the learner's sense of momentum. Without feedback, the user cannot tell whether the app is working, broken, or waiting for input. This creates anxiety and erodes trust in the system — both of which increase cognitive load and reduce motivation to continue.

**The Cognitive Solution**: Immediate, thematic progress feedback (*"The anvil is hot…"*) signals that the system is actively preparing the next challenge. This keeps the learner in a state of positive anticipation rather than confusion, maintaining the motivational arc between quests. The language matches the app's blacksmithing/crafting theme to reinforce immersion.

---

## Implementation Details

- **Signals on `QuestEngineService`**:
  - `questGenerating = signal(false)` — set to `true` at the start of `generateNextQuest()`, cleared to `false` in both success and error paths.
  - `questGenerationError = signal(false)` — set to `true` only on failure, cleared at the start of each retry.
  - `retryGenerate()` method — re-invokes generation using internally stored `_lastBranch` and `_lastApiKey` (saved at the start of each `generateNextQuest()` call). No arguments needed from the caller.

- **`QuestPanel` template** — partial replacement (Option A): the quest list at the bottom remains visible at all times. While `questGenerating()` is true, replace only the header + narrative + objective + hints + bonus sections with:
  - A shimmer skeleton block.
  - The thematic label: *"The anvil is hot…"*
  - `role="status"` and `aria-live="polite"` on the loading container.
  - Run / Submit buttons (in `AppComponent`) are disabled via a `questGenerating` input passed down.

- **`QuestPanel` component**: injects `QuestEngineService` directly to read `questGenerating()`, `questGenerationError()`, and call `retryGenerate()`.

- **`AppComponent`**: passes `questGenerating` signal value as an input to disable Run/Submit while generating.

- **Animation**: CSS keyframe shimmer (`@keyframes shimmer`) — no external animation library.

- **Accessibility**: loading container has `role="status"` and `aria-live="polite"`.

---

## Files Changed

- `quest-master/src/app/services/quest-engine.service.ts` — add `questGenerating`, `questGenerationError` signals; store `_lastBranch`/`_lastApiKey`; wrap `generateNextQuest()` to set/clear signals; add `retryGenerate()`
- `quest-master/src/app/components/quest-panel/quest-panel.component.ts` — inject `QuestEngineService`; expose signals for template
- `quest-master/src/app/components/quest-panel/quest-panel.component.html` — add `@if` branch for partial loading state (keeps quest list visible)
- `quest-master/src/app/components/quest-panel/quest-panel.component.scss` — add `@keyframes shimmer` and `.generating-placeholder` styles
- `quest-master/src/app/app.ts` — pass `questGenerating` signal value to Run/Submit disabled state
- `quest-master/src/app/services/quest-engine.service.spec.ts` — unit tests for new signals and `retryGenerate()`
- `quest-master/src/app/components/quest-panel/quest-panel.component.spec.ts` — snapshot updated for loading state branch

---

## Open Questions

- ~~Should the spinner/skeleton replace only the title+description area, or the entire quest card?~~ **Partial replacement (Option A)** — quest list stays visible at all times.
- ~~What is the exact thematic label?~~ ***"The anvil is hot…"***

---

## Verification Plan

1. Complete quest 0 ("Forge the Anvil") — loading indicator appears immediately in the quest content area; quest list remains visible.
2. Wait for generation to finish — indicator disappears and next quest renders.
3. Simulate a network failure in `ClaudeApiService` — error state renders with "Try again" button.
4. Click "Try again" — generation retries and succeeds (or shows error again).
5. Run `ng build` — zero errors.
6. Run unit tests — `QuestEngineService` signals tested; `QuestPanel` snapshot updated.
