# Feature 02: AI Elaborative Interrogation (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ⬜ Not started |
| Pedagogical Principle | Elaborative Interrogation |
| Depends On | Feature 01 |

---

## Task Prompt
Enhance the quest evaluation loop so Claude asks a follow-up "Why" question upon successful completion. The user must provide a brief explanation to fully "seal" the quest rewards.

---

## Pedagogical Design
**The Learning Problem**: Passive completion. Users can "stumble" upon a solution without understanding why it worked.
**The Cognitive Solution**: Elaborative Interrogation (Pressley) involves asking "why" a fact or process is true. This forces the learner to integrate the new knowledge with their existing mental model.

---

## Implementation Details
- **Frontend**: 
    - Update `QuestPanel` to display a follow-up question after success.
    - Add a "Reflection" text area for the user's response.
- **IRIS Backend**: —
- **AI Prompts**: Update `ClaudeApiService.evaluateCode()` prompt to return an `elaborativeQuestion` field in the JSON response.

---

## Verification Plan
1. Complete a quest successfully.
2. Verify that a follow-up question appears (e.g., "Why did you use a post-conditional here?").
3. Confirm that submitting the reflection updates the quest state to "Fully Complete."
