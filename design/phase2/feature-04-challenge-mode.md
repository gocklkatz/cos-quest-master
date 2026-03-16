# Feature 4: Challenge Mode (Less Pre-Filled Code)

| Field | Value |
|---|---|
| Priority | phase2-high |
| Status | ✅ Complete |
| Depends On | [Feature 6](feature-06-unified-file-tabs.md) (for multi-file compatibility) |
| Pedagogical Principle | Desirable Difficulty |

---

## Task Prompt

Add a `challengeMode` global preference that controls whether the editor pre-fills with `starterCode` or `starterCodeHint` when a quest loads. Key files: `quest.models.ts`, `game-state.models.ts`, `app.ts`, `code-editor.component.*`, `starter-quests.ts`. Acceptance: toggling challenge mode on a new quest loads `starterCodeHint` or an empty editor; existing in-progress code is not affected.

---

## Design

**The problem**: Every quest ships a `starterCode` snippet that pre-populates the Monaco editor when the quest loads. For many quests this scaffold includes too much structural logic — correct variable names, the right IRIS commands, even partial solutions. A player who reads the starter code carefully can often satisfy the quest objective without meaningfully engaging with the problem, undermining the learning goal.

**The solution**: Add a **Challenge Mode** toggle — a global user preference that controls whether the editor is pre-filled when a quest loads. When enabled, the editor starts with only a minimal orientation comment (or empty) instead of the full `starterCode`. The toggle is accessible from the editor toolbar and persisted in `GameState`/localStorage.

---

## Implementation

**Behavior details:**
- Default: `false` — current behavior, starter code loads as before (no breaking change)
- When `challengeMode = true`, loading a quest initializes the editor with the quest's `starterCodeHint` (if defined) or an empty string
- Toggling mid-quest does **not** reset the current editor content — the preference only takes effect when a new quest loads, so in-progress work is never lost
- An **"Show starter code"** escape hatch button appears in the editor toolbar when challenge mode is active and the active quest has a `starterCode` — players can reveal it without disabling the global toggle

**New optional Quest field:**
```typescript
interface Quest {
  // ... existing fields ...
  starterCodeHint?: string;  // NEW — shown instead of starterCode in challenge mode
                             // e.g. "// Iterate over ^MyGlobal using $ORDER"
                             // If absent, challenge mode loads a completely empty editor
}
```

**GameState change:**
```typescript
interface GameState {
  // ... existing fields ...
  challengeMode: boolean;  // NEW — default: false
}
```

**App.ts logic change** (in the effect that fires when `activeQuest` changes):
```typescript
const starterCode = next.starterCode ?? '';
this.editorCode.set(
  this.gameState().challengeMode
    ? (next.starterCodeHint ?? '')
    : starterCode
);
```

**UI changes** (in `CodeEditorComponent` toolbar):
```html
<button class="toolbar-btn"
        [class.active]="challengeMode()"
        (click)="toggleChallengeMode()"
        title="Challenge Mode — start quests with an empty editor">
  ⚔ Challenge
</button>

@if (challengeMode() && activeQuest()?.starterCode) {
  <button class="toolbar-btn toolbar-btn--ghost" (click)="restoreStarterCode()">
    Show starter code
  </button>
}
```

**Data**: Starter quests should be extended with `starterCodeHint` — a one-line comment or structural skeleton that orients the player without revealing logic (e.g., `// Write a FOR loop that sets 5 subscripts in ^Quest("data", n)`). This is optional; quests without it simply load an empty editor in challenge mode.

**Claude integration**: When `ClaudeQuestService` generates a new quest, the system prompt must request `starterCodeHint` in the JSON schema. Add this field to the generation prompt's schema definition:

```
"starterCodeHint": "One-line comment or empty skeleton that orients the player without
revealing logic. Example: '// Iterate ^MyGlobal with $ORDER and accumulate a total'.
Omit if the concept is too open-ended for a directional hint."
```

Claude must return it as part of the quest JSON alongside `starterCode`.

**Challenge Mode + Feature 6 compatibility**: When `challengeMode` is active in the unified file-tab interface, each tab opens with its `starterCodeHint` (or empty). The "Show starter code" button restores the active tab's `starterCode`.

**Files changed:**
- `quest-master/src/app/models/quest.models.ts` — add `starterCodeHint?` field
- `quest-master/src/app/models/game-state.models.ts` — add `challengeMode: boolean` to `GameState` and `DEFAULT_GAME_STATE`
- `quest-master/src/app/app.ts` — apply `challengeMode` flag when loading starter code on quest change
- `quest-master/src/app/components/code-editor/code-editor.component.html` — add Challenge toggle and restore button in toolbar
- `quest-master/src/app/components/code-editor/code-editor.component.ts` — wire toggle and restore actions, accept `challengeMode` and `activeQuest` inputs
- `quest-master/src/app/components/code-editor/code-editor.component.scss` — style active/ghost toolbar button states
- `quest-master/src/app/data/starter-quests.ts` — add `starterCodeHint` to each starter quest

---

## Open Questions

- [ ] Should "Show starter code" restore the code for this session only (the escape hatch stays available) or permanently disable challenge mode for that specific quest?
- [ ] Should `starterCodeHint` be required for all quests in the data file, or is it acceptable to ship some quests that simply open an empty editor in challenge mode?
