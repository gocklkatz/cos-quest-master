# Phase 4 — Architecture Decision Log

Each entry records a significant fork in the road: what was decided, why, and what was rejected. Ordered chronologically.

---

### D-P4-01 · 2026-03-16: Infinite game model — Prestige / New Game+

**Context**: The game ends after ~21 quests. Phase 4 requires an infinite-play model. Four options were evaluated with input from a behavioral psychology specialist and an instructional designer. See [q1-infinite-game-analysis.md](q1-infinite-game-analysis.md) for the full analysis.

**Decision**: Option 2 — Prestige / New Game+. On Victory Screen, the player is offered a named prestige tier promotion ("Begin Journeyman Track"). Cumulative XP across all runs is preserved and displayed; only per-run quest count and branch progress reset. Difficulty tier increments in `GameStateService` and is passed to the AI prompt to produce qualitatively harder quests (debug → optimize → architect, not just syntactically harder versions). Free-practice mode (topic-tagged, no branch structure) is unlocked after the first Prestige completion.

**Rejected alternatives**:
- **Option 1 (Endless branch loops)**: No visible reset moment suppresses the goal gradient effect; structural repetition signals "filler" to professional developers.
- **Option 3 (Dynamic branch extension / AI mastery gate)**: Destroys goal visibility; transfers progression agency to a hidden algorithm, creating learned helplessness risk for control-oriented professional learners.
- **Option 4 (Infinite side-quests) as primary model**: No habit loop scaffold; platform becomes a reference tool rather than a daily learning system. Retained as a post-Prestige unlock.

**Affects**: [feature-17-infinite-quest-loop.md](feature-17-infinite-quest-loop.md)

---

<!-- Add entries as decisions are made. Use the format below. -->

<!--
## D1 — [Short title]

**Decision**: [What was decided.]

**Rationale**: [Why this option over the alternatives.]

**Rejected**: [What was considered and discarded, and why.]

**Affects**: [Feature N](feature-NN-*.md)
-->
