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

**Narrative register clarification** (resolves Q2 tone ambiguity between the two analyses): The UX Research analysis referenced a "Zachtronics register — dry, professional, slightly absurdist." This should be read narrowly: the "slight absurdism" refers to the deadpan, bureaucratic tone of internal enterprise tickets ("the nightly ETL has been failing since the migration that nobody documented"), not to comedy or surreal content. The Behavioral Nudge framing ("domain-authentic contexts, not generic drama") is the implementation constraint — all scenarios should be plausible enterprise IRIS incidents. Dry irony that emerges naturally from realistic enterprise dysfunction is acceptable; invented drama or invented humor is not.

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

### D-P4-04 · 2026-03-16: Branch architecture — Sub-branches for Classes and SQL

**Context**: Phase 3 retrospective found 5 quests per branch insufficient, especially for Classes and SQL. Five structural options were evaluated in parallel by a Game Designer and a UX Researcher. Both analyses independently converged on the same recommendation. See [q4-branch-architecture-game-designer.md](q4-branch-architecture-game-designer.md) and [q4-branch-architecture-ux-research.md](q4-branch-architecture-ux-research.md) for the full analyses.

**Decision**: Option 3 — Sub-branches. The Classes branch splits into Properties → Methods → Inheritance → Relationships (3–4 quests each, 13 quests minimum). The SQL branch splits into Queries → Joins → Aggregation → Embedded SQL (3 quests each, 12 quests minimum). Total curriculum grows from ~21 to ~41 quests minimum. Each sub-branch has its own `topicFocus` string passed to `ClaudeApiService.generateQuest()` to constrain AI output to the specific sub-topic. The `BRANCH_PROGRESSION` array expands; no existing service interface changes shape — `currentBranch` remains a string signal. A bridge fix (raise classes to 8, SQL to 6 in `minQuestsToAdvance`) applies immediately while C5 is implemented.

**Rejected alternatives**:
- **Option 1 (Increase quest count)**: A quota increase, not a depth increase. More generic-branch quests do not improve coverage of inheritance or relationships; they extend the branch without targeting the gap. Retained as a temporary bridge fix only.
- **Option 2 (Variable-length / mastery gate)**: Correct long-term direction but premature — AI-generated evaluation scores are not reliable enough to gate advancement without creating opaque failure states. Deferred to Phase 5 after Code Prediction quests (F6) provide binary correctness signals.
- **Option 4 (Topic tags as primary model)**: Destroys branch legibility and progress orientation. Wrong architecture for the main curriculum; correct architecture for the post-Prestige free-practice mode already decided in D-P4-01.
- **Option 5 (Parallel tracks)**: Doubles the design and maintenance surface for marginal differentiation over what the Q3 manual difficulty toggle already provides. Deferred until learner archetype data validates the track split.

**Affects**: [change-05-branch-architecture.md](change-05-branch-architecture.md)

---

### D-P4-05 · 2026-03-17: Code Prediction quest frequency — post-failure trigger + branch weighting

**Context**: Code Prediction quests (F6) are not yet implemented. The user expects them to appear more often than the original design implied (one type among many, rarely triggered). Four options were evaluated in parallel by a Behavioral Nudge Engine specialist and a Game Designer. See [q5-code-prediction-frequency-behavioral-nudge.md](q5-code-prediction-frequency-behavioral-nudge.md) and [q5-code-prediction-frequency-game-designer.md](q5-code-prediction-frequency-game-designer.md) for the full analyses.

**Decision**: Three-layer system following the Behavioral Nudge Engine recommendation:
1. **Option 3 (post-failure trigger) — mandatory baseline**: After any failed Write or Debug submission, the next quest is automatically a Code Prediction quest on the same sub-branch topic. Topic continuity is a hard requirement before shipping. A failed prediction quest must not cascade into another prediction quest.
2. **Option 2 (branch-specific weighting) — ambient layer**: `QuestEngineService` carries a per-sub-branch `predictionWeight` coefficient. Highest in Methods, Inheritance, Relationships, Joins, Aggregation, Embedded SQL (target: one Prediction quest per 3-quest window). Lower in Setup and Globals (triggered mainly by Option 3).
3. **Option 1 (guaranteed ratio) — minimum-frequency floor only**: One Code Prediction quest per 5 quests in any branch, as a backstop to prevent complete absence for consistently-succeeding learners. Not a scheduling driver.
4. **Option 4 (player toggle) — deferred**: Replaced by an in-quest continuation/exit choice after each prediction quest ("Back to writing" pre-selected as default). Settings toggle deferred until engagement data validates demand.

**Rejected alternatives**:
- **Option 1 as primary mechanism**: Fixed ratios produce a predictable pattern that destroys the variable-reward loop; indifferent to learner state. Retained only as a minimum floor.
- **Option 4 (settings toggle) as primary autonomy mechanism**: Discovered only by already-engaged learners; those who need scaffolding most will never find it. Replaced by in-quest choice at the natural decision point.

**Affects**: [feature-06-code-prediction-quests.md](../phase3/feature-06-code-prediction-quests.md)

---

### D-P4-06 · 2026-03-17: Boss Quest placement — one per sub-branch, not per parent branch

**Context**: The Q6 analyses described Boss Quests as "the final quest in each branch," but D-P4-04 introduced sub-branches. It was unspecified whether Boss Quests belong at the end of each sub-branch or each parent branch (e.g., one Boss Quest for all of Classes, or one per Properties / Methods / Inheritance / Relationships). The Behavioral Nudge analysis (line 213–214) stated "the Boss Quest must be the final quest in a branch" but was written before sub-branches existed.

**Decision**: Boss Quest = the final quest in each sub-branch. With four Classes sub-branches and four SQL sub-branches, the curriculum has 8 sub-branch Boss Quests plus 1 for each remaining branch (Setup, Globals, Capstone) = 11 Boss Quests total in a full first-run curriculum. The capstone branch's Boss Quest serves as the game's climactic finale. The Behavioral Nudge requirement ("branch must end with the Boss Quest, and branch completion must immediately follow") applies at the sub-branch level — a sub-branch completes on Boss Quest success, transitioning to the next sub-branch or parent-branch completion.

**Rejected alternatives**:
- **One Boss Quest per parent branch (e.g., one for all of Classes)**: Would require synthesising Properties, Methods, Inheritance, and Relationships into a single climactic quest. Too broad — the Boss Quest's narrative power comes from being the climax of a focused sub-topic arc, not a survey of everything. Also misaligns with the UX Research framing of Boss Quests as "sub-branch climax synthesis quests."
- **Boss Quest only at parent-branch boundaries**: Leaves sub-branches without a climactic endpoint, reducing the goal-gradient effect identified in both Q6 analyses.

**Affects**: [feature-19-enhanced-gamification.md](feature-19-enhanced-gamification.md)

---

### D-P4-07 · 2026-03-17: Hint System cost model — percentage-based, not fixed XP

**Context**: The Q6 analyses specified hint costs inconsistently. The UX Research analysis specified percentage-based costs (Level 1 = 10%, Level 2 = 25%, Level 3 = 50% of quest XP reward). The Behavioral Nudge analysis used a fixed "30 XP" example for Level 1 without specifying a model, and left Level 2 and Level 3 costs undefined.

**Decision**: Percentage-based costs are canonical: Level 1 = 10% of quest XP reward, Level 2 = 25%, Level 3 = 50%. Costs are deducted immediately on hint request (not on quest completion). The Behavioral Nudge's "30 XP" was an illustrative example consistent with a ~300 XP quest, not a fixed specification. Percentage-based is the correct model because quest XP rewards vary across branches and difficulty tiers — a fixed cost would be trivially cheap on high-XP quests and prohibitively expensive on low-XP quests. Minimum hint costs (even if 10% rounds to less than 5 XP) are clamped to 5 XP to ensure the cost is always perceptible.

A minimum engagement threshold applies before hints unlock: Level 1 requires at least 1 failed submission; Level 2 requires 2; Level 3 requires 3. This ensures hints follow genuine struggle.

**Rejected alternatives**:
- **Fixed XP costs (e.g., 30 / 60 / 120)**: Not robust across difficulty tiers and branch XP scaling. A 30 XP cost on a 50 XP quest removes 60% of the reward; the same cost on a 500 XP quest is barely a rounding error.
- **Flat percentage without minimums**: At very low XP rewards (early-branch beginner quests), even 10% rounds to 1–2 XP — below the perception threshold. The 5 XP minimum clamp addresses this.

**Affects**: [feature-19-enhanced-gamification.md](feature-19-enhanced-gamification.md)

---

### D-P4-08 · 2026-03-17: Adaptive difficulty — sub-branch entry points per difficulty preference

**Context**: D-P4-03 decided that a manual difficulty toggle (Beginner / Intermediate / Advanced) sets the initial starting branch. The Q3 (Adaptive Difficulty) analysis specified that Intermediate "bypasses setup" and Advanced "bypasses setup and commands." The Q4 (Branch Architecture) analysis was written with the sub-branch model in mind and specified more precise entry points: Intermediate enters at `classes-properties`; Advanced enters at `classes-methods` or `sql-queries`. These are incompatible — the Q3 analysis was written before sub-branches were decided.

**Decision**: Q4 entry points are canonical (written with the sub-branch architecture). `DifficultyService.getInitialSubBranch()` maps difficulty preference as follows:
- **Beginner**: starts at `setup` (no skip)
- **Intermediate**: starts at `classes-properties` (skips `setup`, `commands`, `globals`)
- **Advanced**: player is asked a secondary question at first session — "More OOP background or more SQL background?" — and enters at `classes-methods` (OOP-focused) or `sql-queries` (SQL-focused), skipping all preceding sub-branches

The Q3 analysis description of Advanced as "bypasses setup and commands" was an approximation written before the sub-branch model was finalised and is now superseded by this entry.

**Rejected alternatives**:
- **Q3 entry points (skip only setup and commands for Advanced)**: Inconsistent with the sub-branch architecture. Entering Advanced at the beginning of the Classes parent-branch would mean completing all four sub-branches sequentially — no meaningful skip for a developer who already knows OOP fundamentals.
- **Single fixed Advanced entry point (no secondary question)**: An Advanced developer with strong SQL experience but limited OOP background should enter at `classes-methods`, not `sql-queries`. The secondary question costs one interaction and prevents the wrong skip.

**Affects**: [feature-18-adaptive-difficulty.md](feature-18-adaptive-difficulty.md)

---

### D-P4-09 · 2026-03-17: Prestige quest types and Claude prompt parameters

**Context**: The Q1 (Infinite Game) analysis described difficulty tier escalation across Prestige runs using "Tier 0/1/2" labels (write → debug → optimize). The Q3 (Adaptive Difficulty) analysis defined a `DifficultyService` using `difficultyPreference` (beginner/intermediate/advanced) and an XP-derived `tier` (apprentice/journeyman/master). Neither analysis defined how `prestigeLevel`, `effectiveTier`, and quest type interact as Claude prompt parameters. Without this, the quest generation call is ambiguous.

**Decision**: The `ClaudeApiService.generateQuest()` call receives two independent difficulty signals:

1. **`effectiveTier`** (`'apprentice' | 'journeyman' | 'master'`) — computed by `DifficultyService` by merging `difficultyPreference` (user-set) with the XP-derived tier. Controls **syntax complexity and concept depth** within a quest (e.g., simple class vs. multi-level inheritance).

2. **`questCategory`** (`'write' | 'debug' | 'optimize'`) — derived from `prestigeLevel` in `GameStateService`:
   - `prestigeLevel === 0` (first run): `'write'` — produce code from a description
   - `prestigeLevel === 1` (Journeyman run): `'debug'` — find and fix broken code
   - `prestigeLevel === 2+` (Master run): `'optimize'` — improve working code for performance or clarity

These are separate parameters. `effectiveTier` modulates how hard the concept is; `questCategory` modulates what kind of reasoning is required. A Journeyman-tier debug quest on `classes-inheritance` is a harder inheritance concept presented as broken code to fix — not the same as an Apprentice write quest on `classes-inheritance`.

The existing `tier` signal already present in the Claude prompt is replaced by `effectiveTier`. `questCategory` is a new parameter added to the prompt instruction.

**Rejected alternatives**:
- **Single merged difficulty signal**: Collapsing `effectiveTier` and `questCategory` into one value (e.g., `'journeyman-debug'`) produces a combinatorial explosion of prompt variants. Two independent parameters are more maintainable and composable.
- **Using `prestigeLevel` directly as a prompt value**: Too game-mechanical a label for an AI instruction. `'debug'` is a precise task instruction; `'Journeyman Prestige 1'` is not.

**Affects**: [feature-17-infinite-quest-loop.md](feature-17-infinite-quest-loop.md) · [feature-18-adaptive-difficulty.md](feature-18-adaptive-difficulty.md)

---

<!-- Add entries as decisions are made. Use the format below. -->

<!--
## D1 — [Short title]

**Decision**: [What was decided.]

**Rationale**: [Why this option over the alternatives.]

**Rejected**: [What was considered and discarded, and why.]

**Affects**: [Feature N](feature-NN-*.md)
-->
