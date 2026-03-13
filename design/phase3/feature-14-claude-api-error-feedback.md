# Feature 14: Claude API Error Feedback (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Depends On | F1 (Dynamic Quest Regeneration), F10 (AI Review Modal) |
| Pedagogical Principle | Trust Calibration — players must know whether feedback came from Claude or the fallback evaluator to correctly weight it |

---

## Task Prompt

When any call to `ClaudeApiService` fails (network error, invalid API key, exhausted credits, rate-limit, API overload), the current code either silently falls back to the simple evaluator (`submitCode`) or shows a generic "Check your API key" message (`ReviewModalComponent`). Neither path distinguishes the error cause, and the silent fallback in `submitCode` gives no indication that AI evaluation did not run.

**Acceptance criteria:**

1. `ClaudeApiService.callClaude` throws a typed `ClaudeApiError` that carries the HTTP status and a pre-mapped human-readable reason:
   - `401` → `"Invalid API key — check Settings."`
   - `402` / `429` → `"AI credits exhausted or rate-limit reached — evaluation used simplified scoring."`
   - `529` → `"Anthropic API is overloaded — evaluation used simplified scoring."`
   - other → `"Claude API error <status> — evaluation used simplified scoring."`
2. `QuestViewComponent.submitCode` catches `ClaudeApiError`, falls back to `evaluateSimple` **and** sets an `evaluationWarning` signal with the mapped reason.
3. The quest-view template renders an amber inline banner when `evaluationWarning()` is non-null, placed below the output pane. Banner text: `"⚠ <reason>"`. Banner is cleared when a new quest is loaded or the player runs code again.
4. `ReviewModalComponent.submitReflection` catches `ClaudeApiError` and sets `reflectionError` to the typed message (instead of the current static string).
5. No change to `generateNextQuest` error path — it already sets `questGenerationError` and has a retry button.

---

## Pedagogical Design

**The Learning Problem**: Learners calibrate how seriously to take feedback based on perceived source quality. If the simple evaluator says "Well done!" after a Claude failure, the player may think they fully passed a nuanced quest and skip the reflection opportunity.

**The Cognitive Solution**: Explicit uncertainty labelling — surfacing that "this score came from output-matching only, not Claude analysis" — is a known metacognitive cue. It prompts players to self-evaluate more carefully and not over-rely on a result they know is incomplete.

---

## Implementation Details

- **`ClaudeApiService`**: Add `ClaudeApiError extends Error` with a `status: number` field. In `callClaude`, replace the generic `throw new Error(...)` with `throw new ClaudeApiError(status, mappedMessage)`.
- **`QuestViewComponent`**: Add `evaluationWarning = signal<string | null>(null)`. In the `catch` block of `submitCode`, detect `ClaudeApiError` and set `evaluationWarning`. Clear on quest load and on run.
- **`quest-view.component.html`**: Add amber `@if (evaluationWarning())` banner below the output pane.
- **`ReviewModalComponent`**: Import `ClaudeApiError`; replace the hardcoded `reflectionError` string with `e instanceof ClaudeApiError ? e.message : 'Could not evaluate reflection. Check your API key and try again.'`.

---

## Files Changed

- `quest-master/src/app/services/claude-api.service.ts` — add `ClaudeApiError`, update `callClaude`
- `quest-master/src/app/components/quest-view/quest-view.component.ts` — `evaluationWarning` signal, updated catch
- `quest-master/src/app/components/quest-view/quest-view.component.html` — amber warning banner
- `quest-master/src/app/components/quest-view/quest-view.component.scss` — `.evaluation-warning` styles
- `quest-master/src/app/components/review-modal/review-modal.component.ts` — typed error catch

---

## Open Questions

- ~~Should the warning banner include a "Retry with Claude" button that re-runs evaluation (requires storing the last submission)? Or is the banner purely informational?~~ **Resolved 2026-03-13**: Banner is purely informational — no retry button. Adding a retry would require storing the last submission and adds scope without meaningful pedagogical gain.

---

## Verification Plan

1. Set an invalid API key in Settings. Submit a quest. Confirm amber banner appears with "Invalid API key" text and the evaluation result is still shown (from simple evaluator).
2. Temporarily modify `callClaude` to throw a synthetic `ClaudeApiError(402, ...)`. Confirm the banner text contains "credits exhausted".
3. Run code again after the banner is visible — confirm the banner is cleared.
4. Navigate to the next quest — confirm the banner is cleared.
5. Open Review Modal, submit a reflection with a broken key — confirm the typed error message is shown (not the old static string).
6. `ng build` — zero errors. `ng test` — zero regressions.
