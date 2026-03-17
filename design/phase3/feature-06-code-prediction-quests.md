# Feature 06: Code Prediction Quests (Phase 3 → Phase 4 carry-over)

| Field | Value |
|---|---|
| Phase | Phase 4 (carry-over from Phase 3) |
| Priority | phase4-high |
| Status | ⬜ Not started |
| Pedagogical Principle | Worked Example Effect |
| Depends On | [Feature 02 — AI Elaborative Interrogation](feature-02-ai-elaborative-interrogation.md) · [Change 05 — Branch Architecture](../phase4/change-05-branch-architecture.md) (sub-branch topic strings) |

---

## Task Prompt
Implement a quest type where the user is presented with a short, deterministic routine and must predict its output by selecting from multiple-choice options. The choices and the correct answer are AI-generated alongside the quest. The editor is read-only; grading is local (no Claude call at submission time).

Prediction quests must be triggered by a **three-layer frequency system** (D-P4-05):
1. **Post-failure trigger (mandatory baseline)**: After any failed Write or Debug submission, the next quest is automatically a Code Prediction quest on the same sub-branch topic. A failed prediction quest must not cascade into another prediction quest.
2. **Branch-specific weighting (ambient layer)**: `QuestEngineService` carries a per-sub-branch `predictionWeight` coefficient. Higher in Methods, Inheritance, Relationships, Joins, Aggregation, Embedded SQL (target: one Prediction quest per 3-quest window). Lower in Setup and Globals.
3. **Minimum frequency floor**: One Code Prediction quest per 5 quests in any branch as a backstop for consistently-succeeding learners. Not a scheduling driver.

After each prediction quest, the player is shown an in-quest continuation/exit choice ("Back to writing" pre-selected as default). No settings toggle for prediction frequency.

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
`QuestEngineService.generateNextQuest()` determines quest type before calling `ClaudeApiService.generateQuest()` using a three-layer priority system:

**Layer 1 — Post-failure trigger (highest priority)**
If the previous quest was a Write or Debug quest and it was failed (`passed === false`), force `questType = 'prediction'` with the same sub-branch topic. A failed prediction quest does **not** trigger another prediction quest (break the cascade).

**Layer 2 — Branch-specific weighting**
Each sub-branch carries a `predictionWeight` coefficient (0–1). `QuestEngineService` draws a random value and compares against the weight for the current sub-branch:

```ts
const PREDICTION_WEIGHTS: Record<string, number> = {
  // High weight — reading comprehension is critical
  'classes-methods':        0.33,
  'classes-inheritance':    0.33,
  'classes-relationships':  0.33,
  'sql-joins':              0.33,
  'sql-aggregation':        0.33,
  'sql-embedded':           0.33,
  // Low weight — mainly triggered by Layer 1 or Layer 3
  'setup':                  0.10,
  'globals':                0.10,
  'classes-properties':     0.15,
  'sql-queries':            0.15,
};
```

**Layer 3 — Minimum frequency floor (lowest priority)**
If no prediction quest has been generated in the last 5 quests for the current branch, force `questType = 'prediction'` regardless of weight. This is a backstop only — not a scheduling driver.

```ts
const questType = resolveQuestType(lastQuestResult, subBranch, recentQuestTypes);
```

Pass `questType` and the current `subBranch` topic string to `ClaudeApiService.generateQuest()`.

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

### In-quest continuation choice
After the `ReviewModal` is dismissed for any prediction quest (pass or fail), show an inline choice before generating the next quest:
- **"Back to writing"** (pre-selected default) — next quest is a standard Write or Debug quest
- **"Another prediction"** — next quest is another Code Prediction quest on the same sub-branch topic

This replaces the deferred settings-level player toggle (D-P4-05). The choice must not appear after a post-failure-triggered prediction quest — in that case, resume normal quest type selection immediately.

### IRIS Backend
None required.

---

## Files Changed

- `src/app/models/quest.models.ts` — add `questType`, `choices`, `correctAnswer` to `Quest`
- `src/app/services/claude-api.service.ts` — add `questType` and `subBranch` params to `generateQuest()`; extend prompt and JSON schema
- `src/app/services/quest-engine.service.ts` — implement three-layer `resolveQuestType()` logic; add `PREDICTION_WEIGHTS` map; track `lastQuestResult` and `recentQuestTypes`; pass `subBranch` to `generateQuest()`
- `src/app/components/quest-panel/quest-panel.component.html` — choice radio-button UI; hide Run button for prediction quests; in-quest continuation/exit choice UI
- `src/app/components/quest-panel/quest-panel.component.ts` — `selectedChoice` signal; `submitPrediction()` method; `continuationChoice` signal for post-prediction UI
- `src/app/components/quest-view/quest-view.component.ts` — pass `readOnly` input to `CodeEditorComponent`
- `src/app/components/code-editor/code-editor.component.ts` — accept and apply `readOnly` input to Monaco

---

## Open Questions

- [ ] C5 (Branch Architecture) must define the final `subBranch` string identifiers before `PREDICTION_WEIGHTS` map can be finalised — implementation of F6 trigger layer must follow C5.

---

## Verification Plan

**Quest type resolution**
1. Fail a Write or Debug quest — verify the immediately following quest has `questType: 'prediction'` and the same `subBranch` topic.
2. Fail a prediction quest — verify the next quest is **not** a prediction quest (cascade prevention).
3. Succeed 5 consecutive quests in a branch with `predictionWeight = 0.10` (Setup/Globals) — verify a prediction quest is forced by the minimum floor before the 6th quest.
4. In a `predictionWeight = 0.33` sub-branch (e.g. `classes-methods`), complete 9 quests — verify at least 2–3 were prediction quests.

**Quest content and UI**
5. Verify the generated `Quest` object contains `questType: 'prediction'`, a `choices` array (3–4 entries), and a `correctAnswer` that matches one choice exactly.
6. Verify the Monaco editor is read-only (typing has no effect).
7. Verify the Run button is hidden and the radio-button choice group is rendered.

**Grading and flow**
8. Select the correct answer and click Submit — verify `ReviewModal` opens with `passed: true`, XP equal to `xpReward` is awarded.
9. Dismiss the modal — verify the in-quest continuation choice is shown with "Back to writing" pre-selected.
10. Select "Another prediction" — verify the next quest is a prediction quest on the same sub-branch.
11. On a fresh prediction quest, select a wrong answer — verify `ReviewModal` shows `passed: false`, `codeReview` displays the explanation, XP is zero, and next quest loads after dismissal.
12. Verify the continuation choice does **not** appear after a post-failure-triggered prediction quest.

**Build**
13. `ng build` and `ng test` produce zero errors/regressions.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md) · [Phase 4 Main](../phase4/phase4_main.md)
- Decisions: [Phase 3 DECISIONS.md](DECISIONS.md) · [Phase 4 DECISIONS.md — D-P4-05](../phase4/DECISIONS.md)
