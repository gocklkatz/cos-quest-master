# Feature 01: Dynamic Quest Regeneration (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ⬜ Not started |
| Pedagogical Principle | Varied Practice |
| Depends On | Change 01 |

---

## Task Prompt
Modify the reset logic to ensure that clearing progress triggers a request to the AI for a fresh set of unique quests, bypassing the static starter quest array.

---

## Pedagogical Design
**The Learning Problem**: Rote memorization. Students often "memorize the path" rather than "learning the concept" when they repeat the same starter quests after a reset.
**The Cognitive Solution**: Varied Practice (Schmidt) suggests that practicing the same concept with different parameters leads to better generalization. Fresh quests force the user to apply logic rather than recall previous answers.

---

## Implementation Details
- **Frontend**: 
    - Update `GameStateService.resetProgress()` to set a flag for regeneration.
    - Modify `QuestEngineService` to call `ClaudeApiService.generateQuest()` for the first quest after a reset.
- **IRIS Backend**: —
- **AI Prompts**: Update the quest generation system prompt to emphasize variety and "Level 1" concepts for fresh starts.

---

## Verification Plan
1. Press "Reset All Progress" in settings.
2. Verify that the first quest received is different from the hard-coded `STARTER_QUESTS` in `starter-quests.ts`.
3. Confirm XP and Leveling still start at 1.
