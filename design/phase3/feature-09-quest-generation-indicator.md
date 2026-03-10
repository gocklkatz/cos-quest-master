# Feature 09: Quest Generation Loading Indicator (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ⬜ Not started |
| Depends On | F1 — Dynamic Quest Regeneration |
| Pedagogical Principle | Motivation & Flow — removing friction and anxiety between learning cycles |

---

## Task Prompt

After a player completes a quest and the app triggers AI quest generation, a silent pause of several seconds occurs before the next quest appears. The user has no indication that work is happening. This feature adds a clear, animated loading state to the `QuestPanel` that activates the moment generation begins and resolves automatically when the new quest is ready.

**Acceptance criteria:**
- Immediately after quest completion triggers `generateNextQuest()`, the quest area shows a loading state (no manual refresh needed).
- The loading state displays a short, thematic label (e.g., "Forging your next quest…") alongside an animation.
- Once the quest is stored, the loading state disappears and the new quest renders normally.
- If generation fails, the loading state is replaced by an error message with a retry option.
- No regression to existing quest display or submission flow.

---

## Pedagogical Design

**The Learning Problem**: A silent gap after completing a quest breaks the learner's sense of momentum. Without feedback, the user cannot tell whether the app is working, broken, or waiting for input. This creates anxiety and erodes trust in the system — both of which increase cognitive load and reduce motivation to continue.

**The Cognitive Solution**: Immediate, thematic progress feedback (e.g., "Forging your next quest…") signals that the system is actively preparing the next challenge. This keeps the learner in a state of positive anticipation rather than confusion, maintaining the motivational arc between quests. The language should match the app's blacksmithing/crafting theme to reinforce immersion.

---

## Implementation Details

- **Signal**: Add a `questGenerating = signal(false)` to `QuestService`. Set to `true` at the start of `generateNextQuest()`, set back to `false` (in both success and error paths) once the quest is written to storage.
- **QuestPanel template**: Use `@if (questGenerating())` to conditionally render:
  - A skeleton/placeholder card or a centered spinner + label in place of the quest title and description.
  - A thematic message: *"Forging your next quest…"*
  - Keep the Run / Submit buttons disabled while generating.
- **Error state**: If `generateNextQuest()` throws, set a `questGenerationError` signal. Show an inline error with a "Try again" button that re-invokes generation.
- **Animation**: Use a CSS keyframe animation (pulse or shimmer) — no external animation library required.
- **Accessibility**: The loading container must have `role="status"` and `aria-live="polite"` so screen readers announce the state change.

---

## Files Changed

- `quest-master/src/app/services/quest.service.ts` — add `questGenerating` and `questGenerationError` signals; wrap `generateNextQuest()` to set/clear them
- `quest-master/src/app/components/quest-panel/quest-panel.component.ts` — read `questGenerating` signal from service
- `quest-master/src/app/components/quest-panel/quest-panel.component.html` — add `@if` branch for loading state
- `quest-master/src/app/components/quest-panel/quest-panel.component.scss` — add shimmer/pulse keyframe animation

---

## Open Questions

- [ ] Should the spinner/skeleton replace only the title+description area, or the entire quest card? (Prefer partial replacement so the quest panel chrome stays visible.)
- [ ] What is the exact thematic label? Options: *"Forging your next quest…"*, *"The anvil is hot…"*, *"Shaping your challenge…"*

---

## Verification Plan

1. Complete quest 0 ("Forge the Anvil") — loading indicator appears immediately.
2. Wait for generation to finish — indicator disappears and next quest renders.
3. Simulate a network failure in `ClaudeApiService` — error state renders with "Try again" button.
4. Click "Try again" — generation retries and succeeds (or shows error again).
5. Run `ng build` — zero errors.
6. Run unit tests — `QuestService` signals tested; `QuestPanel` snapshot updated.
