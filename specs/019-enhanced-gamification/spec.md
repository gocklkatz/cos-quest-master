# Feature Specification: Enhanced Gamification

**Feature Branch**: `019-enhanced-gamification`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Boss Quests, Hint System, and Unlockable Cosmetics for engagement"

## Pedagogical Context

**The Learning Problem**: After completing Phase 3, the game ends after ~21 quests, which is insufficient
for meaningful skill acquisition. Phase 4 must make the game infinite while maintaining high engagement.
Existing gamification elements (XP, levels, branch progress) provide basic motivation but lack the
extrinsic incentives that drive habit formation in professional learners.

**The Cognitive Solution**: Self-Determination Theory (Deci & Ryan) identifies autonomy, competence,
and relatedness as the three innate psychological needs for intrinsic motivation. Phase 4's gamification
addresses competence through goal gradients (boss quests as branch climaxes) and extrinsic reward
through XP-based hint systems. Unlockable cosmetics leverage the endowment effect — players value
and persist toward goals they have invested in.

**Principle**: Competence + Autonomy (Self-Determination Theory)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Boss Quests at Sub-Branch Climaxes (Priority: P1)

Each sub-branch must end with a Boss Quest that synthesizes all concepts from that sub-branch.
The Boss Quest serves as the climactic challenge before transitioning to the next sub-branch.

**Why this priority**: Boss Quests provide the goal-gradient effect identified in both Q6 analyses.
Without a climactic endpoint, sub-branches feel incomplete, reducing the motivation to complete them.

**Independent Test**: Complete all quests in the `classes-methods` sub-branch including the Boss Quest.
Verify that upon success, the next quest is in the next sub-branch (`classes-inheritance`) and the
Boss Quest score is displayed with special emphasis.

**Acceptance Scenarios**:

1. **Given** a player has completed all non-Boss quests in a sub-branch, **When** they generate the
   next quest, **Then** it is identified as a Boss Quest with a distinctive title (e.g., "Chapter 2,
   Mission 4: The Classes Methods Synthesis").

2. **Given** a Boss Quest is presented, **When** the player successfully completes it, **Then** they
   see a victory message highlighting the Boss Quest nature and their quest-specific score.

3. **Given** a Boss Quest is presented, **When** the player fails it, **Then** they see feedback
   indicating it was a Boss Quest and what to review before retrying.

4. **Given** a player completes a Boss Quest successfully, **When** they proceed to the next sub-branch,
   **Then** their current sub-branch progress resets to 0 and the next sub-branch begins with its
   first (non-Boss) quest.

---

### User Story 2 — Hint System with XP-Costed Access (Priority: P1)

Players who struggle with a quest may request hints. Three hint levels are available, each costing
a percentage of the quest's XP reward. This provides a safety net without removing the challenge.

**Why this priority**: The Q6 analyses identified hint systems as the most effective dropout-prevention
mechanic that doesn't punish breaks (unlike streaks or lives). It preserves autonomy while ensuring
learners always have a path forward.

**Independent Test**: Start a new quest. Request Level 1 hint. Verify XP reward is reduced by 10%.
Complete the quest successfully. Verify actual XP received equals the reduced amount.

**Acceptance Scenarios**:

1. **Given** a player is working on a non-Boss quest, **When** they request a hint, **Then** they see
   three hint levels: Level 1 (10% cost), Level 2 (25% cost), Level 3 (50% cost).

2. **Given** a player selects a hint level, **When** they confirm, **Then** the cost is deducted
   immediately from their quest reward and the hint content is revealed.

3. **Given** a player has requested a hint, **When** they complete the quest, **Then** the reduced
   XP reward is applied (base XP minus percentage cost).

4. **Given** a player has failed a quest, **When** they retry, **Then** any hints previously
   requested on that quest instance remain available (hints persist per quest, not per attempt).

5. **Given** a player has not failed any quest in this session, **When** they attempt to request
   a hint, **Then** they see a message indicating they must fail at least once before hints unlock.

---

### User Story 3 — Unlockable Editor Themes (Priority: P2)

Each branch/sub-branch has a unique color theme. Completing all quests in a sub-branch (including
its Boss Quest) unlocks that theme for use in the editor. This creates goal-gradient progression
and rewards mastery.

**Why this priority**: Unlockable cosmetics provide low-friction motivation (no punishment risk)
and leverage the endowment effect. The themes also have functional utility — distinct colors help
players mentally map their progress to sub-branches.

**Independent Test**: Complete all quests in the `classes-properties` sub-branch. Verify the
"Object Properties" theme is added to the Settings modal theme selector. Switch to that theme
and verify the editor background changes to match the theme color.

**Acceptance Scenarios**:

1. **Given** a player completes all quests in a sub-branch including its Boss Quest, **When** they
   navigate to Settings > Editor Theme, **Then** they see a new theme option corresponding to that
   sub-branch (e.g., "Classes — Properties Theme").

2. **Given** a sub-branch theme is unlocked, **When** the player selects it in Settings, **Then**
   the theme is applied to the Monaco editor (background, bracket colors, gutter markers).

3. **Given** a player has unlocked multiple themes, **When** they switch between them, **Then** the
   change is instant and persists across browser reloads.

4. **Given** a player has not completed a sub-branch, **When** they open the Settings theme selector,
   **Then** themes for incomplete sub-branches are grayed out or visually muted.

---

### User Story 4 — Combo Bonus XP (Priority: P3)

Players who complete quests consecutively without failures earn a combo multiplier that increases
with streak length (e.g., 3x XP at streak = 5). This rewards flow state and habit formation.

**Why this priority**: The Q6 analyses identified combo mechanics as the most effective "flow state"
enabler. Unlike timed modes, combos don't induce anxiety — they reward consistent engagement.

**Independent Test**: Complete 5 quests in a row without failures. Verify the 5th quest shows a
"Combo x3" indicator and awards 3x its base XP.

**Acceptance Scenarios**:

1. **Given** a player has completed 3 consecutive quests without failures, **When** they complete
   the 4th, **Then** they see a visual indicator (e.g., "Combo x2" badge).

2. **Given** a player has completed 5 consecutive quests without failures, **When** they complete
   the 6th, **Then** they see "Combo x3" and receive 3x the quest's base XP.

3. **Given** a player has failed a quest, **When** they complete the next quest, **Then** the combo
   resets to 1x (no multiplier) and any active combo indicator disappears.

4. **Given** a player has an active combo, **When** they request and use a hint, **Then** the combo
   is reset to 1x (using hints is considered accepting help, breaking flow).

---

### Edge Cases

- A Boss Quest failure does NOT reset combo streak (Boss Quests are special; failure is expected
  and part of the learning process).
- If a player fails a Boss Quest but completes the same sub-branch's next quest successfully,
  the combo starts fresh from that next quest.
- Unlockable themes persist even if a player does Reset All Progress (they are "legacy unlocks"
  that must be re-earned, maintaining motivation for return visitors).
- Hint levels are per-quest, not per-session. A player may have requested hints on Quest 1 and
  still request new hints on Quest 2.
- If a player has 0 XP in their reward pool (e.g., early beginner quests), the hint cost is
  clamped to a minimum of 5 XP (not the computed percentage).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST identify the final quest in each sub-branch as a Boss Quest and
  assign it a Boss Quest flag.
- **FR-002**: Upon successful Boss Quest completion, the system MUST display a victory message
  that explicitly identifies it as a Boss Quest and shows the quest-specific score with
  visual emphasis.
- **FR-003**: After successful Boss Quest completion, the system MUST reset the current sub-branch
  progress counter to 0 and advance the player to the next sub-branch in the curriculum order.
- **FR-004**: The system MUST expose three hint levels with percentage-based costs: Level 1 = 10%,
  Level 2 = 25%, Level 3 = 50% of the quest's base XP reward.
- **FR-005**: Hint costs MUST be deducted immediately upon hint selection (not at quest completion).
- **FR-006**: The minimum hint cost MUST be clamped to 5 XP (even if percentage calculation yields
  less than 5 XP).
- **FR-007**: Hints MUST NOT be available until the player has failed at least one quest in the
  current session.
- **FR-008**: After failing a quest, the system MUST display a hint request button on the failure
  modal.
- **FR-009**: Upon hint request, the system MUST reveal hint content and deduct the selected
  percentage from the quest's XP reward pool.
- **FR-010**: The system MUST track consecutive success streaks and apply multiplier tiers:
  - Streak = 1–2: 1x (no multiplier, default)
  - Streak = 3–4: 2x XP
  - Streak = 5+: 3x XP
- **FR-011**: The system MUST display the combo multiplier as a visual indicator on quests where
  streak >= 3.
- **FR-012**: The system MUST reset the combo streak to 0 when the player fails a quest.
- **FR-013**: The system MUST reset the combo streak when the player requests a hint.
- **FR-014**: The system MUST NOT reset the combo streak when the player fails a Boss Quest.
- **FR-015**: Each sub-branch MUST have a unique color theme associated with it.
- **FR-016**: Upon completing all quests in a sub-branch (including Boss Quest), the system MUST
  unlock that sub-branch's theme.
- **FR-017**: Unlocked themes MUST be available in Settings > Editor Theme and persist across
  browser reloads.
- **FR-018**: Settings MUST allow players to select any unlocked theme, with immediate application
  to the Monaco editor.
- **FR-019**: Themes for incomplete sub-branches MUST be visually muted (grayed out or disabled)
  in the Settings theme selector.

### Key Entities

- **BossQuest**: A special quest type marking the climax of a sub-branch. Flags:
  `isBossQuest: boolean`, `subBranchName: string`, `branchCompletionReward: boolean`
- **HintLevel**: `level1 | level2 | level3` with corresponding cost percentages (10%, 25%, 50%)
- **ComboMultiplier**: `1 | 2 | 3` based on consecutive success streak length
- **UnlockedTheme**: A theme associated with a completed sub-branch, stored in GameState

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sub-branches have exactly one Boss Quest at their final position, with no
  false positives or false negatives.
- **SC-002**: Boss Quest completion success rate (among players who reach the Boss Quest) is at
  least 80% on first attempt.
- **SC-003**: 90% of hint requests result in quest completion within 3 attempts (no further hints
  requested).
- **SC-004**: The average combo multiplier applied across all quest completions is at least 1.5x.
- **SC-005**: At least 50% of unlocked themes are selected by players within 7 days of unlocking.
- **SC-006**: Build and all existing automated tests pass with zero regressions after implementation.

## Assumptions

- C5 (Branch Architecture Redesign) is complete (✅) — the sub-branch structure defines Boss Quest
  placement.
- F17 (Infinite Quest Loop / Prestige) is complete (✅) — Boss Quest re-generation at higher
  difficulty on Prestige runs is supported.
- F18 (Adaptive Difficulty) is complete (✅) — the hint system can adapt hints based on player's
  effective difficulty tier.
- The Monaco editor supports custom theming via the `editor.renderingContext` API.
- Combo streak is tracked per-session only (not persisted). Resetting progress resets the combo.
- Boss Quests use the same generation mechanism as standard quests, with an added prompt instruction:
  "This is a Boss Quest — synthesize all concepts from this sub-branch into a single comprehensive challenge."

## Dependencies

- **C5 (Branch Architecture)**: Sub-branch structure defines Boss Quest placement.
- **F17 (Infinite Quest Loop)**: Prestige run difficulty escalation applies to Boss Quests.
- **F18 (Adaptive Difficulty)**: Hint content and difficulty scaling depend on effective tier.

## Out of Scope

- Timed challenge mode (Q6 identified anxiety risk).
- Leaderboards (requires multiplayer infrastructure).
- Streak-based lives system (punishes busy learners).
- Certificate / graduation system (curriculum definition not yet mature).
- Multiplayer hint sharing.
- Player-created quests.
