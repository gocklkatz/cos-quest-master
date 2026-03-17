# Feature 21: IDE Quests (Phase 4)

| Field | Value |
|---|---|
| Phase | Phase 4 |
| Priority | phase4-low |
| Status | ⬜ Not started |
| Depends On | F6 (Code Prediction Quests — establishes alternative quest type pattern), C5 (Branch Architecture — determines where IDE quests slot in the curriculum) |
| Pedagogical Principle | Transfer-Appropriate Processing — learning is best retained when practice conditions match real-world conditions |

---

## Task Prompt

Implement a new quest type that requires the player to write real ObjectScript code in **VS Code** (with the IRIS extension) or **ObjectScript Studio**, rather than in the in-browser Monaco editor. QuestMaster displays the task description, then polls the IRIS Atelier API to detect when a matching class or method appears. When detected, it runs a structural check and a functional test suite and displays an AI-generated evaluation of the submitted code.

**Acceptance criteria**:
- A quest of type `ide` renders an instruction panel (no Monaco editor) with a "Waiting for your code…" indicator.
- The frontend polls `/api/atelier/v1/USER/doc/:class` every 3 seconds while the quest is active.
- On detection, the backend runs: existence check → structural check → functional test → AI review.
- Pass: XP is awarded and AI feedback is shown (same panel as standard quest evaluation).
- Fail: the specific failing check is surfaced ("method `Greet` not found", "test case 2 returned wrong value").
- A manual "Verify Now" button is available as a fallback to polling.
- Cleanup: after evaluation the test class is deleted from IRIS unless the player opts to keep it.

---

## Pedagogical Design

**The Learning Problem**: Players complete in-browser exercises but may struggle to transfer that knowledge to the actual IRIS development environment. The muscle memory for navigating VS Code + the InterSystems extension, compiling a class, and verifying it exists are skills not exercised by Monaco editor quests.

**The Cognitive Solution**: Transfer-Appropriate Processing — practice in the real environment directly builds the neural pathways needed for real-world use. IDE Quests force the player to use the actual toolchain, bridging the game-to-reality gap. They are most effective when introduced after foundational concepts are solid (hence the dependency on C5 and F6).

---

## Implementation Details

### Quest data model extension

Add `type: "ide"` alongside the existing `type: "code-prediction"` variant established by F6. The quest payload adds:

```typescript
interface IdeQuestSpec {
  type: "ide";
  targetClass: string;          // fully-qualified, e.g. "Training.PatientRecord"
  requiredMethods: string[];    // method names that must exist
  requiredProperties: string[]; // property names that must exist
  testCases: IdeTestCase[];     // functional tests run server-side
}

interface IdeTestCase {
  description: string;
  objectScriptExpr: string;     // expression to evaluate, e.g. '##class(Training.PatientRecord).Greet()'
  expectedOutput: string;       // expected string result
}
```

### AI prompt for quest generation

The Claude prompt for IDE quests must produce:
- A clear task description written as a developer story ("Create class `Training.PatientRecord` with property `Name` of type `%String` and method `Greet()` that returns `"Hello, " _ ..Name`").
- Exact class name, required methods/properties, and 2–3 test cases in structured JSON.
- Difficulty should be calibrated to current branch and player level (as per F18).

### Atelier polling (frontend)

`IdeQuestService` (or an extension of `QuestEngineService`) polls:

```
GET /api/atelier/v1/USER/doc/Training.PatientRecord.cls
```

A 200 response with a non-empty body triggers the verification flow. Poll interval: 3 s. Stop polling on quest completion or abandonment.

### Verification flow (IRIS backend — new endpoint)

Add `POST /api/quest/verify-ide` to `QuestMaster.REST.Execute`:

1. **Existence**: `##class(%Dictionary.ClassDefinition).%ExistsId(targetClass)`
2. **Structural**: Query `%Dictionary.MethodDefinition` and `%Dictionary.PropertyDefinition` for the required names.
3. **Functional**: Execute each `testCases[n].objectScriptExpr` via the existing execute infrastructure; compare output to `expectedOutput`.
4. Return a structured result:

```json
{
  "exists": true,
  "structuralPass": true,
  "missingMembers": [],
  "testResults": [
    { "description": "Greet returns correct string", "pass": true, "actual": "Hello, World" }
  ],
  "overallPass": true,
  "sourceCode": "Class Training.PatientRecord { ... }"
}
```

### AI evaluation

If `overallPass` is true, send `sourceCode` + quest description to Claude (same `ClaudeApiService` pattern as standard quest evaluation). Prompt:

> "The player was asked to implement [description]. Here is their ObjectScript code. Evaluate: correctness (0–10), style (0–10), one strength, one improvement suggestion."

Display result in the standard evaluation panel.

### Cleanup

After evaluation, call:
```
##class(%SYSTEM.OBJ).Delete(targetClass)
```
unless the player checks "Keep this class in my IRIS instance".

---

## Files Changed

*(to be filled in during implementation)*

- `quest-master/src/app/services/quest-engine.service.ts` — add `ide` quest type handling
- `quest-master/src/app/services/ide-quest.service.ts` — new: Atelier polling, verify-ide call
- `quest-master/src/app/quest-view/` — conditional rendering: instruction panel instead of Monaco editor
- `quest-master/iris/QuestMaster.REST.Execute.cls` — add `POST /verify-ide` route and handler
- `quest-master/proxy.conf.json` — confirm `/api/atelier` proxy entry exists

---

## Open Questions

- [ ] **Where in the curriculum do IDE quests appear?** Candidates: once per branch (as the final or penultimate quest), or only in the classes/SQL branches where file-system implementation is most natural. Depends on C5 decision.
- [ ] **Should the target class name be fixed or generated by AI?** Fixed names are easier to verify but feel repetitive across playthroughs. AI-generated names (e.g., `Training.MedCorp.PatientRecord_<session-id>`) avoid collisions but complicate cleanup.
- [ ] **What if the player already has a class with that name?** Pre-check existence before displaying the quest; if it exists, generate a unique namespace prefix.
- [ ] **Atelier authentication**: The `/api/atelier` proxy already handles credentials — confirm this is sufficient for polling without an additional auth step.

---

## Verification Plan

1. Start the app and reach a branch where IDE quests are enabled.
2. Confirm the quest renders an instruction panel with no Monaco editor and a polling indicator.
3. Open VS Code, create the specified class, compile it.
4. Confirm QuestMaster auto-detects the class within one poll cycle (≤ 3 s) without clicking "Verify Now".
5. Confirm a class with a missing method surfaces the structural check failure message.
6. Confirm a class with the wrong method output surfaces the functional test failure.
7. Confirm a fully passing submission awards XP and shows AI feedback.
8. Confirm the class is deleted from IRIS after evaluation (default behavior).
