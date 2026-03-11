# Feature 06: Code Prediction Quests (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-low |
| Status | ⬜ Not started |
| Pedagogical Principle | Worked Example Effect |
| Depends On | Feature 02 |

---

## Task Prompt
Implement a quest type where the user is presented with a short, deterministic routine and must predict its output by selecting from multiple-choice options. The choices and the correct answer are AI-generated alongside the quest. The editor is read-only; grading is local (no Claude call at submission time).

---

## Pedagogical Design
**The Learning Problem**: High Cognitive Load. Writing code from scratch (production) is much harder than reading and understanding code (comprehension).
**The Cognitive Solution**: The Worked Example Effect (Sweller). Studying completed examples reduces the burden on working memory, allowing the student to focus on the underlying logic of `$PIECE`, `$EXTRACT`, and `$ORDER`.

---

## Implementation Details

### Model (`quest.models.ts`)
Add three optional fields to `Quest`:
```ts
questType?: 'standard' | 'prediction';
choices?: string[];       // 3-4 options, one of which equals correctAnswer
correctAnswer?: string;   // must match one entry in choices exactly
```
`questType` defaults to `'standard'` when absent. The `normalizeQuest()` function requires no changes — the new fields pass through the existing `...rest` spread.

### Trigger mechanism (`quest-engine.service.ts`)
`QuestEngineService.generateNextQuest()` determines quest type before calling `ClaudeApiService.generateQuest()`. A prediction quest is generated when **both** conditions hold:
1. At least 1 quest in the current branch has already been completed (`completedInBranch >= 1`).
2. The 0-based index of the quest being generated satisfies `completedInBranch % 4 === 3` (i.e. every 4th quest, starting from position 3).

```ts
const completedInBranch = /* count of completed quests for currentBranch */;
const questType = (completedInBranch >= 1 && completedInBranch % 4 === 3)
  ? 'prediction'
  : 'standard';
```

Pass `questType` to `ClaudeApiService.generateQuest()` as an optional parameter.

### AI prompt (`claude-api.service.ts`)
`generateQuest()` gains an optional `questType: 'standard' | 'prediction' = 'standard'` parameter.

When `questType === 'prediction'`, the system prompt is modified:
- The routine in `files[0].starterCode` must be **deterministic and ≤ 10 lines**.
- The JSON schema must include two extra fields:
  ```json
  "choices": ["string (3–4 options)"],
  "correctAnswer": "string (must match one entry in choices exactly)"
  ```
- Instruct Claude to include plausible distractors (e.g. off-by-one results, wrong delimiter splits).
- `evaluationCriteria` should describe the reasoning behind the correct answer.

### Frontend — read-only editor (`quest-view.component.ts` / `code-editor.component.ts`)
`questType === 'prediction'` is the source of truth for read-only state. Do **not** rely on `QuestFile.readOnly` for this — that field is reserved for per-file scaffolding in multi-file quests.

`QuestViewComponent` passes `[readOnly]="currentQuest()?.questType === 'prediction'"` to `CodeEditorComponent`. `CodeEditorComponent` forwards this to Monaco via `editor.updateOptions({ readOnly })`.

### Frontend — choice UI (`quest-panel.component.html`)
When `questType === 'prediction'`:
- Hide the **Run** button.
- Render a radio-button group for `choices`.
- Show a **Submit Answer** button that becomes active once a choice is selected.
- Disable the radio buttons and Submit button after the first submission.

### Completion flow
On submission, grade locally and synthesise a minimal `EvaluationResult`:

```ts
const isCorrect = selectedChoice === quest.correctAnswer;
const result: EvaluationResult = {
  passed: isCorrect,
  score: isCorrect ? 100 : 0,
  bonusAchieved: [],
  feedback: isCorrect
    ? 'Correct! Your prediction matched the output.'
    : `Not quite. The correct answer was: ${quest.correctAnswer}`,
  codeReview: quest.evaluationCriteria,   // explanation of the logic
  xpEarned: isCorrect ? quest.xpReward : 0,
};
```

Pass this `EvaluationResult` through the **existing** evaluation pipeline (same path as a standard quest): `ReviewModal` is shown, XP is awarded via `GameStateService`, and next-quest generation fires after the player dismisses the modal.

**Wrong answer / retry rule**: After a wrong answer the `ReviewModal` reveals the correct answer and the explanation (via `codeReview`). When the player dismisses the modal, quest progression continues normally — no retry is offered. A wrong prediction is treated as a learning moment, not a blocking failure. XP is zero.

### IRIS Backend
None required.

---

## Files Changed

- `src/app/models/quest.models.ts` — add `questType`, `choices`, `correctAnswer` to `Quest`
- `src/app/services/claude-api.service.ts` — add `questType` param to `generateQuest()`; extend prompt and JSON schema
- `src/app/services/quest-engine.service.ts` — compute `questType` before calling `generateQuest()`; pass to service
- `src/app/components/quest-panel/quest-panel.component.html` — choice radio-button UI, hide Run button for prediction quests
- `src/app/components/quest-panel/quest-panel.component.ts` — `selectedChoice` signal, `submitPrediction()` method
- `src/app/components/quest-view/quest-view.component.ts` — pass `readOnly` input to `CodeEditorComponent`
- `src/app/components/code-editor/code-editor.component.ts` — accept and apply `readOnly` input to Monaco

---

## Open Questions

*(none — all design questions resolved; see DECISIONS.md 2026-03-11 F6 entries)*

---

## Verification Plan
1. Complete enough quests in any branch so that `completedInBranch % 4 === 3` is satisfied; verify `generateQuest()` is called with `questType: 'prediction'`.
2. Verify the generated `Quest` object contains `questType: 'prediction'`, a `choices` array (3–4 entries), and a `correctAnswer` that matches one choice.
3. Verify the Monaco editor is read-only (typing has no effect).
4. Verify the Run button is hidden and the radio-button choice group is rendered.
5. Select the correct answer and click Submit — verify `ReviewModal` opens with `passed: true`, XP equal to `xpReward` is awarded, and next quest loads after dismissal.
6. On a fresh prediction quest, select a wrong answer — verify `ReviewModal` opens with `passed: false`, the `codeReview` field shows the explanation, XP is zero, and next quest loads after dismissal.
7. Verify `ng build` and `ng test` produce zero errors/regressions.
