# Feature Specification: Adaptive Difficulty

**Feature Branch**: `018-adaptive-difficulty`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Adaptive difficulty toggle and level-gated quest generation"

## Pedagogical Context

**The Learning Problem**: The existing difficulty model scales quest complexity with XP earned,
which measures time-on-task rather than demonstrated mastery. An experienced developer who already
knows an adjacent language (Python, Java, SQL) sees the same introductory quests as a complete
beginner, risking first-session dropout before the tool can demonstrate its value.

**The Cognitive Solution**: Self-Determination Theory (Deci & Ryan) identifies autonomy as the
strongest driver of intrinsic motivation in high-agency professionals. Giving the player explicit
control over their starting difficulty removes the onboarding mismatch without requiring the system
to infer skill it cannot yet reliably measure.

**Principle**: Autonomy + Mastery (Self-Determination Theory)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First-Session Difficulty Selection (Priority: P1)

A player opening the app for the first time selects their background — Beginner, Intermediate, or
Advanced — before the first quest is generated. The selection determines which part of the
curriculum they enter and how hard the AI-generated quests will be.

**Why this priority**: This is the primary dropout-prevention mechanism. Without it, experienced
developers see trivially easy first quests and disengage before the tool demonstrates value.

**Independent Test**: Create a fresh player session. Select "Advanced — OOP". Verify the first
quest is in the Classes sub-branch (not Setup or Commands) and its complexity is visibly harder
than a Beginner first quest on the same sub-branch.

**Acceptance Scenarios**:

1. **Given** a fresh player session with no prior progress, **When** the player opens the app for
   the first time, **Then** a difficulty selection prompt is shown before the first quest loads.

2. **Given** the difficulty prompt is shown, **When** the player selects "Advanced" and then
   "More OOP background", **Then** their starting sub-branch is Classes — Methods and quest
   complexity reflects master-level difficulty.

3. **Given** the difficulty prompt is shown, **When** the player selects "Advanced" and then
   "More SQL background", **Then** their starting sub-branch is SQL — Queries and quest
   complexity reflects master-level difficulty.

4. **Given** the difficulty prompt is shown, **When** the player selects "Intermediate",
   **Then** their starting sub-branch is Classes — Properties (skipping Setup, Commands, Globals)
   and quest complexity reflects at least journeyman-level difficulty.

5. **Given** the difficulty prompt is shown, **When** the player selects "Beginner",
   **Then** their starting sub-branch is Setup and quest complexity uses standard XP-gated
   progression starting at apprentice.

---

### User Story 2 — Difficulty Preference in Settings (Priority: P1)

A player can change their difficulty preference at any time through the Settings panel. The change
takes effect on the next quest generated — the quest currently in progress is unaffected.

**Why this priority**: Miscalibration is inevitable. Players who over-select Advanced must have a
low-friction path back down. This is the primary mitigation for the autonomy model's known failure
mode (ego-driven miscalibration).

**Independent Test**: Start a session on "Advanced". Change to "Intermediate" in Settings mid-quest.
Complete the current quest. Verify the next generated quest reflects Intermediate complexity.

**Acceptance Scenarios**:

1. **Given** a player on "Advanced" difficulty, **When** they open Settings and change to
   "Intermediate", **Then** the in-progress quest is unaffected and completes normally.

2. **Given** the player from scenario 1 completes their current quest, **When** the next quest
   is generated, **Then** it reflects Intermediate (journeyman) complexity.

3. **Given** a player who has set their difficulty preference, **When** they reload the browser,
   **Then** their difficulty preference is preserved across sessions.

---

### User Story 3 — Soft Recalibration Nudge (Priority: P2)

After two consecutive low-scoring quest completions in a single session, the player sees a
non-blocking suggestion to consider adjusting their difficulty in Settings. No automatic tier
change occurs; the player retains full control.

**Why this priority**: The manual toggle respects autonomy but creates a failure mode — players
who misjudge their level end up stuck. The nudge provides a visible, non-intrusive exit path
without overriding player choice.

**Independent Test**: Complete two consecutive quests with low scores. A dismissible toast or
inline message appears suggesting the player check Settings. It does not block quest interaction.

**Acceptance Scenarios**:

1. **Given** a player has completed two consecutive quests with low scores in the current session,
   **When** they receive the second low-score evaluation, **Then** a non-blocking suggestion to
   adjust difficulty appears.

2. **Given** the recalibration nudge has appeared, **When** the player dismisses it,
   **Then** no further nudges appear for the remainder of the session.

3. **Given** the recalibration nudge has appeared, **When** the player clicks the Settings
   link within the nudge, **Then** the Settings modal opens.

4. **Given** a player who saw the nudge in a previous session, **When** they start a new
   session and again scores low on two consecutive quests, **Then** the nudge can appear again
   (it resets per-session, not permanently suppressed).

---

### Edge Cases

- An Advanced player who completes all Classes sub-branches continues normally into SQL or
  whichever sub-branch comes next in the curriculum order.
- An Advanced (SQL) player who has already completed all SQL sub-branches before changing
  preference continues from the next unvisited sub-branch in the standard order.
- Changing difficulty preference mid-curriculum preserves all branch progress already earned.
  Only future quest generation difficulty changes; the player is not moved backward.
- A player who selects Advanced and resets progress (Reset All Progress) will see the difficulty
  selection prompt again on the next session (preference resets with game state).
- The nudge cannot appear for a Beginner player who failed two quests — it appears regardless
  of current difficulty level so the player can consider switching down from any tier.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a difficulty selection prompt (Beginner / Intermediate /
  Advanced) on the player's first ever session, before any quest is generated.
- **FR-002**: A player who selects Advanced MUST be asked a secondary question ("More OOP
  background or more SQL background?") that determines their specific entry sub-branch.
- **FR-003**: The system MUST use the difficulty preference to determine the player's initial
  curriculum entry point:
  - Beginner → `setup`
  - Intermediate → `classes-properties` (skips setup, commands, globals)
  - Advanced (OOP) → `classes-methods` (skips setup, commands, globals, classes-properties)
  - Advanced (SQL) → `sql-queries` (skips all sub-branches up to and including all classes)
- **FR-004**: The system MUST use the difficulty preference to compute an effective complexity
  tier that floors quest difficulty:
  - Beginner → standard XP-gated tier progression (apprentice → journeyman → master)
  - Intermediate → minimum journeyman, caps at master via XP
  - Advanced → always master complexity, regardless of XP level
- **FR-005**: The player's difficulty preference and advanced focus (OOP/SQL) MUST persist across
  browser sessions.
- **FR-006**: A player MUST be able to change their difficulty preference at any time via the
  Settings panel without interrupting the session in progress.
- **FR-007**: A difficulty preference change MUST take effect on the next generated quest and MUST
  NOT alter the quest currently in progress or any already-earned branch progress.
- **FR-008**: The system MUST surface a non-blocking recalibration nudge after two consecutive
  low-scoring quest completions in one session. The nudge MUST NOT appear more than once per
  session.
- **FR-009**: The recalibration nudge MUST be dismissible by the player and MUST NOT block quest
  interaction.
- **FR-010**: The recalibration nudge MUST contain a direct action that opens the Settings panel.
- **FR-011**: The quest generation call MUST receive two independent difficulty signals:
  - **Effective complexity tier** (derived from difficulty preference + XP level) — controls
    concept depth and syntax complexity within the quest.
  - **Quest category** (derived from prestige level: 0 = write, 1 = debug, 2+ = optimize) —
    controls the type of reasoning required. These are orthogonal; a master-tier debug quest
    on Classes — Inheritance is a hard inheritance concept presented as broken code.

### Key Entities

- **DifficultyPreference**: Player-chosen starting level (`beginner | intermediate | advanced`).
  Stored persistently. Determines entry sub-branch and effective tier floor.
- **AdvancedFocus**: Secondary preference for Advanced players (`oop | sql`). Determines the
  specific sub-branch entry point. Stored persistently alongside DifficultyPreference.
- **EffectiveTier**: Computed value merging DifficultyPreference with XP-derived level. Controls
  quest complexity in generation. Values: `apprentice | journeyman | master`.
- **QuestCategory**: Derived from prestige level. Controls reasoning style. Values:
  `write | debug | optimize`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of first-ever sessions (empty game state) display the difficulty selection
  prompt before generating the first quest. No first session bypasses the prompt.
- **SC-002**: A player who selects "Advanced — OOP" receives a first quest whose sub-branch
  matches `classes-methods`. A player who selects "Beginner" receives a first quest in `setup`.
- **SC-003**: After changing difficulty preference in Settings and completing the current quest,
  the very next generated quest uses the updated effective tier (verifiable via the generation
  parameters passed to the AI).
- **SC-004**: The recalibration nudge appears after exactly two consecutive low-score completions
  and at most once per session, in 100% of qualifying sessions.
- **SC-005**: Difficulty preference and advanced focus survive a full browser reload with no data
  loss.
- **SC-006**: Build and all existing automated tests pass with zero regressions after implementation.

## Assumptions

- "Low score" for recalibration purposes is a quest evaluation score below 70 (0–100 scale).
  This threshold is implementation-level and is not shown to the player.
- The difficulty prompt appears once — on the first session where no preference is stored.
  Returning sessions start directly from the saved state.
- The Advanced secondary question (OOP vs SQL) is asked only once at first selection. If the
  player changes from Advanced to another tier and back, they are asked the secondary question
  again, since their preference may have changed.
- "Low score" streak tracking is per-session only (not persisted). Starting a new browser
  session resets the streak counter.
- C5 (Branch Architecture Redesign) is complete (✅) — the sub-branch string identifiers it
  defines are consumed by this feature.
- F17 (Infinite Quest Loop / Prestige) is complete (✅) — the `prestigeLevel` field in game
  state that drives QuestCategory is available.
- This feature does NOT implement score-based automatic difficulty adjustment. That is deferred
  to Phase 5 once binary correctness signals from Code Prediction quests are available.
- Resetting All Progress also resets difficulty preference to the factory default (Beginner),
  consistent with the existing behavior of resetting all game state.
