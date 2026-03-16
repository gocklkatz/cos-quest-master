# Feature 6: Unified File-Tab Quest Interface

| Field | Value |
|---|---|
| Priority | phase2-mid |
| Status | ✅ Complete |
| Depends On | [Feature 1](feature-01-class-quest-track.md) |
| Pedagogical Principle | Cognitive Load Reduction |

---

## Task Prompt

Replace the snippet/class mode toggle with a unified file-tab interface. Every quest defines an ordered list of `QuestFile` entries. One "Run in IRIS" and one "Submit" button operate across all files at once. Key files: `quest.models.ts`, `starter-quests.ts`, `code-editor.component.*`, `class-quest.service.ts`, `app.ts`. Acceptance: existing quests migrated to `files[]` shape work correctly; multi-file class quests compile in dependency order.

---

## Design

**The problem**: The original class quest implementation introduced a snippet/class mode toggle. This creates friction: players must write class code in the class pane, run it, then switch to the snippet pane to write calling code and run again. The two-pane/two-mode model is unnecessarily complex.

**The solution**: Replace the snippet/class mode distinction with a unified file-tab interface. Every quest defines an ordered list of files. Each file is an independently editable tab. There is one **"Run in IRIS"** button and one **"Submit"** button that operate across all open files at once.

---

## Implementation

**Quest model — unified file-based shape:**

```typescript
interface QuestFile {
  id: string;               // e.g. "model", "main", "rest"
  filename: string;         // e.g. "Library.Book.cls" or "solution.script"
  fileType: 'cls' | 'script';  // determines compile-via-Atelier vs XECUTE flow
  label: string;            // shown in the file tab
  starterCode?: string;
  starterCodeHint?: string; // shown in challenge mode instead of starterCode
  readOnly?: boolean;       // true for provided utility/scaffold files
  dependsOn?: string[];     // file IDs that must be compiled before this one
}

interface Quest {
  // ... existing fields (id, title, objective, hints, docLinks, etc.) ...
  files: QuestFile[];       // always at least one file; replaces starterCode + mode + className
  testHarness?: string;     // ObjectScript snippet auto-run after all files execute/compile
}
```

**Run behavior ("Run in IRIS" button):**
1. Process files in dependency order (topological sort on `dependsOn`)
2. For each `.cls` file: `PUT` to Atelier + `POST /compile` — display compile errors inline
3. For each `.script` file: `POST /api/quest/execute` via XECUTE
4. If a `testHarness` is defined and all files succeeded: run it and display output
5. Combined output (compile results + execution output) shown in the output panel

**Submit behavior ("Submit" button):**
1. Run all files (same as "Run in IRIS")
2. If no compile errors: send code + output to Claude for evaluation
3. Award XP on pass

**Migration**: Existing quests in `starter-quests.ts` that use the old `starterCode` + `mode: 'snippet'` shape are migrated to `files: [{ id: 'main', filename: 'solution.script', fileType: 'script', label: 'Solution', starterCode: '...' }]`. Existing class quests (mode: 'class') migrate similarly with `fileType: 'cls'`. The legacy `mode`, `className`, and top-level `starterCode` fields on `Quest` are removed after migration.

**UI changes:**
- File tabs always shown above the editor (even for single-file quests — one tab is fine)
- No snippet/class mode toggle in the toolbar
- Active file tab is independently editable in Monaco
- Compile errors from `.cls` files are shown as red inline markers
- "Run in IRIS" and "Submit" buttons in the toolbar operate on all files

**Challenge Mode compatibility**: When `challengeMode` is active, each tab opens with its `starterCodeHint` (or empty). The "Show starter code" button restores the active tab's `starterCode`.

**Example capstone project quest**: Build a REST API for a `Library.Book` persistent class with search, create, and delete endpoints.

```typescript
// Example multi-file quest
{
  files: [
    {
      id: 'model',
      filename: 'Library.Book.cls',
      fileType: 'cls',
      label: 'Library.Book',
      starterCode: '// Define the persistent class here',
      dependsOn: []
    },
    {
      id: 'rest',
      filename: 'Library.BookREST.cls',
      fileType: 'cls',
      label: 'BookREST',
      starterCode: '// Define the REST dispatch class here',
      dependsOn: ['model']
    }
  ],
  testHarness: 'WRITE ##class(Library.Book).%OpenId(1).Title'
}
```

**Files changed:**
- `quest-master/src/app/models/quest.models.ts` — replace `mode`/`className`/`ProjectFile`/`ProjectQuest` with `QuestFile` and updated `Quest`
- `quest-master/src/app/data/starter-quests.ts` — migrate all quests to `files[]` shape
- `quest-master/src/app/components/code-editor/code-editor.component.*` — file tabs UI, remove mode toggle
- `quest-master/src/app/services/class-quest.service.ts` — update to iterate `files[]`, topological sort
- `quest-master/src/app/app.ts` — update quest-load effect to use first file's starterCode/Hint

---

## Open Questions

- ~~[ ] What is the migration path for quest progress already stored in player localStorage under the old `starterCode`/`mode` shape?~~ **Resolved**: `normalizeQuest()` in `quest.models.ts` converts old-format quests to `files[]` on load. Applied in `game-state.service.ts` `loadFromStorage()` and in `claude-api.service.ts` after parse.
- ~~[ ] Should file tabs be reorderable by the player (drag-to-reorder), or always fixed to the quest-defined order?~~ **Resolved**: Fixed to quest-defined order — no drag-to-reorder.
- ~~[ ] When multiple files have compile errors, should error output be merged into one panel or shown per-file in collapsible sections?~~ **Resolved**: Merged into one output panel.
- ~~[ ] Should `dependsOn` cycles be validated at data-load time (dev error) or at run time (user-facing error)?~~ **Resolved**: Detected at run time; `topoSort()` in `ClassQuestService` returns `null` on cycle and surfaces a user-facing error message.
