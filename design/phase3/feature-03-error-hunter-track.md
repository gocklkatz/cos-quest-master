# Feature 03: Error Hunter Track (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ⬜ Not started |
| Pedagogical Principle | Productive Failure |
| Depends On | Feature 07 |

---

## Task Prompt
Create a specialized quest track where users are given code with intentional bugs. The goal is to trigger specific IRIS error codes and then fix them.

---

## Pedagogical Design
**The Learning Problem**: Error phobia. Beginners are often paralyzed by legacy-style error messages like `<UNDEFINED>` or `<SUBSCRIPT>`.
**The Cognitive Solution**: Productive Failure (Kapur). By intentionally designing "failed" states, we help students build a robust diagnostic mental model and reduce the anxiety associated with errors.

---

## Implementation Details
- **Frontend**: 
    - Create a new quest branch `error-hunter` in `starter-quests.ts`.
    - Update `OutputPanel` to highlight and explain common IRIS error codes.
- **IRIS Backend**: —
- **AI Prompts**: Train Claude to identify when a user is in an "Error Hunter" quest and guide them toward the *trigger* first, then the *fix*.

---

## Verification Plan
1. Load an "Error Hunter" quest.
2. Execute code that triggers `<NOLINE>`.
3. Verify that the system rewards the user for successfully triggering the error before asking for the fix.
4. Fix the code and verify quest completion.
