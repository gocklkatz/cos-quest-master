# Claude Code — Design Folder Instructions

This file applies to all phase subfolders under `design/`.

---

## What lives here

| File | Purpose |
|---|---|
| `phaseN/phaseN_main.md` | TOC and status overview — Phase Retrospective, Carry-overs, tasks table, dependency graph, architecture diagram, Development Sequence |
| `phaseN/task-NN-*.md` | One doc per task: status header, task prompt, design rationale, implementation notes |

---

## When editing a task doc or change

- Update the **status** in the header table (`⬜ Not started` → `🚧 In progress` → `✅ Complete`) when status changes.
- Also update the status in the phase's `*_main.md` to match.

---

## When starting a new implementation session

1. Open the relevant `task-NN-*.md` doc.
2. Read the **Task Prompt** section first — it gives you scope and acceptance criteria.
3. Read **Depends On** — check those tasks docs for the interfaces/models you will consume.
4. Check **Open Questions** — some may need a decision before you can start. Ask the user.
5. Read **Files Changed** to know which source files to open before writing any code.
6. Work on one task doc per session. Do not drift into other tasks unless a dependency forces it.
7. Glance at `DECISIONS.md` — confirm none of the architectural decisions for this feature have been superseded by decisions made in a later task this session.

---

## When completing a task

1. Run `ng build` — must produce zero errors.
2. Run `ng test` — must produce zero regressions.
3. Update the **Files Changed** list in the task doc with every file touched.
4. Mark status `✅ Complete` in both the task doc header and the Tasks table in `*_main.md`.

---

## When creating a new task doc

Copy this skeleton and adapt the **Phase-specific fields** section for the current phase:

```markdown
# Feature NN: [Title] (PhaseN)

| Field | Value |
|---|---|
| Phase | PhaseN |
| Priority | phaseN-high / phaseN-mid / phaseN-low |
| Status | ⬜ Not started |
| Depends On | — |
| Pedagogical Principle | [e.g. Dual Coding / Metacognition] |

---

## Task Prompt
[Concise description of what to implement and acceptance criteria.]

---

## Pedagogical Design

**The Learning Problem**: [Why is this hard for students?]

**The Cognitive Solution**: [How does this feature help?]

---

## Implementation Details

- **Frontend**: ...
- **IRIS Backend**: ...
- **AI Prompts**: ...

---

## Files Changed

- `path/to/file.ts` — [reason]

---

## Open Questions

- [ ] ...

---

## Verification Plan
1. [Step 1]
2. [Step 2]
```

Then add a row to the Features table in `*_main.md` and add an edge to the dependency graph if applicable.

---

## When creating a new change doc

Copy this skeleton for `change-NN-*.md` files:

~~~markdown
# Change NN: [Title] (PhaseN)

| Field | Value |
|---|---|
| Phase | PhaseN |
| Priority | phaseN-high / phaseN-mid / phaseN-low |
| Status | ⬜ Not started |
| Depends On | — |
| Pedagogical Principle | [e.g. Cognitive Load Reduction] |

---

## Task Prompt
[What to remove, refactor, or decommission. Include acceptance criteria.]

---

## Rationale
[Why is this change being made? What problem does it solve?]

---

## Implementation Details

- **Frontend**: ...
- **IRIS Backend**: ...

---

## Files Changed

- `path/to/file.ts` — [reason]

---

## Open Questions

- [ ] ...

---

## Verification Plan
1. [Step 1]
2. [Step 2]
~~~

Then add a row to the Refactorings & Decommissions table in `*_main.md`.

---

## Additional requirements

- **Pedagogical Alignment**: Before implementing, confirm the feature adheres to the cognitive science principle defined in the feature doc (e.g., Dual Coding, Metacognition).
- **Testing**: Every feature MUST include a verification step and a corresponding automated test (Unit or E2E). For UI features, use Playwright or Vitest. For services, use Vitest.
- **New IRIS endpoints**: If a new endpoint is added, update the **IRIS REST API Reference** in the root `README.md`.

---

## When creating a new phase main doc

A `phaseN_main.md` must contain these sections **in order**:

1. **What Phase N-1 Established** — a short retrospective table: key architectural changes from the previous phase and how they constrain or enable the current one. Do not duplicate feature descriptions; one row per architectural impact.
2. **Carry-overs from Phase N-1** — a table of any incomplete features from the previous phase that are promoted into this phase. Link to the original feature doc (no duplication of content).
3. **Phase N Priority Tiers** — three rows (P1/P2/P3) with theme and pedagogical rationale.
4. **Features** — status table linking to individual feature docs. Do **not** add inline feature summaries here; the feature docs are the single source of truth.
5. **Phase N Refactorings & Decommissions** — status table for `change-NN-*` items.
   > **Optional Bugs section**: If the phase includes reactive bug fixes, add a `### Bugs` table (same format as the Features table) between section 5 and section 6. Bug docs use the naming convention `bug-NN-kebab-case.md` and follow the same task doc skeleton as feature docs.
6. **Feature Dependency Graph** — Mermaid `graph TD`. Add edges; do not redesign.
7. **Architecture Overview** — ASCII diagram updated to show new services and endpoints.
8. **Development Sequence** — ordered numbered list of implementation steps.
9. **Design Decisions** — single line: `See [DECISIONS.md](DECISIONS.md).` Do **not** duplicate decision content inline.

---

## DECISIONS.md structure

Each phase subdirectory must contain a `DECISIONS.md`. Use this entry format:

~~~markdown
### D-PN-NN · [Date]: [Short title]

**Context**: [Situation that forced a choice.]

**Decision**: [What was chosen.]

**Rejected alternatives**: [What was not chosen and why.]

**Affects**: [feature-NN-*.md](feature-NN-*.md)

---
~~~

- `D-PN-NN` — stable ID: `P` = phase letter, `N` = phase number, `NN` = two-digit sequential index.
- IDs are never reused or renumbered.
- The `Affects` link uses a relative path within the same phase subdirectory.
- One `DECISIONS.md` per phase; no inline decision tables in `*_main.md`.

---

## Conventions

- **Status values**: `⬜ Not started` / `🚧 In progress` / `✅ Complete`
- **Priority values**: `phaseN-high` / `phaseN-mid` / `phaseN-low` / `backlog`
- **File naming**: `feature-NN-kebab-case.md` / `change-NN-kebab-case.md` (two-digit zero-padded number)
- **Feature numbering**: global and sequential across phases — never reuse a number. Check the previous phase's highest feature number before assigning a new one.
- **Dependency graph**: use the Mermaid `graph TD` format already in `*_main.md` — add edges, do not redesign the graph
- **Single source of truth**: feature details live only in the feature doc. `*_main.md` links to feature docs; it does not summarise them.
