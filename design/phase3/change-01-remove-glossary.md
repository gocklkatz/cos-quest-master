# Change 01: Remove Glossary Feature (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-high |
| Status | ✅ Completed |
| Pedagogical Principle | Cognitive Load Reduction |
| Depends On | — |

---

## Task Prompt
Complete removal of the Glossary component, service, and data from the Angular application. Ensure documentation links are still accessible via Quest hints.

---

## Pedagogical Design
**The Learning Problem**: Beginners are often overwhelmed by "sidebar fatigue"—too many tabs and reference materials that distract from the core practice loop.
**The Cognitive Solution**: By removing the static Glossary and moving documentation links into the "flow" of the quest (hints and AI chat), we reduce cognitive switching costs and keep the learner focused on the code.

---

## Implementation Details
- **Frontend**: 
    - Delete `src/app/components/glossary/`
    - Delete `src/app/services/glossary.service.ts`
    - Delete `src/app/data/glossary.ts`
    - Remove Glossary tab from `Sidebar` or `Header` components.
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Verification Plan
1. Confirm the Glossary tab is no longer visible in the UI.
2. Verify that `ng build` succeeds without circular dependencies or missing imports.
3. Check that Quest hints still render documentation links correctly.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
