# Change 02: Remove Skill Tree and Quest Log from Left Pane (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Complete |
| Pedagogical Principle | Cognitive Load Reduction |
| Depends On | — |

---

## Task Prompt
Remove the Skill Tree and Quest Log panels from the left pane of the Angular app. The left pane should only contain the components that directly support the active quest-and-feedback loop.

---

## Pedagogical Design
**The Learning Problem**: A crowded left pane with navigational panels (Skill Tree, Quest Log) competes for attention with the primary learning loop — reading the quest, writing code, and reviewing AI feedback.
**The Cognitive Solution**: Removing these panels eliminates extraneous cognitive load, keeping the learner's working memory focused on the current quest rather than on navigation or progress tracking.

---

## Implementation Details
- **Frontend**:
    - Remove the `SkillTreeComponent` from the left-pane template and delete its component files.
    - Remove the `QuestLogComponent` from the left-pane template and delete its component files.
    - Remove any associated services or data files that are no longer referenced after deletion.
    - Update left-pane layout/routing to account for the removed panels.
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Open Questions

- ~~What should happen to branch selection/filtering in QuestPanel after the Skill Tree is removed?~~ Resolved: show all available quests at all times — `selectedBranch` signal and `filteredQuests` computed removed; template uses `availableQuests()` directly.

---

## Files Changed

- `src/app/components/quest-panel/quest-panel.component.ts` — removed `SkillTreeComponent`/`QuestLogComponent` imports, `allQuests` input, `selectedBranch` signal, `filteredQuests` computed, `questLog` computed, `GameStateService` inject
- `src/app/components/quest-panel/quest-panel.component.html` — removed `<app-skill-tree>`, `<app-quest-log>`, branch-filter-tag; replaced `filteredQuests()` with `availableQuests()`
- `src/app/app.html` — removed `[allQuests]` binding from `<app-quest-panel>`
- `src/app/components/skill-tree/` — deleted (skill-tree.component.ts, .html, .scss)
- `src/app/components/quest-log/` — deleted (quest-log.component.ts, .html, .scss)
- `src/app/data/skill-tree.ts` — deleted

---

## Verification Plan
1. Confirm neither the Skill Tree nor the Quest Log panel is visible in the left pane.
2. Verify `ng build` succeeds with zero errors.
3. Verify `ng test` produces zero regressions.
