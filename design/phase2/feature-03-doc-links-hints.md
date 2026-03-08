# Feature 3: Documentation Links in Hints Panel

| Field | Value |
|---|---|
| Priority | phase2-high |
| Status | ✅ Complete |
| Depends On | — |

---

## Task Prompt

Add a `docLinks` field to the Quest model and render clickable doc-link badges at the bottom of the Hints section. Populate all starter quests with links. Key files: `quest.models.ts`, `quest-panel.component.html/.scss`, `starter-quests.ts`. Acceptance: each starter quest shows relevant docs.intersystems.com links in the hints panel.

---

## Design

**The problem**: When a quest introduces `$ORDER`, `MERGE`, or `%JSON.Adaptor`, the player has no in-app reference. They must alt-tab to find docs while in the middle of coding.

**The solution**: Add a `docLinks` field to each quest containing links to the relevant InterSystems documentation pages. These are rendered as clickable badge-style links at the bottom of the Hints section in `quest-panel.component`.

**Relationship to [Feature 5](feature-05-concept-glossary.md)**: This is a lightweight precursor. The full glossary will add richer metadata (syntax examples, runnable code), full-text search, and popover UI. Doc links in the hints panel serve as the immediate, zero-friction version — one click to the right docs page without leaving the flow.

---

## Implementation

**Model change:**
```typescript
interface Quest {
  // ... existing fields ...
  docLinks?: { label: string; url: string }[];  // NEW — optional, links to docs.intersystems.com
}
```

**UI change** (in `quest-panel.component.html`, inside the Hints section):
```html
@if (quest()!.docLinks?.length) {
  <div class="doc-links">
    <span class="doc-links-label">Docs:</span>
    @for (link of quest()!.docLinks!; track $index) {
      <a class="doc-link" [href]="link.url" target="_blank" rel="noopener">{{ link.label }}</a>
    }
  </div>
}
```

**Data**: All starter quests are pre-populated with `docLinks` to `docs.intersystems.com` for their core concepts (e.g., `$ORDER`, `FOR`, `SET`, globals). AI-generated quests can optionally include doc links — Claude should be prompted to return them alongside new quest data.

**Files changed:**
- `quest-master/src/app/models/quest.models.ts` — added `docLinks?` field
- `quest-master/src/app/data/starter-quests.ts` — populated `docLinks` for all starter quests
- `quest-master/src/app/components/quest-panel/quest-panel.component.html` — rendered links
- `quest-master/src/app/components/quest-panel/quest-panel.component.scss` — styled link badges

---

## Open Questions

- [ ] Should the Claude quest-generation prompt *require* `docLinks` in the returned JSON schema, or leave it optional/best-effort? (Required guarantees links but may produce hallucinated URLs.)
- [ ] Is there a validation step to check that `url` values actually resolve to `docs.intersystems.com` before storing them (for AI-generated quests)?
