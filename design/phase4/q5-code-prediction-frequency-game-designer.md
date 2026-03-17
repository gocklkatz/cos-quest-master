# Q5 Analysis: Code Prediction Frequency — Game Designer Perspective

> Code Prediction quests are not a variant quest type. They are a cognitive mode shift. The frequency question is really a question about rhythm: how often should the player stop producing and start observing?

---

## Core Game Design Problem

The game currently has two quest types in operation: Write (produce code from a prompt) and Debug (fix broken code). Both are active production modes — the player must generate or modify output and submit it for evaluation. Code Prediction quests are structurally different: the player reads, reasons, and selects. No code is written. The editor is read-only. Grading is local and binary.

This distinction matters for pacing design in two ways.

**First, cognitive load alternation.** Production quests (Write, Debug) place high demands on working memory. The player must hold the problem statement, the syntax they are trying to recall, and their current attempt simultaneously. Code Prediction quests lower that load: the code is provided, the output options are constrained, and the task is inference, not generation. Used at the right moments, Prediction quests function as recovery beats — the game takes the player off the sprint and puts them into a walk, long enough to consolidate what they have been producing before asking them to produce again.

**Second, the read/write/debug rhythm.** The three quest types map to three distinct cognitive operations in real ObjectScript work: reading unfamiliar code, writing new code, and fixing broken code. A curriculum that only asks the player to write and debug is not a complete representation of what ObjectScript fluency requires. Reading and predicting code output is how developers build mental models of execution — especially important in IRIS because the runtime behavior of `$ORDER`, `$PIECE`, and embedded SQL is non-obvious from syntax alone. Prediction quests are not supplementary; they are pedagogically required.

The design problem, then, is not "how often should we show a Prediction quest?" It is: "what placement rule ensures Prediction quests serve their cognitive function — consolidation and mental model building — without interrupting momentum at the wrong moment?"

The existing F6 design specifies `completedInBranch % 4 === 3` as the trigger: every fourth quest, starting from the third completed quest in a branch. In a branch with `minQuestsToAdvance = 5`, this fires once (at position 3). In the expanded sub-branch model decided in Q4, with sub-branches of 3–4 quests each, it may never fire at all — a 3-quest sub-branch reaches the threshold at position 3 (the last quest in the sub-branch), and only if `completedInBranch >= 1` is already satisfied. This is the root cause of the "too rare" perception identified in Q5. The trigger was calibrated for 5-quest flat branches and has not been re-evaluated for the sub-branch model.

---

## Option Analysis

### Option 1 — Guaranteed Ratio

**Mechanism**: Every Nth quest is forced to be a Prediction quest, regardless of branch or context.

**What it gets right**: A fixed ratio is predictable, easy to implement, and easy to communicate to the player — if they know the rhythm, they can orient themselves. It also guarantees minimum exposure across all branches, which matters because the alternative (branch-specific weighting) could leave entire sub-branches with no Prediction quests.

**What it gets wrong**: A global ratio ignores the fact that Prediction quests serve different purposes at different points in the curriculum. In the `setup` sub-branch, where the player is learning basic syntax for the first time, a Prediction quest on a `WRITE "Hello"` routine provides almost no cognitive value — the output is self-evident. In the `classes-inheritance` sub-branch, a Prediction quest on a `##super()` dispatch chain is genuinely challenging and directly builds the mental model the sub-branch is trying to establish. Treating both sites identically wastes Prediction quests on low-value placements and may deplete them from high-value ones depending on where the modulo falls.

There is also a pacing hazard specific to early branches. New players in their first five quests are building momentum and learning the quest UI itself. Interrupting that momentum with a read-only, multiple-choice quest before the player has developed any sense of the production flow breaks the onboarding contract (which the F6 design rightly guards against via the `completedInBranch >= 1` gate). A global N-ratio, if N=3, could trigger a Prediction quest as the player's second quest ever — too early.

**Verdict**: Useful as a floor guarantee, harmful as the primary placement logic. The ratio idea is correct; the scope (global) is wrong.

### Option 2 — Branch-Specific Weighting

**Mechanism**: Prediction quests appear more frequently in branches where code reading is especially important — specifically the classes and SQL sub-branches.

**What it gets right**: This is the most pedagogically grounded option. The case for elevated Prediction frequency in `classes-inheritance`, `classes-relationships`, `sql-joins`, and `sql-embedded` is strong and specific. These are the sub-branches where execution behavior is least predictable from syntax alone. A player who can reliably predict the output of a `##super()` chain or a cursor iteration pattern has demonstrated a level of comprehension that write quests alone cannot validate. Branch-specific weighting allows Prediction quests to be concentrated where they do the most pedagogical work.

The sub-branch architecture decided in Q4 makes this option more tractable than it would have been under the flat branch model. Each sub-branch already has a `topicFocus` string passed to Claude — adding a `predictionFrequency` field to `BranchStage` is a natural extension of the same pattern.

**What it gets wrong**: Branch-specific weighting answers the question "where should Prediction quests concentrate?" but not "when within a branch should they appear?" A weighting parameter (e.g., 1 in 3 quests are Prediction in `classes-inheritance`, 1 in 5 in `setup`) still needs a placement rule. It also requires explicit configuration for every sub-branch — 11 sub-branches in the current `BRANCH_PROGRESSION` expansion — which is a design decision that must be made and maintained.

There is also a risk of over-concentration in the SQL sub-branches. SQL embedded in ObjectScript (`&sql()` macro, cursor iteration, `%sqlcontext`) is already one of the most cognitively demanding topics in the curriculum. If Prediction quests also concentrate here, the player's experience in `sql-embedded` becomes: read this, now read this differently, now read this again. Production (Write and Debug) quests are also where skill is built, not just demonstrated. Heavy Prediction concentration in the same sub-branches where Write quests are most demanding risks creating a perception of a sub-branch that never lets the player practice.

**Verdict**: The correct model for where Prediction quests should concentrate. Insufficient as a standalone mechanism — must be combined with a within-branch placement rule. The `predictionFrequency` parameter belongs on `BranchStage`.

### Option 3 — Post-Failure Trigger

**Mechanism**: After a failed submission, the next quest is automatically a Prediction quest on the same topic.

**What it gets right**: This is the most psychologically sophisticated option and the one most directly grounded in how learning actually works after a failure event. When a player fails a Write quest, their working memory is exhausted — they have spent cognitive effort on an attempt that was judged insufficient. Asking them to immediately produce another Write quest on the same topic risks compounding frustration rather than building understanding. A Prediction quest in this slot drops the cognitive demand: here is working code that does what you were trying to do; predict what it outputs. This is recovery scaffolding, not remediation.

The mechanism also aligns with the Phase 3 F6 design decision that wrong predictions are treated as learning moments, not blocking failures (XP is zero, next quest loads normally). The post-failure Prediction quest inherits this philosophy: the player who failed a Write quest and then gets a Prediction quest wrong has had two low-cost learning exposures before the game moves on. The overall experience is "the game showed me how it works" rather than "the game kept failing me."

This option is also the only one that creates a direct causal relationship between player performance and quest type selection. The other options fire on position or weight — mechanically correct but arbitrary from the player's perspective. Post-failure triggering makes the sequence feel responsive. The game is reading the player's performance, not just executing a schedule.

**What it gets wrong**: The trigger is reactive, which means Prediction quests can be suppressed indefinitely if the player succeeds consistently. A player who completes every Write quest on first submission in a sub-branch like `classes-inheritance` — where Prediction quests have the highest pedagogical value — may never see one. This is acceptable in the context of a standalone system but unacceptable as the sole placement mechanism, because it makes Prediction exposure entirely dependent on failure rate. For skilled players (Advanced tier, second Prestige run), this means near-zero Prediction quest exposure in exactly the sub-branches where reading comprehension at an advanced level should be tested.

There is also an edge case where consecutive failures on a Write quest followed by a correct-or-wrong Prediction quest creates a confusing sequence. The player may not connect the Prediction quest back to their failed Write attempt if the gap in topic framing is too large — Claude may generate a Prediction quest that demonstrates a different aspect of the same sub-branch topic rather than the specific concept the player failed on. This is a prompt engineering constraint, not a reason to reject the mechanism.

**Verdict**: The highest-value placement signal in the system. Non-negotiable as a component of the final design. Must not be the only trigger, because it suppresses Prediction exposure for successful players.

### Option 4 — Player Toggle

**Mechanism**: The player can opt into "more reading quests" mode in settings.

**What it gets right**: Player autonomy is a legitimate design value in this product. The Q3 analysis established that this audience — professional developers — are high-autonomy agents who resist systems that make decisions for them without explanation. A player who knows they are weak at reading ObjectScript execution flow and wants more Prediction quests should be able to ask for them. The toggle satisfies self-determination theory's autonomy dimension.

The settings modal infrastructure already exists. Adding a "Reading mode" preference is a low-cost UI change. It also serves an accessibility use case: players who find the production pressure of Write quests stressful during a particular session may prefer to read and predict.

**What it gets wrong**: A player toggle externalises a decision that the system should be making better. If the Prediction frequency is correctly calibrated by the other mechanisms, most players will never need to adjust it. If the toggle exists because the base frequency is wrong, the toggle is a symptom treatment, not a cure. It also introduces a settings state that complicates the progression model: a player in "high reading mode" will experience a materially different quest sequence than one in standard mode, which makes playtesting and balancing significantly harder when the population is split.

More practically: the player toggle answers "how often do you want reading quests?" — a question most players cannot answer meaningfully before they have experienced what a Prediction quest is. In first session, the toggle has no informed basis. It is a preference dial for a feature the player has not yet seen.

The toggle has value as a post-first-Prediction accessibility option — once the player has completed at least one Prediction quest, they understand what the toggle affects. As a primary frequency mechanism, it is too passive and too late.

**Verdict**: Valuable as a secondary adjustment layer for players who have completed at least one Prediction quest. Not a primary frequency mechanism. Should be implemented last, after the core placement logic is validated.

---

## Recommendation

The four options are not competing alternatives. They are four layers of a single placement system, each operating at a different scope. The correct design combines three of them in a hierarchy:

**Layer 1 — Branch-specific base frequency (Option 2)**

Each `BranchStage` in `BRANCH_PROGRESSION` carries a `predictionFrequency` field: the ratio of Prediction quests within that sub-branch (e.g., `1/3` means one in every three quests is a Prediction quest; `0` means none; `1/5` means one in five). This field is evaluated by `QuestEngineService` before calling `generateQuest()` — if the current quest slot falls on a Prediction position for this sub-branch, the quest type is set to `'prediction'`.

Recommended starting `predictionFrequency` values per sub-branch (all marked `[PLACEHOLDER]` pending playtest):

| Sub-branch | Frequency | Rationale |
|---|---|---|
| `setup` | 0 | Execution is trivially obvious; Prediction quests add no value here |
| `commands` | 1/4 | One late-branch Prediction to reinforce control flow mental models |
| `globals` | 1/3 | `$ORDER` iteration behavior is non-obvious; reading it is necessary |
| `classes-properties` | 1/4 | Properties are simple; one Prediction reinforces `%New()`/`%Save()` pattern |
| `classes-methods` | 1/3 | `%Status` propagation is hard to predict; high Prediction value |
| `classes-inheritance` | 1/2 | `##super()` dispatch is the highest-value Prediction target in the curriculum |
| `classes-relationships` | 1/3 | Cascade behavior is non-obvious; Prediction is appropriate |
| `sql-queries` | 1/4 | Basic SELECT is predictable; one Prediction suffices |
| `sql-joins` | 1/3 | Join output shape is a common misconception site |
| `sql-aggregation` | 1/3 | GROUP BY + HAVING interaction is hard to reason about without reading |
| `sql-embedded` | 1/4 | Already high cognitive load; do not over-concentrate Prediction here |
| `capstone` | 0 | Capstone is integration; production (Write/Debug) is the correct mode |

**Layer 2 — Post-failure trigger (Option 3)**

Regardless of branch-specific frequency, any failed Write or Debug submission triggers the next quest as a Prediction quest on the same sub-branch topic. This trigger fires once per failure event — it does not chain (two consecutive failures do not produce two consecutive Prediction quests). The Prediction quest is generated with the sub-branch's `topicFocus` string and an additional prompt instruction: "Generate a short deterministic routine that demonstrates the concept the player was just asked to implement — do not show the answer to their failed quest, but demonstrate the relevant underlying pattern."

This trigger overrides the branch-specific frequency schedule — a failure-triggered Prediction quest does not consume a frequency slot. The next quest after the failure-triggered Prediction returns to the normal branch frequency schedule.

**Layer 3 — Player toggle (Option 4), post-first-Prediction only**

Once the player has completed at least one Prediction quest (tracked as a boolean in `GameStateService`), the settings modal exposes a "Reading intensity" toggle: Standard / More reading. "More reading" doubles the effective `predictionFrequency` for all sub-branches (capped at `1/2`). This is surfaced as a settings preference, not an onboarding choice.

**What Option 1 (guaranteed ratio) provides instead**: The branch-specific frequency in Layer 1 already guarantees minimum Prediction exposure per sub-branch. A global guaranteed ratio is not needed and is replaced by the per-sub-branch floor values in the table above. The global ratio's valid purpose — ensuring no sub-branch goes Prediction-free by accident — is handled by making the `predictionFrequency` field explicit and required in `BranchStage`.

### Design rationale

The three-layer system separates concerns cleanly:

- **Where** Prediction quests should concentrate (Layer 1: branch-specific frequency)
- **When** Prediction quests serve as recovery scaffolding (Layer 2: post-failure trigger)
- **How much** the player can self-direct their reading practice (Layer 3: player toggle)

The two sub-branches with the highest Prediction frequency under this design are `classes-inheritance` (1/2) and `globals` (1/3). These are the two topics in the curriculum where execution behavior is most likely to violate a developer's prior mental model — inheritance dispatch in ObjectScript does not work like Java or Python, and `$ORDER` iteration is unlike any iterator in mainstream languages. Prediction quests in these positions are not variety mechanics; they are the primary vehicle for correcting transfer errors from prior language experience.

The `capstone` and `setup` sub-branches carry zero base Prediction frequency. The capstone is an integration challenge; the correct mode is production under pressure, not reading and predicting. Setup is trivial enough that Prediction quests would feel condescending. The post-failure trigger still applies to both — a player who fails a capstone Write quest may benefit from a Prediction quest that demonstrates one of the sub-patterns involved.

---

## Implementation Notes

**`branch-progression.ts`**: Add `predictionFrequency: number` to `BranchStage`. This is a value from `0` to `1` (e.g., `1/3 ≈ 0.333`). Use a simple fraction rather than a percentage to make the design intent readable in code.

```typescript
export interface BranchStage {
  branch: string;
  minQuestsToAdvance: number | null;
  displayName: string;
  topicFocus: string | null;
  predictionFrequency: number;  // 0 = never; 0.33 = ~1 in 3; 0.5 = 1 in 2
}
```

**`quest-engine.service.ts`**: The quest-type decision logic replaces the current `completedInBranch % 4 === 3` formula. The new logic:

1. If the previous quest failed (`lastQuestFailed` signal, already set by the existing completion flow), set `questType = 'prediction'` and clear the flag.
2. Otherwise, compute whether the current quest slot is a Prediction slot using the current sub-branch's `predictionFrequency`. A simple deterministic approach: `questType = (completedInBranch % Math.round(1 / freq) === Math.round(1 / freq) - 1) ? 'prediction' : 'standard'`. The `completedInBranch >= 1` guard from the F6 spec is retained — no Prediction quests as the first quest in any sub-branch.
3. Ignore the frequency check entirely for `setup` and `capstone` (`predictionFrequency === 0`); always produce `'standard'`.

**`game-state.service.ts`**: Add two fields to `GameState`:
- `lastQuestFailed: boolean` — set to `true` when a submission produces `passed: false`; read and cleared by `generateNextQuest()` before the next quest is generated.
- `hasSeenPredictionQuest: boolean` — set to `true` on first Prediction quest completion; gates the Layer 3 player toggle in the settings modal.

**`claude-api.service.ts`**: The post-failure Prediction quest needs a modified prompt instruction. Add an optional `failureRecovery: boolean` parameter to `generateQuest()`. When `true` and `questType === 'prediction'`, append to the system prompt: "This quest follows a failed submission attempt. Generate a short deterministic routine that demonstrates the relevant underlying pattern for this sub-branch topic. Do not reproduce or hint at the player's failed attempt."

**`settings-modal.component`**: Gate the "Reading intensity" toggle behind `gameState.hasSeenPredictionQuest()`. Render it as a two-value toggle (Standard / More reading). Store the preference as `predictionIntensity: 'standard' | 'more'` in `GameState`. `QuestEngineService` reads this signal and doubles the effective `predictionFrequency` for all sub-branches when `predictionIntensity === 'more'`, capped at `0.5`.

**Playtesting gates**: All `predictionFrequency` values in the sub-branch table above are `[PLACEHOLDER]`. Before Phase 4 ships, run at least two full curriculum passes with the default values and observe:
- Do players in `classes-inheritance` report the Prediction quests feeling instructive or interruptive?
- Does the post-failure trigger feel like a punishment (second consecutive bad experience) or a recovery aid? If it reads as punishment, add a brief UI label: "Reading quest — recover and review."
- Does the `globals` 1/3 frequency feel too high? `$ORDER` is confusing but players may prefer to figure it out through production rather than observation.

The frequency table should be treated as hypotheses, not specifications, until at least five players have completed the full curriculum end-to-end.

**Interaction with Prestige runs**: On a Journeyman Prestige run, the same `predictionFrequency` values apply — but the Prediction quests themselves should be harder. The `tier` parameter already passed to `generateQuest()` handles this, provided the Claude prompt for Prediction quests specifies that distractor options should be more subtle at higher tiers (e.g., Journeyman distractors reflect common off-by-one errors in complex `##super()` chains, not just wrong type outputs). Add a tier-sensitivity note to the Prediction quest system prompt.
