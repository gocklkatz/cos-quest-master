# Feature 05: Unified "Spiral" Quests (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Pedagogical Principle | Spiral Curriculum |
| Depends On | Feature 04, Feature 02 |

---

## Task Prompt
Design a capstone quest chain of three linked quests that each interact with the same data through a different paradigm: Objects, SQL, and Raw Globals. No changes to the Quest data model are required — the three quests are linked via `prerequisites`.

---

## Pedagogical Design
**The Learning Problem**: Paradigm Silos. Students often learn SQL and Objects as separate things, not realizing they are both views of the same Global data.
**The Cognitive Solution**: Spiral Curriculum (Bruner). Revisiting the same data (a "GuildMember" record) with increasing depth and different tools (Objects → SQL → Globals) solidifies the "Unified Data Architecture" concept.

---

## Implementation Details
- **Frontend**:
    - Add three new quest definitions in `starter-quests.ts` targeting the `capstone` branch:
        1. `capstone-01`: Create a `GuildMember` object using `%New()` and `%Save()`.
        2. `capstone-02` (prereq: `capstone-01`): Query the saved member using `%OpenId()` or embedded SQL (`&sql(...)`).
        3. `capstone-03` (prereq: `capstone-02`): Locate the raw global storage using `$ORDER` on `^GuildMember.MemberD`.
    - The Global Tree Visualizer (F04) should be open during `capstone-03` to make the data visible.
- **IRIS Backend**: —
- **AI Prompts**: Update Claude's evaluation logic in `capstone-02` and `capstone-03` to cross-reference the ID found in the previous quest step (via `evaluationCriteria` wording).

---

## Files Changed

- `quest-master/src/app/data/starter-quests.ts` — add three `capstone-01/02/03` quest definitions

---

## Open Questions

- [ ] **GuildMember class strategy (blocking)**: `capstone-01` calls `%New()` / `%Save()` on a `GuildMember` class. Should the player *define* that class as part of the quest (multi-file quest: one `.cls` file + one `.script` file), or should a pre-seeded `GuildMember` class be compiled into IRIS before the quest starts? Option A requires a multi-file quest setup; option B requires a backend setup step not currently specified anywhere.

- [ ] **Correct global name for capstone-03 (blocking)**: The spec hardcodes `^GuildMember.MemberD` but the actual IRIS storage global depends on the class package. If the class is `User.GuildMember`, the global is `^User.GuildMemberD`. The correct name cannot be determined until the class name used in `capstone-01` is fixed. Update `capstone-03`'s hints and `evaluationCriteria` once resolved.

- [ ] **ID threading between capstone-01 and capstone-02**: There is no mechanical way to pass the saved `%Save()` ID forward to `capstone-02`. Evaluation relies entirely on Claude reading the player's code. The `evaluationCriteria` for `capstone-02` must instruct Claude to accept *any* valid `%OpenId()` or `&sql(...)` call targeting a plausible ID, not a specific hardcoded one.

- [ ] **F04 dependency scope**: The Verification Plan (step 5) requires the Global Tree Visualizer (F04, ⬜ Not started) to be live. F04 has 6 unresolved open questions of its own. `capstone-03` quest data can be written and gated without F04 — the visualizer is only needed for verification. Decide: merge F05 quest definitions before F04 is complete, and defer verification step 5?

- [ ] **Test coverage**: No automated test is specified. Per CLAUDE.md, at least one test is required. Likely candidate: a Vitest unit test in `quest-engine.service.spec.ts` that loads the three capstone quests and verifies prerequisite gating (capstone-02 unlocks only after capstone-01 is completed, etc.).

---

## Verification Plan
1. Start `capstone-01`. Create a `GuildMember` object and save it.
2. Proceed to `capstone-02`. Query the member by the ID obtained in step 1.
3. Proceed to `capstone-03`. Find the raw global entry using `$ORDER`.
4. Verify all three quests complete individually, each gated by `prerequisites`.
5. Verify the Global Tree Visualizer shows `^GuildMember.MemberD` during `capstone-03`. *(Requires F04 to be complete.)*
