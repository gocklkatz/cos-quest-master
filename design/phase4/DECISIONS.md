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

### D-P4-02 · 2026-03-16: Narrative story arc — Story-driven quest titles

**Context**: Quests felt isolated with no connective tissue. Four narrative options were evaluated with parallel input from a UX Researcher and a Behavioral Nudge Engine specialist. Both analyses independently converged on the same recommendation. See [q2-narrative-arc-ux-research.md](q2-narrative-arc-ux-research.md) and [q2-narrative-arc-behavioral-nudge.md](q2-narrative-arc-behavioral-nudge.md) for the full analyses.

**Decision**: Option 2 — Story-driven quest titles. The AI prompt is updated to name each quest as a story episode (e.g., "Chapter 2, Mission 3: Retrieve the Missing Patient Records"). No structural changes to quests, branches, or state. Register must be dry, technically credible, and enterprise-contextual — not heroic or gamified. This acts as both the motivational layer and the instrumentation to validate whether the cohort responds to narrative framing before committing to a full frame narrative (Option 1).

**Rejected alternatives**:
- **Option 1 (Frame narrative)**: Higher structural cost; commitment before audience response is validated. Retained as the confirmed next step if Option 2 engagement signals are positive.
- **Option 3 (Progressive world-building / lore)**: Extrinsic reward that crowds out intrinsic motivation (Deci, Koestner & Ryan 1999 meta-analysis); low pedagogical value; cognitive overhead for limited-session professional learners.
- **Option 4 (No story)**: Risk of narrative feeling childish is a risk of register, not of narrative itself. Research supports narrative for this product category when executed at professional register.

**Affects**: [feature-20-narrative-story-arc.md](feature-20-narrative-story-arc.md)

---

### D-P4-03 · 2026-03-16: Adaptive difficulty — Manual toggle + level-gated prompts

**Context**: Phase 3 difficulty scales linearly with branch progression but does not adapt to individual skill. A skilled developer sees the same beginner quests as a newcomer, risking first-session dropout. Four options were evaluated by a game designer specialising in systems design and player psychology. See [q3-adaptive-difficulty-game-designer.md](q3-adaptive-difficulty-game-designer.md) for the full analysis.

**Decision**: Option 4 (manual difficulty toggle) as the primary control, with Option 1 (level-gated AI prompts) as the continuous scaling layer. At first session, the player selects Beginner / Intermediate / Advanced. This sets the starting tier and initial branch in a new `DifficultyService` that computes `effectiveTier` by merging the manual preference with the XP-derived level. The existing tier signal in `ClaudeApiService.generateQuest()` is preserved as the delivery mechanism.

**Rejected alternatives**:
- **Option 2 (Score-based adaptation)**: Theoretically sound but premature — AI-generated scores driving AI-generated difficulty creates a co-produced feedback loop with low measurement reliability. Deferred to Phase 5 once Code Prediction quests provide binary correctness signals.
- **Option 3 (Initial skill assessment)**: High potential value but requires branch-skip architecture (C5) and a calibrated diagnostic quest set that does not yet exist. Deferred to Phase 5.
- **Option 1 alone**: Already 80% built but XP is a proxy for time-on-task, not mastery. Retained as the execution mechanism within the manually-chosen band, not as the sole control.

**Affects**: [feature-18-adaptive-difficulty.md](feature-18-adaptive-difficulty.md)

---

<!-- Add entries as decisions are made. Use the format below. -->

<!--
## D1 — [Short title]

**Decision**: [What was decided.]

**Rationale**: [Why this option over the alternatives.]

**Rejected**: [What was considered and discarded, and why.]

**Affects**: [Feature N](feature-NN-*.md)
-->
