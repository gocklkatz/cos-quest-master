# Feature 02: AI Elaborative Interrogation (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ⬜ Not started |
| Pedagogical Principle | Metacognition |
| Depends On | Feature 01 |

---

## Task Prompt
Upgrade the Claude evaluation prompt so that passing a quest no longer ends the interaction. Claude must ask a single follow-up question that forces the user to explain *why* they made a specific design decision in their code.

---

## Pedagogical Design
**The Learning Problem**: Surface-level completion. A student can pass a quest by producing correct output without understanding *why* it worked. "Code Production" without reflection leads to brittle knowledge.
**The Cognitive Solution**: Elaborative Interrogation (King). Asking "Why does this work?" forces the learner to connect new knowledge to existing mental models, improving retention and transfer.

---

## Implementation Details
- **Frontend**:
    - Add `followUpQuestion?: string` field to `EvaluationResult` in `quest.models.ts`.
    - Update `QuestPanel` to render the follow-up question below the feedback block after a pass.
    - Add a free-text input for the user's answer (no AI grading required — the act of answering is the benefit).
- **IRIS Backend**: —
- **AI Prompts**:
    - Update `ClaudeApiService.evaluateSubmission()` system prompt to include a `followUpQuestion` field in the JSON response.
    - The question must reference a specific line or construct in the player's *actual* submitted code (not generic praise).
    - Example: "You used `$PIECE` with a comma delimiter — why would `$EXTRACT` be a poor substitute here?"

---

## Verification Plan
1. Complete a quest with a passing submission.
2. Verify that a follow-up question appears below the feedback text.
3. Confirm the question references a specific construct from the submitted code (not boilerplate).
4. Type an answer and verify the input is accepted (no further AI call required).
5. Verify `ng build` succeeds with the new `followUpQuestion` field.
