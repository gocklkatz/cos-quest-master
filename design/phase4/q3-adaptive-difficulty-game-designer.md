# Q3 Analysis — Adaptive Difficulty: How should quest complexity scale with player level?

> Difficulty design for a professional upskilling tool is primarily a trust problem, not a challenge-balancing problem.

---

## Options Evaluated

1. **Level-gated AI prompts** — `QuestEngineService` passes current XP level to the Claude prompt as a difficulty hint. Low cost, already partially supported.
2. **Score-based adaptation** — If the player completes 3 quests in a row with a perfect AI evaluation score, the next quest is generated at +1 difficulty tier. If they fail 2 in a row, drop a tier.
3. **Initial skill assessment** — First session: 3-5 diagnostic quests. Based on results, skip early branches.
4. **Manual difficulty toggle** — Player sets their own difficulty (Beginner / Intermediate / Advanced) before starting. Simple, respects player autonomy.

---

## Perspective: Game Designer

### Ranked Recommendation

**Winner: Option 4 + Option 1 as the execution layer.** Give the player explicit control over their starting difficulty, then use level-gated AI prompting to drive continuous scaling within that difficulty band. Options 2 and 3 introduce measurement complexity that is not yet warranted at this stage of the product.

---

### Analysis

#### Option 1 — Level-gated AI prompts

The codebase already implements a three-tier system (`apprentice` / `journeyman` / `master`) derived from `calcLevel(xp)` in `QuestEngineService.generateNextQuest()`. The tier boundary conditions are level 6 for journeyman and level 13 for master. This is already wired into the Claude system prompt as `Their current tier is: ${tier}`.

The problem is that this tier is entirely XP-driven. XP is awarded for completion, not mastery. A player who completes every quest at score 60 earns the same tier promotion as one who scores 95 consistently. The tier signal passed to the AI is therefore a proxy for time-on-task, not demonstrated skill. For professional developers who already know adjacent languages (Python, Java, SQL), the time-to-completion signal will be compressed and will not reliably differentiate skill.

Despite this limitation, level-gated prompting is the correct execution mechanism for whatever difficulty signal the system chooses to track. It is low-cost, already partially deployed, and the Claude prompt architecture in `ClaudeApiService.generateQuest()` accepts the tier parameter cleanly. This option is not a standalone design decision — it is the implementation vehicle.

**Verdict**: Necessary but not sufficient as the primary difficulty mechanism. It is the delivery pipe, not the control valve.

#### Option 2 — Score-based adaptation

This is the most theoretically rigorous option and maps well to the flow channel concept from Csikszentmihalyi: difficulty should track skill closely enough that the player is neither bored (challenges too easy) nor anxious (challenges too hard). The 3-consecutive-successes / 2-consecutive-failures rule is a reasonable first-pass heuristic.

The structural problem is measurement validity. The `EvaluationResult.score` field (0–100) is produced by Claude evaluating the player's submitted code against the quest's `evaluationCriteria`. This score is a language model judgment, not a deterministic rubric. Consecutive high scores may reflect a sequence of easier quests rather than demonstrated mastery — quest difficulty is itself variable because the AI generates quests. Using an AI score to gate AI-generated quest difficulty creates a feedback loop where the signal and the output are co-produced by the same model.

There is also a user experience hazard specific to this audience. Professional developers are metacognitively aware. If the system silently downgrades their quest difficulty after two failures, they will notice — and interpret it as either a bug or a patronising judgment. Invisible difficulty adjustments work in casual games (Mario Kart's rubber-band AI) because the player contract is entertainment, not skill acquisition. In a professional upskilling tool, the player contract includes a sense of transparent progress. Hidden tier drops violate that contract.

Score-based adaptation is worth implementing in Phase 5 or later once the evaluation rubric is more deterministic (e.g., once Code Prediction quests produce binary right/wrong signals that can anchor the scoring distribution). It is premature now.

**Verdict**: Theoretically sound, premature in practice. The scoring substrate is not reliable enough to drive automatic tier changes safely.

#### Option 3 — Initial skill assessment

This option has the highest potential value and the highest cost. The proposed mechanism — 3-5 diagnostic quests before the main curriculum — solves a real problem: the setup and commands branches are likely to feel trivial to any developer with ObjectScript-adjacent experience (COS syntax is unusual but the concepts are not). Skipping early branches based on diagnostic results would respect the professional developer's existing mental model and reduce the time-to-insight that determines whether they return for a second session.

The implementation cost is significant. It requires:
- A separate quest set (diagnostic quests must probe distinct competency areas cleanly)
- A branch-skip logic that currently does not exist — `BRANCH_PROGRESSION` is a strict ordered linear array; skipping entries requires either surgery to the progression system or a parallel onboarding mode
- A UI flow for the first session that differs from the standard loop
- Edge case handling for what happens if the player scores inconsistently across the diagnostic set

More importantly, this option risks the wrong first impression. If the diagnostic quests are too easy, experienced developers breeze through them and feel the game is patronising before they even start. If they are too hard (diagnosis quests that push advanced ObjectScript to probe mastery ceiling), the first session ends in failure for beginners. Calibrating diagnostic quests is a design problem in itself, one that requires dedicated playtesting before it can be trusted.

For a learning tool this early in its lifecycle, the safer design is to let the player tell you their level rather than attempt to measure it before you have validated the measurement instrument.

**Verdict**: High value long-term. Too costly and too risky to implement before the scoring and branch architecture are more mature. Defer to Phase 5 after C5 (Branch Architecture Redesign) is resolved.

#### Option 4 — Manual difficulty toggle

Self-determination theory (Deci and Ryan) distinguishes three core psychological needs in motivated behaviour: autonomy, competence, and relatedness. Of the three, autonomy is the most relevant here. Professional developers are high-autonomy agents by default — they choose their own toolchains, self-direct their learning, and resist systems that make decisions for them without explanation.

A manual toggle satisfies autonomy directly. The player is told: "You know your background. Set your starting point." This framing also offloads calibration responsibility to the player, which is appropriate because the player has information the system cannot reliably infer — their prior experience with COS-adjacent languages (Cache ObjectScript, SQL, Python, Java), their existing IRIS exposure, and their session goal (quick exploration vs. deep mastery).

The practical design is simple: at first session start (before the first quest is generated), a modal or settings toggle offers three starting tiers: Beginner (starts at apprentice), Intermediate (starts at journeyman, bypasses setup branch), Advanced (starts at master, bypasses setup and commands branches). This selection is stored in `GameStateService` and passed into the `tier` field of the Claude generation prompt.

The risk of manual toggles is miscalibration by ego rather than skill — developers tend to self-select higher difficulty than warranted. This produces a worse first-session experience for players who choose Advanced when they should have chosen Intermediate. The mitigation is low friction to change: make the toggle accessible from the settings modal at any time (it already exists), and surface a soft prompt after two consecutive failures ("Feeling stuck? You can adjust your difficulty in Settings.") without forcing the change.

**Verdict**: Best fit for this audience and this stage of the product. Respects player autonomy, low implementation cost, no measurement reliability issues. The miscalibration risk is manageable with a visible re-adjustment path.

---

### Implementation Suggestion

The recommended approach is a two-layer system: Option 4 (manual toggle) controls the starting tier and initial branch skip, and Option 1 (level-gated prompts) drives continuous scaling within that tier band via XP progression.

**Step 1: Extend `GameStateService` with a `difficultyPreference` signal.**

The existing `GameState` model already has `challengeMode: boolean` from Phase 2. The new field should be a three-value enum rather than a second boolean.

```typescript
// In game-state.models.ts
export type DifficultyPreference = 'beginner' | 'intermediate' | 'advanced';

export interface GameState {
  // ... existing fields ...
  difficultyPreference: DifficultyPreference;
}

export const DEFAULT_GAME_STATE: GameState = {
  // ... existing defaults ...
  difficultyPreference: 'beginner',
};
```

**Step 2: Introduce a `DifficultyService` that computes the effective tier.**

The architecture overview in `phase4_main.md` already anticipates this service. It merges the manual preference with the XP-derived level to produce the tier passed to the Claude prompt.

```typescript
// DifficultyService — new file: src/app/services/difficulty.service.ts
@Injectable({ providedIn: 'root' })
export class DifficultyService {
  private gameState = inject(GameStateService);

  readonly effectiveTier = computed((): QuestTier => {
    const pref = this.gameState.difficultyPreference();
    const level = this.gameState.level();

    // Advanced preference: always master (regardless of XP level)
    if (pref === 'advanced') return 'master';

    // Intermediate: skip apprentice range, floor at journeyman
    if (pref === 'intermediate') {
      return level >= 13 ? 'master' : 'journeyman';
    }

    // Beginner (default): standard XP-gated progression
    return level >= 13 ? 'master' : level >= 6 ? 'journeyman' : 'apprentice';
  });

  readonly initialBranch = computed((): string => {
    const pref = this.gameState.difficultyPreference();
    if (pref === 'advanced') return 'globals';    // skip setup + commands
    if (pref === 'intermediate') return 'commands'; // skip setup only
    return 'setup';
  });
}
```

**Step 3: Replace the inline tier calculation in `QuestEngineService.generateNextQuest()`.**

The current tier calculation is hardcoded inline. Replace it with a call to `DifficultyService.effectiveTier()`.

```typescript
// Replace the inline tier derivation with:
const tier: QuestTier = this.difficulty.effectiveTier();
```

**Step 4: Add a soft re-calibration nudge.**

In `QuestEngineService.completeQuest()`, track consecutive low scores (below 70) in session memory — not persisted, just an in-memory counter on the service. After two consecutive low scores, emit a signal that the UI can surface as a non-blocking toast: "Feeling stuck? You can adjust your difficulty in Settings." Do not auto-adjust the tier.

```typescript
// In QuestEngineService:
private consecutiveLowScores = 0;

completeQuest(quest: Quest, code: string, evaluation: EvaluationResult): void {
  // existing logic ...

  if (evaluation.score < 70) {
    this.consecutiveLowScores++;
    if (this.consecutiveLowScores >= 2) {
      this.suggestDifficultyAdjustment.set(true); // new signal, UI reads this
      this.consecutiveLowScores = 0;
    }
  } else {
    this.consecutiveLowScores = 0;
  }
}

readonly suggestDifficultyAdjustment = signal(false);
```

**Step 5: Expose the difficulty preference in the settings modal.**

The `SettingsModalComponent` already handles the player's preferences. Add a segmented control (Beginner / Intermediate / Advanced) that writes to `GameStateService.updateDifficultyPreference()`. The change takes effect on the next quest generation — no mid-session disruption.

---

### Decision Matrix

| Dimension | Option 1 (Level-gated prompts) | Option 2 (Score-based adaptation) | Option 3 (Initial assessment) | Option 4 (Manual toggle) |
|---|---|---|---|---|
| **Player agency** | None — fully automatic | None — fully automatic | None — system decides | High — player decides |
| **Implementation cost** | Very low (already 80% built) | Medium (streak logic + tier state) | High (new quest set + branch skip logic) | Low (settings field + DifficultyService) |
| **Measurement reliability** | Medium (XP = time, not mastery) | Low (AI score drives AI generation) | Medium (diagnostic quests need calibration) | High (player self-knowledge is valid input) |
| **First session risk** | Low | Low | High (bad diagnostic = bad first impression) | Low (default = beginner = always safe) |
| **Frustration risk** | Low-medium (XP slowness) | Medium (silent downgrade feels condescending) | High (diagnostic failure is demoralising) | Low (player chose their level) |
| **Skill acceleration** | Medium | High (in theory) | High (skips irrelevant content) | Medium-high (advanced players skip correctly if they self-select well) |
| **Alignment with SDT autonomy** | Low | Low | Low | High |
| **Premature for current phase?** | No | Yes | Yes | No |
| **Works as execution mechanism** | Yes (the delivery layer) | Needs reliable scoring first | Needs branch-skip architecture (C5) first | Yes |

---

## Synthesis & Decision

**Recommended decision: Option 4 (manual difficulty toggle) as the primary control, with Option 1 (level-gated AI prompts) as the continuous scaling mechanism within the chosen band.**

Difficulty in this product is not primarily a balancing problem — it is an onboarding problem. The dominant use case is an experienced developer who opens the tool, sees that the first quest asks them to type `WRITE "Hello"`, and closes the tab. The manual toggle solves this dropout vector directly and immediately. It requires no new measurement infrastructure, no validation of scoring reliability, and no changes to the branch progression architecture.

Difficulty should be **player-controlled at first session** and **automatically progressive within that band** via the existing tier system. The two systems are complementary, not competing. The manual toggle sets the floor; XP-based tier progression handles the ceiling as the player advances through the curriculum.

Options 2 and 3 are deferred, not rejected. Score-based adaptation (Option 2) becomes viable once Code Prediction quests are implemented and provide binary correctness signals that anchor the score distribution. Initial skill assessment (Option 3) becomes viable once the Branch Architecture Redesign (C5) allows non-linear branch entry and the diagnostic quest set can be independently playtested.

The implementation is additive to the existing codebase. `DifficultyService` is the single new service. The only modifications to existing services are one line in `QuestEngineService.generateNextQuest()` and a new field in `GameState`. The settings modal already provides the right UI surface.

One design assumption to flag: this analysis assumes the player typically chooses a difficulty at setup and does not revisit it. If telemetry (once added) reveals that players frequently change difficulty mid-curriculum, the toggle should be surfaced more prominently — but the underlying architecture does not change.
