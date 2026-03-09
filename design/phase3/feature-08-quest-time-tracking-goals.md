# Feature 07: Monaco "Scaffolding" Hints (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ⬜ Not started |
| Pedagogical Principle | Scaffolding |
| Depends On | Feature 08 |

---

## Task Prompt
Implement real-time syntax "guardrails" in the Monaco editor to identify common ObjectScript whitespace and operator mistakes before the code is executed.

---

## Pedagogical Design
**The Learning Problem**: Semantic Noise. Beginners get frustrated by non-logic errors, like forgetting the space after `SET` or using `+` instead of `_` for strings.
**The Cognitive Solution**: Scaffolding (Wood et al.). Providing temporary support that prevents frustration and allows the learner to focus on the higher-level logic. This support "fades" as the learner's level increases.

---

## Implementation Details
- **Frontend**: 
    - Use `monaco.editor.setModelMarkers` to add real-time warnings.
    - Define a set of "Beginner Pitfalls" (whitespace, operators, case sensitivity).
    - Implement "Fading": Disable certain hints once the user reaches Level 5+.
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Verification Plan
1. Type `SETx=1` (missing space).
2. Verify a yellow warning appears in Monaco.
3. Type `"Hello" + name`.
4. Verify a warning suggests using `_` for concatenation.
5. Reach Level 5 and verify the basic whitespace hints are disabled (faded).
