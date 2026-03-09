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

## Verification Plan
1. Start `capstone-01`. Create a `GuildMember` object and save it.
2. Proceed to `capstone-02`. Query the member by the ID obtained in step 1.
3. Proceed to `capstone-03`. Find the raw global entry using `$ORDER`.
4. Verify all three quests complete individually, each gated by `prerequisites`.
5. Verify the Global Tree Visualizer shows `^GuildMember.MemberD` during `capstone-03`.
