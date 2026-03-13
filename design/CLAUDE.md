# Claude Code — Design Folder Instructions

This file applies to all phase subfolders under `design/`.

---

## What lives here

| File | Purpose |
|---|---|
| `phaseN/phaseN_main.md` | TOC and status overview — Phase Retrospective, Carry-overs, Features table, dependency graph, architecture diagram, Development Sequence |
| `phaseN/feature-NN-*.md` | One doc per feature: status header, task prompt, design rationale, implementation notes |
| `phaseN/change-NN-*.md` | One doc per refactoring/removal: simplified feature template, no Pedagogical Design section required |
| `phaseN/DECISIONS.md` | Chronological log of major architectural forks and rejected alternatives |

---

## When editing a feature doc

- Update the **status** in the header table (`⬜ Not started` → `🚧 In progress` → `✅ Complete`) when status changes.
- Also update the status in the **Features table** in the phase's `*_main.md` to match.
- If you add or remove files during implementation, update the **Files Changed** list in the feature doc.
- If you make a significant architectural choice that wasn't in the spec, add an entry to `DECISIONS.md`.
- Do not remove **Open Questions** that are still unresolved. Mark resolved ones with ~~strikethrough~~ and a brief answer.

---

## When starting a new implementation session

1. Open the relevant `feature-NN-*.md` doc.
2. Read the **Task Prompt** section first — it gives you scope and acceptance criteria.
3. Read **Depends On** — check those feature docs for the interfaces/models you will consume.
4. Check **Open Questions** — some may need a decision before you can start. Ask the user.
5. Read **Files Changed** to know which source files to open before writing any code.
6. Work on one feature doc per session. Do not drift into other features unless a dependency forces it.

---

## When completing a feature

1. Run `ng build` — must produce zero errors.
2. Run `ng test` — must produce zero regressions.
3. Update the **Files Changed** list in the feature doc with every file touched.
4. Mark status `✅ Complete` in both the feature doc header and the Features table in `*_main.md`.
5. If any significant architectural choice was made that wasn't in the spec, add an entry to `DECISIONS.md`.

---

## When creating a new feature doc

Copy this skeleton and adapt the **Phase-specific fields** section for the current phase:

```markdown
# Feature NN: [Title] (PhaseN)

| Field | Value |
|---|---|
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

## DECISIONS.md format

Each entry must follow this structure:

```markdown
### YYYY-MM-DD: [Short title]
**Context**: Why the decision was needed.
**Decision**: What was chosen.
**Rejected alternatives**: What else was considered and why it was ruled out.
```

Do not delete entries from `DECISIONS.md` — only add new entries or append corrections to existing ones.

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
6. **Feature Dependency Graph** — Mermaid `graph TD`. Add edges; do not redesign.
7. **Architecture Overview** — ASCII diagram updated to show new services and endpoints.
8. **Development Sequence** — ordered numbered list of implementation steps.
9. **Design Decisions** — single line: `See [DECISIONS.md](DECISIONS.md).` Do **not** duplicate decision content inline.

---

## Conventions

- **Status values**: `⬜ Not started` / `🚧 In progress` / `✅ Complete`
- **Priority values**: `phaseN-high` / `phaseN-mid` / `phaseN-low` / `backlog`
- **File naming**: `feature-NN-kebab-case.md` / `change-NN-kebab-case.md` (two-digit zero-padded number)
- **Feature numbering**: global and sequential across phases — never reuse a number. Check the previous phase's highest feature number before assigning a new one.
- **Dependency graph**: use the Mermaid `graph TD` format already in `*_main.md` — add edges, do not redesign the graph
- **Single source of truth**: feature details live only in the feature doc. `*_main.md` links to feature docs; it does not summarise them.
