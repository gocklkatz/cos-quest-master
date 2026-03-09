# Feature 05: Unified "Spiral" Quests (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Pedagogical Principle | Spiral Curriculum |
| Depends On | Feature 04 |

---

## Task Prompt
Design advanced quests that require data manipulation across three layers: ObjectScript Classes, SQL, and Raw Globals.

---

## Pedagogical Design
**The Learning Problem**: Paradigm Silos. Students often learn SQL and Objects as separate things, not realizing they are both views of the same Global data.
**The Cognitive Solution**: Spiral Curriculum (Bruner). Revisiting the same data (the "Member" record) with increasing depth and different tools (SQL -> Objects -> Globals) solidifies the "Unified Data Architecture" concept.

---

## Implementation Details
- **Frontend**: 
    - New quest definitions in `starter-quests.ts` targeting the `capstone` branch.
- **IRIS Backend**: —
- **AI Prompts**: Update Claude's evaluation logic to check for consistency across paradigms (e.g., "Did the SQL query return the same ID you just found in the Global tree?").

---

## Verification Plan
1. Start a "Spiral" quest.
2. Create a persistent object.
3. Query it via SQL.
4. Locate its raw data in the Global Visualizer.
5. Verify completion only when all three views are confirmed.
