# Feature 02: AI Elaborative Interrogation (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Pedagogical Principle | Metacognition |
| Depends On | Feature 01 |

---

## Task Prompt
Upgrade the Claude evaluation prompt so that passing a quest no longer ends the interaction. Claude must ask a single follow-up question that forces the user to explain *why* they made a specific design decision in their code. The user's answer is then evaluated by AI, and the evaluation response is displayed below the reflection input inside the Review Modal.

---

## Pedagogical Design
**The Learning Problem**: Surface-level completion. A student can pass a quest by producing correct output without understanding *why* it worked. "Code Production" without reflection leads to brittle knowledge.
**The Cognitive Solution**: Elaborative Interrogation (King). Asking "Why does this work?" forces the learner to connect new knowledge to existing mental models, improving retention and transfer. AI evaluation of the answer closes the loop — the learner gets immediate confirmation or correction of their mental model.

---

## Implementation Details
- **Frontend**:
    - Add `followUpQuestion?: string` field to `EvaluationResult` in `quest.models.ts`. ✅ Done
    - ~~Update `QuestPanel` to render the follow-up question below the feedback block after a pass.~~ Placed in `ReviewModalComponent` instead (see DECISIONS.md).
    - In `ReviewModalComponent`: show the follow-up question and a free-text textarea for the user's answer (on pass only). ✅ Done
    - Add a **"Submit Reflection"** button below the textarea. On click, call `ClaudeApiService.evaluateReflection()` with the question and the user's answer.
    - Show a loading indicator while the AI call is in flight.
    - Display the AI's reflection feedback (plain text) below the textarea once returned.
    - The **OK** button is always available (dismissing before submitting reflection is allowed).
- **IRIS Backend**: —
- **AI Prompts**:
    - Update `ClaudeApiService.evaluateSubmission()` system prompt to include a `followUpQuestion` field in the JSON response. ✅ Done
    - The question must reference a specific line or construct in the player's *actual* submitted code (not generic praise). ✅ Done
    - Add `ClaudeApiService.evaluateReflection(question, answer, apiKey)` — new method that returns a short plain-text response (2-4 sentences) confirming, correcting, or deepening the learner's explanation.

---

## Files Changed

- `src/app/models/quest.models.ts` — added `followUpQuestion?: string` to `EvaluationResult` ✅
- `src/app/services/claude-api.service.ts` — extended `evaluateSubmission` system prompt to require `followUpQuestion` on pass ✅; add `evaluateReflection()` method
- `src/app/components/review-modal/review-modal.component.ts` — added `reflectionAnswer` signal, `FormsModule` import, fixed Enter-key guard for textarea ✅; add reflection submit + loading + feedback state
- `src/app/components/review-modal/review-modal.component.html` — added interrogation section (question + textarea) shown on pass only ✅; add Submit button, loading state, feedback display
- `src/app/components/review-modal/review-modal.component.scss` — styles for interrogation section ✅; add styles for submit button, loading, feedback ✅
- `src/app/app.html` — added `[apiKey]` binding to `<app-review-modal>`

---

## Open Questions

- ~~Where should the follow-up question render — QuestPanel or ReviewModal?~~ ReviewModal (see DECISIONS.md).

---

## Verification Plan
1. Complete a quest with a passing submission.
2. Verify that a follow-up question and textarea appear in the Review Modal.
3. Confirm the question references a specific construct from the submitted code (not boilerplate).
4. Type an answer and click "Submit Reflection" — verify a loading indicator appears.
5. Verify the AI response appears below the textarea without closing the modal.
6. Click OK — verify the modal closes and the next quest loads normally.
7. Verify `ng build` succeeds.
