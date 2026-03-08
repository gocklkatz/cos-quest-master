# Claude Code — Design Folder Instructions

This file tells Claude Code how to work within the `design/phase2/` folder.

---

## What lives here

| File | Purpose |
|---|---|
| `phase2_main.md` | TOC and status overview — links to feature docs, dependency graph, architecture diagram |
| `feature-NN-*.md` | One doc per feature: status header, task prompt, design rationale, implementation notes |
| `DECISIONS.md` | Chronological log of major architectural forks and rejected alternatives |
| `CLAUDE.md` | This file — instructions for Claude when working in this folder |

---

## When editing a feature doc

- Update the **status** in the header table (`⬜ Not started` → `🚧 In progress` → `✅ Complete`) when status changes.
- Also update the status in the **Features table** in `phase2_main.md` to match.
- If you add or remove files during implementation, update the **Files changed** list in the feature doc.
- If you make a significant architectural choice that wasn't in the spec, add an entry to `DECISIONS.md`.
- Do not remove **Open Questions** that are still unresolved. Mark resolved ones with ~~strikethrough~~ and a brief answer.

---

## When starting a new implementation session

1. Open the relevant `feature-NN-*.md` doc.
2. Read the **Task Prompt** section first — it gives you scope and acceptance criteria.
3. Read **Depends On** — check those feature docs for the interfaces/models you will consume.
4. Check **Open Questions** — some may need a decision before you can start. Ask the user.
5. Read **Files changed** to know which source files to open before writing any code.
6. Work on one feature doc per session. Do not drift into other features unless a dependency forces it.

---

## When creating a new feature doc

Copy this skeleton:

```markdown
# Feature N: Title

| Field | Value |
|---|---|
| Priority | phase2-high / phase2-mid |
| Status | ⬜ Not started |
| Depends On | — |

---

## Task Prompt

[1-3 sentences: what to implement, key files, acceptance criteria]

---

## Design

**The problem**: ...

**The solution**: ...

---

## Implementation

[Model changes, UI changes, service logic, files changed]

---

## Open Questions

- [ ] ...
```

Then add a row to the Features table in `phase2_main.md` and add an edge to the dependency graph if applicable.

---

## Conventions

- **Status values**: `⬜ Not started` / `🚧 In progress` / `✅ Complete`
- **Priority values**: `phase2-high` / `phase2-mid` / `backlog`
- **File naming**: `feature-NN-kebab-case.md` (two-digit zero-padded number)
- **Dependency graph**: use the ASCII format already in `phase2_main.md` — add edges, do not redesign the graph
- Do not delete content from `DECISIONS.md` — only add entries or append corrections
