# Feature 5: Concept Glossary & Documentation Links

| Field | Value |
|---|---|
| Priority | phase2-mid |
| Status | ✅ Complete |
| Depends On | [Feature 3](feature-03-doc-links-hints.md) (doc links precursor) |
| Pedagogical Principle | Dual Coding |

---

## Task Prompt

Build an in-app concept glossary driven by the `conceptsIntroduced` data already captured in every quest. Key files: `glossary.ts` (data), `glossary.service.ts`, `glossary/` component. Acceptance: active quest concepts are auto-highlighted in the glossary tab; clicking a concept badge opens a popover; full-text search works across all learned concepts.

---

## Design

**The problem**: When a quest introduces `$ZSTRIP` or `%JSON.Adaptor`, the player has no in-app reference. They must alt-tab to browser docs.

**The solution**: Build an in-app **Concept Glossary** from the `conceptsIntroduced` data already captured in every quest.

**Relationship to [Feature 3](feature-03-doc-links-hints.md)**: Feature 3 (doc links in hints panel) is the lightweight precursor. This feature adds richer metadata (syntax examples, runnable code), full-text search, and popover UI.

---

## Implementation

**Data layer:**
```typescript
// src/app/data/glossary.ts
export interface GlossaryEntry {
  term: string;                // e.g. "$ORDER"
  category: 'command' | 'function' | 'special-variable' | 'class' | 'pattern';
  summary: string;             // 1-2 sentence explanation
  syntax: string;              // e.g. "$ORDER(subscript[,direction])"
  example: string;             // runnable ObjectScript snippet
  docsUrl: string;             // docs.intersystems.com deep link
  relatedConcepts: string[];
}
```

**UI:**
- Glossary tab in the left sidebar (peer to Quest Log)
- Automatically highlights any concept from `conceptsIntroduced` of the active quest
- Clickable concept badges in the quest panel open a glossary popover
- Full-text search across all learned concepts
- "Copy example" copies the example code to the editor

**Starter glossary**: Pre-populate ~60 entries covering all concepts from the Phase 1 skill tree. New AI-generated quests contribute new entries via Claude extraction (ask Claude to return glossary entries alongside new quests).

**Files changed:**
- `quest-master/src/app/data/glossary.ts` — new data file with ~60 starter entries
- `quest-master/src/app/services/glossary.service.ts` — new service
- `quest-master/src/app/components/glossary/` — new sidebar tab + popover component

---

## Open Questions

- [ ] What happens when an AI-generated quest introduces a `conceptsIntroduced` term that has no glossary entry — silent omission, a placeholder card, or a prompt for the user to contribute?
- [ ] Should "Copy example" append to the current editor content or replace it? (Replace risks destroying the player's in-progress work.)
- [ ] Should the glossary show *all* entries, or only those for concepts the player has encountered so far (i.e. "learned concepts" gating)?
