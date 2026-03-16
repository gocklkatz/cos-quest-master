# Q4 Analysis — Branch Architecture: Is the current branch system the right structure?

> The branch architecture question is not primarily a content-quantity problem. It is a progression-legibility problem. The player needs to see where they are, where they are going, and feel that forward movement requires and demonstrates real skill. The answer to "how many quests per branch?" depends entirely on what each quest is supposed to accomplish — and that question has not been answered by the current fixed-count model.

---

## Options Evaluated

1. **Increase quest count per branch** — Raise `minQuestsToAdvance` from 5 to 8–10 for classes and SQL in `branch-progression.ts`.
2. **Variable-length branches** — Each branch has a minimum (e.g., 4 quests) but runs until a mastery score threshold is met, not a fixed count.
3. **Sub-branches** — Classes splits into: Properties → Methods → Inheritance → Relationships. SQL splits into: Queries → Joins → Aggregation → Embedded SQL. Each sub-branch is its own mini-track with its own threshold and branch-unlock toast.
4. **Topic tags instead of branches** — Remove the branch concept entirely. Every quest has topic tags. The engine uses weighted probability for topic selection to ensure coverage and spiraling.
5. **Parallel tracks** — Player chooses a starting track (e.g., "Data-focused" or "OOP-focused"). Both tracks cover all topics but with different weighting.

---

## 1. Player Psychology Analysis

### How each option affects motivation, sense of progress, and mastery perception

#### Option 1 — Increase quest count per branch

This is the lowest-friction option and the most dangerous one from a player psychology standpoint.

Raising the threshold from 5 to 8–10 quests extends the branch but does nothing to differentiate those quests pedagogically. From the player's perspective, the experience becomes: "more of the same before I can move on." This triggers the exact problem the Q1 analysis identified with endless loops — structural repetition signals filler, not depth.

There is an additional compounding risk specific to the classes and SQL branches. Both of these branches sit in the middle of the curriculum at a point where the player is contextually primed to feel progress. They have already survived setup and commands (the dry-run phases), they have learned globals, and they are now in the material that matters. If the game visibly stalls at this point behind an inflated quest count — without giving the player any indication that the quests themselves are becoming more sophisticated — the perception will be that the curriculum ran out of ideas and is padding.

The `minQuestsToAdvance` integer is a quota, not a mastery signal. Raising the quota does not improve learning outcomes and risks harming the engagement curve at its most fragile point.

**Player psychology verdict**: Solves the wrong problem. The issue is quest depth, not quest count.

#### Option 2 — Variable-length branches

This option captures something real: the intuition that the branch should end when the player is ready, not when a counter hits a number. The instinct is correct. The execution risks are significant.

The fundamental issue is goal visibility. The Q1 analysis established that the goal gradient effect — motivational acceleration as an endpoint nears — requires a visible endpoint. A variable-length branch with no fixed count destroys this. The player cannot see "3 quests until classes completes." They see only the current quest, with no horizon. For professional developers, who are accustomed to estimating how long a learning investment will take before committing to it, the absence of a progress horizon triggers exit behavior. "I don't know how long this is going to take" is the prelude to closing the tab.

There is a secondary problem: the mastery score threshold that gates advancement is produced by an AI evaluation model. As the Q3 analysis documented, the `EvaluationResult.score` is a language model judgment, not a deterministic rubric. A player who submits technically correct code that the AI evaluates at 68 when the threshold is 70 will not perceive themselves as failing to master the topic — they will perceive the system as opaque and arbitrary. Invisible gates driven by unreliable signals create learned helplessness, not demonstrated mastery.

Variable-length branches with an explicit mastery percentage display (as proposed in the Q1 synthesis) would partially address the goal visibility problem. But this requires a reliable scoring substrate that does not yet exist at this stage of the product. It is the right long-term direction but premature for Phase 4.

**Player psychology verdict**: Correct intuition, premature execution. The scoring infrastructure is not yet reliable enough to drive automatic advancement safely. Deferred to a phase where Code Prediction quests provide binary correctness signals to anchor scoring.

#### Option 3 — Sub-branches

Sub-branches do the most work per unit of implementation cost from a player psychology perspective.

Consider what the player experiences under the current flat branch model for "classes": they receive a series of quests labeled `classes`, all generated by Claude with the `classes` branch context. The quests will vary in surface topic but the player has no visible sub-structure to orient them. Five quests in, they complete the branch and move to SQL, having done some work with properties, maybe one inheritance example, probably no relationships. The branch felt like a survey, not a curriculum.

Sub-branches convert "classes" from a single survey chapter into four legible mastery gates: Properties, Methods, Inheritance, Relationships. Each sub-branch gets its own branch-unlock toast, its own quest generation prompt (Claude is told "focus on ObjectScript class inheritance patterns, specifically method override and `##super()`"), and its own threshold. The player always knows what they are learning and can see exactly where they are in the larger classes arc.

This matters psychologically for several reasons:

First, granularity of progress. A player who has completed Properties and Methods has a richer sense of their own progress than a player who has completed "some classes quests." The sub-branch completion events are micro-wins — achievement moments that the current flat model lacks.

Second, topic-specific feedback. When Claude generates a quest for the "Inheritance" sub-branch, it can generate a specifically inheritance-focused challenge (override a method, use `##super()`, understand polymorphism via `%IsA()`). The current flat classes branch must either generate a mix of all class topics in each quest, or happen to focus on one area because the random generation landed there. Sub-branches make the pedagogical intent explicit in the prompt rather than implied.

Third, Prestige system compatibility. The Q1 decision established Prestige / New Game+ as the infinite game model. On a second Prestige run, sub-branches allow the difficulty ramp to be applied at sub-branch granularity — the Inheritance sub-branch on a Journeyman run should generate qualitatively different quests than on an Apprentice run, and the prompt can target this precisely because the topic is explicit.

**Player psychology verdict**: Best option for goal visibility, micro-win cadence, and learning clarity. Also directly compatible with the Q3 adaptive difficulty architecture.

#### Option 4 — Topic tags instead of branches

The topic-tag model correctly identifies that real ObjectScript work does not respect sequential chapter boundaries. A developer fixing a production issue will touch globals, class methods, and embedded SQL in the same file. The argument for tags is that the curriculum should eventually reflect this integration.

However, removing the branch concept entirely destroys the primary affordance that makes the current system legible to the player: knowing which part of the curriculum they are in. The branch display in the Quest Panel (`currentBranch` signal rendered in the UI) is the player's answer to "what am I learning right now?" A tag-weighted probability engine cannot provide an equivalent answer in human-legible terms.

There is also an implementation concern that is not merely technical. The difficulty graduation system agreed in Q3 — manual toggle (Beginner/Intermediate/Advanced) with level-gated AI prompting — depends on the player knowing their position in the curriculum so the AI can pitch quests appropriately. Without branch context in the prompt, the AI cannot target difficulty to the specific concept being introduced. Tags provide less contextual signal than branches for generation purposes.

Topic tags are a viable model for the post-Prestige free-practice mode (the Q1 analysis identified this explicitly), where the player self-directs practice on chosen topics after completing the structured curriculum. They are not the right primary progression architecture for the main game.

**Player psychology verdict**: Correct model for free-practice mode. Wrong model for the main curriculum. Visualizing progress without branch containers is solved only by introducing equivalent cognitive structure under a different name.

#### Option 5 — Parallel tracks

Parallel tracks trade implementation cost for a one-time onboarding decision that most players will not be equipped to make meaningfully. A new ObjectScript learner who is asked to choose "Data-focused (globals + SQL emphasis)" versus "OOP-focused (classes + persistence emphasis)" before playing any quests has insufficient information to make that choice well. The choice becomes arbitrary, which means the player immediately experiences one of two failure modes: either they feel their choice was wrong after a few quests, or they feel the choice made no visible difference. Both outcomes damage trust.

This option also fragments the curriculum in a way that creates long-term balance problems. Each track must be separately prompt-engineered, tested, and maintained. When sub-branch granularity is added later (which this analysis recommends), it must be duplicated across both tracks. The compounding complexity is not warranted for a single-player game with no persistent competitive differentiation.

The autonomy benefit the parallel-tracks option is trying to provide is already covered more cleanly by the Q3 manual difficulty toggle (which lets the player skip early branches based on self-assessed experience) combined with the post-Prestige free-practice mode (which lets experienced players direct their own practice).

**Player psychology verdict**: Wrong kind of player choice at the wrong moment in the experience. The autonomy need it addresses is already met by other decided systems.

---

## 2. Progression Loop Analysis

### How branch structure interacts with Prestige (Q1) and Adaptive Difficulty (Q3)

The three systems are not independent design decisions. They form a coupled progression loop, and the branch architecture is the spine that both other systems depend on.

#### Prestige compatibility

The Q1 decision requires that Prestige runs produce qualitatively harder quests at each tier (Apprentice → Journeyman → Practitioner → Expert → Master). The AI prompt for quest generation must receive a topic-specific difficulty context to deliver on this. Under the current flat `classes` branch, the prompt context is:

```
Branch: classes
Tier: journeyman
```

This is sufficient to raise the general difficulty of a classes quest. It is not sufficient to ensure the right sub-topic is being targeted at the right cognitive level. The Journeyman run of the "classes" branch should not simply be "harder classes quests" — it should be harder inheritance quests followed by harder relationship quests, in the correct pedagogical order.

Sub-branches make Prestige work correctly. The prompt context becomes:

```
Branch: classes-inheritance
Tier: journeyman
Topic focus: method overriding, ##super() chains, polymorphic dispatch via %IsA()
Expected competency at this tier: player can debug an incorrect ##super() call, not just write a basic override
```

This is the difference between difficulty as "harder syntax" and difficulty as "higher Bloom's level." The Q1 analysis explicitly stated that difficulty must be qualitatively different across tiers — not just syntactically harder versions of the same quest. Sub-branches are the mechanism that makes qualitative difficulty graduation tractable.

Increasing quest count (Option 1) or removing branches (Option 4) both degrade Prestige quality. Increasing count produces more quests of the same type. Removing branches forces the AI to infer the right difficulty target from vague tag combinations.

#### Adaptive difficulty compatibility

The Q3 decision established a `DifficultyService` that computes `effectiveTier` from the player's manual preference and XP level, and an `initialBranch` signal that skips early branches for Intermediate and Advanced players. Both of these signals are branch-name strings.

Under the current linear model, `initialBranch` for Advanced players is `'globals'` (skipping setup and commands). This is a crude skip: all of globals, then all of classes, then all of SQL. An Advanced player who is specifically weak on SQL but strong on class design has no mechanism to communicate this.

Sub-branches allow `DifficultyService.initialBranch` to skip with sub-branch granularity. An Advanced player could enter at `classes-methods` or even `classes-inheritance` rather than at the beginning of the entire classes chapter. This is a meaningful improvement to the skip resolution, and it requires no changes to the `DifficultyService` interface — only the value of `initialBranch` changes from a flat branch name to a sub-branch name.

The `BRANCH_PROGRESSION` array in `branch-progression.ts` expands to include sub-branch stages, each with their own `minQuestsToAdvance`. The `currentBranch` signal in `GameStateService` stores the sub-branch name as a string — the existing interface is unchanged.

---

## 3. Implementation Risk Assessment

### Option 1 — Increase quest count per branch

**Risk level: Low**

One-line change per branch in `branch-progression.ts`. No interface changes. No new services. No new UI.

The risk is not implementation risk — it is design risk. The option is trivially buildable but solves the wrong problem. It does not improve curriculum quality and carries significant engagement cost at the classes/SQL phase.

**Verdict**: Build it as a stop-gap measure only if no structural option is feasible in Phase 4. Do not accept this as the primary solution.

### Option 2 — Variable-length branches

**Risk level: Medium-High**

Requires introducing a mastery-threshold evaluation pass after each quest submission. The evaluation result must be reliably calibrated — currently it is not. The `QuestEngineService` must manage a "mastery score rolling average" state. The UI must surface a mastery percentage per branch to maintain goal visibility. All of this is new state management layered onto the existing quest completion flow.

The interface change to `BRANCH_PROGRESSION` (replacing `minQuestsToAdvance: number` with a threshold model) is a breaking change to the data contract that `QuestEngineService` depends on. It must also propagate to the Prestige reset logic in F17.

**Verdict**: Too high a risk-to-reward ratio at this stage. The scoring substrate is not reliable enough to justify the implementation cost. Deferred to Phase 5.

### Option 3 — Sub-branches

**Risk level: Low-Medium**

The implementation footprint is contained. `BRANCH_PROGRESSION` expands from 6 entries to approximately 14 entries (3 setup, 4 classes, 4 SQL, plus commands, globals, capstone). Each entry is a `BranchStage` object — the existing interface is unchanged. `currentBranch` remains a `string` signal — sub-branch names are strings. The branch-unlock toast already exists (F12) and will fire at each sub-branch boundary.

The Claude prompt for quest generation receives the sub-branch name as the `currentBranch` context. The prompt already templates this value. The only additional prompt engineering is a description field per sub-branch that directs Claude to the specific topic focus — a small addition to the `BranchStage` interface and the system prompt template.

The main complexity increase is in the number of `BRANCH_PROGRESSION` entries and the need to write clear topic-focus descriptions for each sub-branch. These are design costs, not engineering costs.

The `DifficultyService.initialBranch` computed signal requires a minor update: the branch-skip logic for Intermediate and Advanced players must map to sub-branch names. This is a string-value change, not a structural change.

There are no breaking changes to existing service interfaces. The `GameStateService.currentBranch` signal, `QuestEngineService.generateNextQuest()`, and `ClaudeApiService.generateQuest()` all remain structurally identical. The `BRANCH_PROGRESSION` array grows; it does not change shape.

**Verdict**: Acceptable risk. The implementation is additive and backwards-compatible with all decided systems.

### Option 4 — Topic tags

**Risk level: High**

Requires replacing the `currentBranch` string signal with a weighted topic selection engine. The `QuestEngineService` must maintain topic coverage state — a record of which tags have been covered and how recently. The Claude prompt must accept a tag set rather than a branch name. Progress visualization must be redesigned from scratch (the branch-progress display has no equivalent in a tag model).

This is a rewrite of the progression layer, not an extension.

**Verdict**: High risk, wrong scope for Phase 4. Appropriate only for the free-practice mode where the player self-selects topics.

### Option 5 — Parallel tracks

**Risk level: High**

Requires a track-selection UI at game start. Requires two distinct `BRANCH_PROGRESSION` configurations, separately tuned. Requires the Prestige model to track which track was played and adjust accordingly. Doubles the prompt engineering surface for quest generation.

**Verdict**: High risk, high maintenance cost, limited pedagogical return.

---

## 4. Rejected Options

### Option 1 — Increase quest count

Rejected as a primary solution. The feedback from Phase 3 retrospective was that 5 quests per branch was insufficient — but the insufficiency is about depth and topic coverage, not raw count. Eight quests of the same generic `classes` prompt context do not teach inheritance and relationships better than five do. The only way more quests improve learning is if those quests are targeted at specific sub-topics in a deliberate sequence. That is a sub-branch argument, not a count argument.

This option may be used as a short-term stop-gap: increasing `sql.minQuestsToAdvance` from 3 to 5 costs nothing and addresses the most acute complaint (SQL felt too short). It should be superseded by the full sub-branch implementation.

### Option 2 — Variable-length branches

Rejected for Phase 4. The scoring infrastructure is not reliable enough to gate advancement on AI-generated scores without introducing opaque failure states. The goal-visibility regression is unacceptable given the Prestige architecture's dependence on clear branch completion milestones. Revisit in Phase 5 after Code Prediction quests (F6) provide binary correctness signals that can anchor the scoring distribution.

### Option 4 — Topic tags as primary model

Rejected for the main curriculum. Accepted for the post-Prestige free-practice mode, consistent with the Q1 decision. Free-practice mode has no required curriculum coverage, no branch-advance milestones, and no Prestige tier requirements — the tag-weighted selection model is appropriate there and only there.

### Option 5 — Parallel tracks

Rejected. The autonomy benefit is already delivered by the Q3 manual difficulty toggle. The implementation cost is not justified by the marginal differentiation it provides over a sub-branch model where Advanced players can entry-point into sub-branches matching their existing competency.

---

## 5. Final Recommendation

**Implement Option 3 — Sub-branches — as the primary branch architecture for Phase 4.**

### Specific parameters

The recommended `BRANCH_PROGRESSION` expansion:

| Sub-branch | Display Name | Min quests to advance | Topic focus |
|---|---|---|---|
| `setup` | Setup | 3 | Syntax, terminal, WRITE/READ basics |
| `commands` | Commands | 5 | Control flow, loops, conditionals, string operations |
| `globals` | Global Variables | 5 | Global reads, writes, subscripts, iteration with `$ORDER` |
| `classes-properties` | Class Properties | 3 | Class definition, property declarations, %New(), %Save(), basic %Status |
| `classes-methods` | Class Methods | 4 | ClassMethod vs instance method, parameter passing, %Status propagation, `$$$ThrowOnError` |
| `classes-inheritance` | Inheritance | 3 | Extends, method override, `##super()`, `%IsA()` |
| `classes-relationships` | Relationships | 3 | `%Relationship`, cardinality, cascade behavior |
| `sql-queries` | SQL Queries | 3 | SELECT, WHERE, IRIS-specific SQL syntax, embedded vs dynamic SQL |
| `sql-joins` | Joins | 3 | INNER JOIN, LEFT JOIN, self-joins, join on class properties |
| `sql-aggregation` | Aggregation | 3 | GROUP BY, HAVING, COUNT/SUM/AVG in ObjectScript context |
| `sql-embedded` | Embedded SQL | 3 | `&sql()` macro, `%sqlcontext`, cursor iteration in ObjectScript |
| `capstone` | Capstone | null | Full-stack integrations across all prior topics |

Total minimum quests to reach capstone: 41 quests (up from the current 21-quest ceiling). This is a meaningful curriculum expansion without inflation — every quest has a specific pedagogical purpose defined by its sub-branch focus.

The `classes` chapter expands to four sub-branches totaling a minimum of 13 quests (up from 5). The `sql` chapter expands to four sub-branches totaling a minimum of 12 quests (up from 3). This directly addresses the Phase 3 retrospective finding that both topics felt under-represented.

### Interface changes required

**`branch-progression.ts`**: Add an optional `topicFocus` field to `BranchStage`. This string is injected into the Claude system prompt to direct quest generation. Example:

```typescript
export interface BranchStage {
  branch: string;
  minQuestsToAdvance: number | null;
  displayName: string;
  topicFocus: string | null;  // null for terminal capstone
}
```

**`ClaudeApiService.generateQuest()`**: The system prompt template gains one new interpolation: `${topicFocus}`. This is additive — the existing prompt structure is unchanged, the topic focus is appended as an additional constraint sentence.

**`DifficultyService.initialBranch`**: Update the computed branch names for Intermediate and Advanced skip logic to reference sub-branch entry points. Intermediate players enter at `classes-properties` (skip setup, commands, globals). Advanced players enter at `classes-methods` or `sql-queries` depending on the declared experience level. The exact mapping is a tuning decision, not a structural one.

**`BRANCH_DISPLAY_NAMES`**: Already exists in `branch-progression.ts`. Expand with sub-branch display names.

No other service interface changes are required. `GameStateService.currentBranch`, `QuestEngineService.generateNextQuest()`, `resolveBranch()`, and the branch-unlock toast mechanism (F12) all operate on branch-name strings and require no structural modification.

### Prestige behavior

On a Prestige run, the full 11-sub-branch progression repeats at the next difficulty tier. The `topicFocus` string in each sub-branch stage becomes the anchor for Prestige-level quest differentiation: the Journeyman `classes-inheritance` prompt produces debug quests (`##super()` chains with introduced bugs) rather than write quests (implement an override). This is achievable through the `tier` parameter already passed to `generateQuest()` combined with the topic focus string — no new prompt engineering infrastructure is required, only updated prompt content per tier per sub-branch.

### Stop-gap for immediate relief

While the full sub-branch implementation is built, apply the following one-line changes to `branch-progression.ts` as an immediate stop-gap:

- `classes.minQuestsToAdvance`: 5 → 8
- `sql.minQuestsToAdvance`: 3 → 6

These two changes take five minutes and reduce the most acute retrospective complaint. They are explicitly temporary — they should be reverted when the sub-branch implementation lands, because under the sub-branch model these thresholds are replaced by the sub-branch config.

### What this decision does not resolve

This analysis assumes AI-generated quest quality is sufficient to fill each sub-branch with meaningfully distinct content. If the `topicFocus` string in the Claude prompt does not reliably produce sub-topic-specific quests (e.g., an `Inheritance` sub-branch quest that is actually about properties), the sub-branch model degrades into the flat model with extra labels. Prompt validation per sub-branch is a necessary implementation step — each sub-branch topic focus string should be tested against 3–5 generated quests before the feature is considered complete.

---

## Design Assumptions to Flag

- This analysis assumes the player is aware of their current sub-branch from the UI (via `currentBranch` display and the branch-unlock toast). If the UI does not surface sub-branch names clearly, the micro-win cadence is lost. The branch display label in the Quest Panel must show the sub-branch display name (e.g., "Inheritance" not `classes-inheritance`), backed by `BRANCH_DISPLAY_NAMES`.

- Minimum quest counts per sub-branch are marked `[PLACEHOLDER]` in spirit — they are reasonable first estimates based on topic complexity, not playtested values. The `classes-properties` sub-branch may need more than 3 quests in practice; `classes-relationships` may need fewer. These should be reviewed after a single full run through the expanded curriculum.

- The `DifficultyService.initialBranch` skip logic for Advanced players that maps to `sql-queries` as an entry point assumes Advanced players have functional class design skills. If the audience includes developers from non-OOP backgrounds (e.g., procedural COS developers), `classes-properties` may be the appropriate entry point for Advanced as well. This is a tuning question, not an architecture question.
