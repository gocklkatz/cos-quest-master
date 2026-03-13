# Bug B1: Class Definition executed as script (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Depends On | F5 (Unified Spiral Quests — introduces class-based quests) |

---

## Problem

When the **Class Definition** tab is active and the player clicks **Run on IRIS**, the app calls `/api/quest/execute`, which wraps the code in a temporary routine and runs it as ObjectScript. The `Class` keyword is not a valid ObjectScript command, so IRIS returns:

```
FEHLER #5475: … #1026: Invalid command : 'Class' : Offset:6
```

Class definitions are source files that must be **compiled** — they cannot be executed as routines.

---

## Root Cause

The "Run on IRIS" button always calls `/execute` regardless of which tab is active. It needs to detect the active tab and route to `/compile` for class-definition content.

---

## Fix

In `QuestViewComponent` (or wherever the run button is wired):

1. Detect the active editor tab (`classDefinition` vs `solutionScript`).
2. If the active tab is **Class Definition**, call `IrisService.compile(code)` → `POST /api/quest/compile`.
3. If the active tab is **Solution Script**, call `IrisService.execute(code)` → `POST /api/quest/execute` (existing behaviour).
4. Display compile errors and success messages in the output pane in the same way execution output is shown today.

---

## Acceptance Criteria

- [ ] Clicking **Run on IRIS** while the Class Definition tab is active compiles the class (no `Invalid command` error).
- [ ] A successful compile shows a confirmation message in the output pane (e.g. `Compiled OK: Learning.Adventurer`).
- [ ] Compile errors (syntax, missing superclass, etc.) are displayed clearly in the output pane.
- [ ] Clicking **Run on IRIS** while the Solution Script tab is active still executes normally (no regression).

---

## Files Changed

- `quest-master/src/app/services/claude-api.service.ts` — added `isClassBranch` flag; branches the constraint text and JSON schema in `generateQuest` so `classes`/`capstone` quests receive a two-file template (`.cls` + `.script`) while all other branches keep the single-file script template
