# Feature 06: Code Prediction Quests (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-low |
| Status | ⬜ Not started |
| Pedagogical Principle | Worked Example Effect |
| Depends On | Feature 02 |

---

## Task Prompt
Implement a quest type where the user is presented with a complex routine and must predict its output by selecting from multiple-choice options. The choices and the correct answer are AI-generated alongside the quest.

---

## Pedagogical Design
**The Learning Problem**: High Cognitive Load. Writing code from scratch (production) is much harder than reading and understanding code (comprehension).
**The Cognitive Solution**: The Worked Example Effect (Sweller). Studying completed examples reduces the burden on working memory, allowing the student to focus on the underlying logic of `$PIECE`, `$EXTRACT`, and `$ORDER`.

---

## Implementation Details
- **Frontend**:
    - Add optional fields to `Quest` in `quest.models.ts`:
      ```ts
      questType?: 'standard' | 'prediction';
      choices?: string[];       // 3-4 options, one correct
      correctAnswer?: string;   // must match one entry in choices
      ```
    - In `QuestPanel`: when `questType === 'prediction'`, render radio buttons instead of the Run button.
    - Set the Monaco editor to `readOnly: true` for prediction quests.
    - On answer selection, compare against `correctAnswer` locally (no Claude call needed for grading).
    - Award `xpReward` on correct answer; show `correctAnswer` with explanation on wrong answer.
- **IRIS Backend**: —
- **AI Prompts**:
    - Extend `ClaudeApiService.generateQuest()` to accept an optional `questType: 'prediction'` parameter.
    - When generating a prediction quest, Claude must also return `choices` (3-4 strings) and `correctAnswer` in the JSON response.
    - The routine in `starterCode` must be deterministic and short (≤ 10 lines).

---

## Verification Plan
1. Trigger generation of a prediction quest (branch: `prediction`).
2. Verify the Monaco editor is read-only.
3. Verify four radio-button choices are rendered.
4. Select the correct answer — verify XP is awarded.
5. Select a wrong answer — verify the correct answer is revealed with no XP.
6. Verify `ng build` succeeds with the new optional `Quest` fields.
