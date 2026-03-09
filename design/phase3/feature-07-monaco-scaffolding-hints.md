# Feature 06: Code Prediction Quests (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-low |
| Status | ⬜ Not started |
| Pedagogical Principle | Worked Example Effect |
| Depends On | Feature 02 |

---

## Task Prompt
Implement a quest type where the user is presented with a complex routine and must predict the output using multiple-choice options, rather than writing code.

---

## Pedagogical Design
**The Learning Problem**: High Cognitive Load. Writing code from scratch (production) is much harder than reading and understanding code (comprehension).
**The Cognitive Solution**: The Worked Example Effect (Sweller). Studying completed examples reduces the burden on working memory, allowing the student to focus on the underlying logic of $PIECE, $EXTRACT, and $ORDER.

---

## Implementation Details
- **Frontend**: 
    - New `QuestType`: `prediction`.
    - Update `QuestPanel` to render radio buttons for multiple-choice answers.
    - Set Monaco editor to `readOnly`.
- **IRIS Backend**: —
- **AI Prompts**: Train Claude to generate "Code Parables"—complex but readable routines with clear, predictable outputs.

---

## Verification Plan
1. Load a "Code Prediction" quest.
2. Verify the editor is read-only.
3. Select the correct output from the choices.
4. Verify XP is awarded for a correct prediction.
