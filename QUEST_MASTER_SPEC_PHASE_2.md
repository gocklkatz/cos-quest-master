# ObjectScript Quest Master — Phase 2 Specification

> **Purpose**: This document defines Phase 2 extensions to the Quest Master app. Phase 1 delivered the full core loop (editor → IRIS execute → Claude evaluate → XP). Phase 2 deepens the content, improves the developer experience, and lays groundwork for future features.

---

## What Phase 1 Established

| Capability | Status |
|---|---|
| Monaco editor with ObjectScript syntax | ✅ |
| IRIS execution via XECUTE endpoint | ✅ |
| Claude-powered quest generation + evaluation | ✅ |
| XP / leveling / skill tree | ✅ |
| Quest log, XP animations | ✅ |
| localStorage persistence | ✅ |
| Fallback mode (no Claude API key) | ✅ |

**Core constraints inherited from Phase 1:**
- All code runs on a real local IRIS instance — no simulation
- Browser-only app; no dedicated backend server
- XECUTE execution model: code runs as raw ObjectScript commands, not inside class methods

---

## Phase 2 Priority Tiers

| Priority | Theme |
|---|---|
| **P1 — High value, low complexity** | Class-based quests, AI pair programmer mode, documentation links in hints |
| **P2 — High value, medium complexity** | Multi-file project quests, concept glossary |

---

## Features

### 1. Class-Based Quest Track

**The problem**: Phase 1 XECUTE quests can only teach imperative code snippets. ObjectScript's most important paradigm — defining classes, methods, and properties — requires compiling actual `.cls` files into IRIS. This is the largest gap in Phase 1 content.

**The solution**: Use the Atelier API (already proxied at `/api/atelier`) to save and compile full class definitions. Add a new `ClassQuestService` that:

1. Sends the player's full class source to `PUT /api/atelier/v1/USER/doc/{ClassName}.cls`
2. Compiles it via `POST /api/atelier/v1/USER/action/compile`
3. Executes a test harness via `POST /api/quest/execute` (e.g., `WRITE ##class(MyClass).MyMethod()`)
4. Returns combined compile errors + execution output for evaluation

**Class cleanup**: Compiled classes persist in the USER namespace until the player loads a different class quest. On quest switch, `ClassQuestService` issues `DELETE /api/atelier/v1/USER/doc/{previousClassName}.cls` before compiling the new class. This keeps the namespace tidy without a separate cleanup endpoint. Classes persist within a session so players can re-run test harnesses without re-compiling. A manual **"Clean up my classes"** button in Settings can call the delete endpoint for any classes matching a `Guild.*` or `QM.Player.*` prefix.

**New skill branches unlocked:**

```
classes-extended/
  ├── Persistent classes (properties, indices, %Save, %OpenId)
  ├── Inheritance and overriding methods
  ├── Class parameters
  └── %JSON.Adaptor and serialization

oop-patterns/
  ├── Abstract classes and interfaces (%RegisteredObject vs %Persistent)
  ├── Callbacks and triggers
  └── Class queries
```

**Quest model fields** (all quests — snippet and class alike — use this shape; see Feature #6 for the unified file-tab UI):
```typescript
interface Quest {
  // ... existing fields ...
  testHarness?: string;   // ObjectScript snippet run after all files compile; used for evaluation
}
```

> **Note on mode**: The `mode: 'snippet' | 'class' | 'project'` toggle from the initial class implementation is superseded by the unified file-tab model introduced in Feature #6. The editor no longer shows a snippet/class toggle; instead, quests define their files explicitly, and the editor always shows file tabs. See Feature #6 for the full model.

**Compile error response schema:**

The Atelier API `POST /api/atelier/v1/USER/action/compile` returns:
```json
{
  "status": { "errors": [] },
  "result": {
    "content": [
      {
        "name": "MyClass.cls",
        "status": [
          { "severity": 3, "text": "ERROR #5659: ...", "line": 12, "col": 4 }
        ]
      }
    ]
  }
}
```
`severity 3` = error, `severity 1` = warning. `ClassQuestService` maps this into:
```typescript
interface CompileResult {
  hasErrors: boolean;
  errors: { line: number; col: number; text: string; severity: number }[];
  output: string;  // from the execute call if compile succeeded; empty string otherwise
}
```
Compile errors are passed to the UI renderer (red markers) and to the Claude evaluation prompt separately from runtime output.

---

### 2. AI Pair Programmer Mode

**The problem**: Players get stuck between quest attempts. The only AI interaction is quest generation (before) and evaluation (after). There's no "ask for help while coding."

**The solution**: Add a **Chat** panel alongside the output panel — a persistent Claude conversation thread that knows the current quest context.

**Implementation:**
- New `AIPairService` with a `conversationHistory` signal (array of `{role, content}` messages)
- System prompt includes: current quest title, objective, player's current code (from editor signal), and IRIS output from the last run
- User types questions; Claude responds with guidance, never giving away the full answer (configurable strictness)
- "Clear chat" button
- Chat history persists per quest ID in localStorage

**Example system prompt extension:**
```
You are an ObjectScript programming mentor. The player is working on this quest:

Quest: {questTitle}
Objective: {questObjective}
Concepts introduced: {concepts}

The player's current code:
{currentCode}

Last IRIS output:
{lastOutput}

Guide them toward the solution with questions and hints. Do NOT write the full solution for them
unless they explicitly ask for it. Focus on ObjectScript idioms and IRIS-specific behavior.
Keep responses concise — 3 sentences maximum unless asked for more detail.
```

**UI placement**: Collapsible chat panel below the output panel, toggled by a chat icon in the toolbar.

**Context window management:**
- `AIPairService` maintains a rolling window of at most **12 messages** (6 user/assistant pairs). When the history exceeds 12 entries, the oldest pair is dropped before sending to Claude.
- The current code and quest context are always injected fresh in the system prompt — not stored as history — so no quest context is ever silently lost when messages are pruned.
- Display a passive indicator in the chat header: `"4 / 12 messages in context"`. No hard block — visibility only.
- This also bounds per-session API cost for user-supplied Claude API keys.

---

### 3. Documentation Links in Hints Panel

**The problem**: When a quest introduces `$ORDER`, `MERGE`, or `%JSON.Adaptor`, the player has no in-app reference. They must alt-tab to find docs while in the middle of coding.

**The solution**: Add a `docLinks` field to each quest containing links to the relevant InterSystems documentation pages. These are rendered as clickable badge-style links at the bottom of the Hints section in `quest-panel.component`.

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

**Relationship to Feature #6 (Concept Glossary)**: This is a lightweight precursor. The full glossary will add richer metadata (syntax examples, runnable code), full-text search, and popover UI. Doc links in the hints panel serve as the immediate, zero-friction version — one click to the right docs page without leaving the flow.

**Files changed:**
- `quest-master/src/app/models/quest.models.ts` — added `docLinks?` field
- `quest-master/src/app/data/starter-quests.ts` — populated `docLinks` for all starter quests
- `quest-master/src/app/components/quest-panel/quest-panel.component.html` — rendered links
- `quest-master/src/app/components/quest-panel/quest-panel.component.scss` — styled link badges

---

### 4. Less Pre-Filled Code in the Editor Pane

**The problem**: Every quest ships a `starterCode` snippet that pre-populates the Monaco editor when the quest loads. For many quests this scaffold includes too much structural logic — correct variable names, the right IRIS commands, even partial solutions. A player who reads the starter code carefully can often satisfy the quest objective without meaningfully engaging with the problem, undermining the learning goal.

**The solution**: Add a **Challenge Mode** toggle — a global user preference that controls whether the editor is pre-filled when a quest loads. When enabled, the editor starts with only a minimal orientation comment (or empty) instead of the full `starterCode`. The toggle is accessible from the editor toolbar and persisted in `GameState`/localStorage.

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

**Files changed:**
- `quest-master/src/app/models/quest.models.ts` — add `starterCodeHint?` field
- `quest-master/src/app/models/game-state.models.ts` — add `challengeMode: boolean` to `GameState` and `DEFAULT_GAME_STATE`
- `quest-master/src/app/app.ts` — apply `challengeMode` flag when loading starter code on quest change
- `quest-master/src/app/components/code-editor/code-editor.component.html` — add Challenge toggle and restore button in toolbar
- `quest-master/src/app/components/code-editor/code-editor.component.ts` — wire toggle and restore actions, accept `challengeMode` and `activeQuest` inputs
- `quest-master/src/app/components/code-editor/code-editor.component.scss` — style active/ghost toolbar button states
- `quest-master/src/app/data/starter-quests.ts` — add `starterCodeHint` to each starter quest

---

### 5. Concept Glossary & Documentation Links

**The problem**: When a quest introduces `$ZSTRIP` or `%JSON.Adaptor`, the player has no in-app reference. They must alt-tab to browser docs.

**The solution**: Build an in-app **Concept Glossary** from the `conceptsIntroduced` data already captured in every quest.

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

**UI**:
- Glossary tab in the left sidebar (peer to Quest Log)
- Automatically highlights any concept from `conceptsIntroduced` of the active quest
- Clickable concept badges in the quest panel open a glossary popover
- Full-text search across all learned concepts
- "Copy example" copies the example code to the editor

**Starter glossary**: Pre-populate ~60 entries covering all concepts from the Phase 1 skill tree. New AI-generated quests contribute new entries via Claude extraction (ask Claude to return glossary entries alongside new quests).

---

### 6. Unified File-Tab Quest Interface

**The problem**: The original class quest implementation introduced a snippet/class mode toggle. This creates friction: players must write class code in the class pane, run it, then switch to the snippet pane to write calling code and run again. The two-pane/two-mode model is unnecessarily complex.

**The solution**: Replace the snippet/class mode distinction with a unified file-tab interface. Every quest defines an ordered list of files. Each file is an independently editable tab. There is one **"Run in IRIS"** button and one **"Submit"** button that operate across all open files at once.

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

### 7. Achievement System

**Note**: The leaderboard component (opt-in ranking, weekly resets) depends on a shared backend and is deferred to the backlog. The achievement system is fully local and can be shipped independently.

**Achievement type:**

```typescript
interface Achievement {
  id: string;
  name: string;           // e.g. "First Blood"
  description: string;   // e.g. "Complete your first quest"
  icon: string;           // emoji or asset path
  condition: (state: GameState) => boolean;
  xpBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

**Starter achievements:**

| ID | Name | Condition | Rarity |
|---|---|---|---|
| `first-quest` | Anvil Forged | Complete Quest Zero | Common |
| `perfect-score` | Flawless | Score 100 on any quest | Rare |
| `speed-run` | The Flash | Submit within 60s of starting a quest | Rare |
| `no-hints` | Unaided | Complete 5 quests without revealing any hints | Epic |
| `all-branches` | Polymath | Complete at least one quest in every branch | Epic |
| `capstone` | Guild Master | Complete the Capstone Project | Legendary |
| `streak-7` | Week Warrior | Complete at least one quest for 7 days in a row | Rare |

Achievement unlock triggers: `AchievementService.check(state)` called after every quest completion and XP gain. Unlock animation overlays the XP animation.

---

### 8. Resizable Panes

**The problem**: The Quest Master layout uses fixed-size panels. The quest sidebar, code editor, output panel, and AI Pair Programmer chat each have a hard-coded height or width. Players with small screens can't see enough output; players with large screens waste space. Power users want a bigger editor; beginners want a bigger hint/quest pane.

**The solution**: Replace fixed panel dimensions with draggable resize dividers. Three dividers exist in the layout:

| Divider | Orientation | Separates |
|---|---|---|
| `sidebar-divider` | Vertical | Quest sidebar ↔ main content area |
| `editor-output-divider` | Horizontal | Code editor ↔ Output panel |
| `output-chat-divider` | Horizontal | Output panel ↔ AI Pair Programmer |

**Layout constraints:**

| Divider | Min (smaller side) | Min (larger side) | Notes |
|---|---|---|---|
| `sidebar-divider` | 180px (sidebar) | 400px (content) | Sidebar must stay wide enough to read quest text |
| `editor-output-divider` | 80px (output) | 120px (editor) | Output must always show at least 3 lines; editor at least 4 lines |
| `output-chat-divider` | 60px (chat input row) | 60px (output) | Chat must always show input + at least one message row |

**Persistence**: Each divider position is saved to `localStorage` under the keys `qm.pane.sidebar`, `qm.pane.editorOutput`, and `qm.pane.outputChat` (stored as pixel values). On next load the saved sizes are restored. If a saved value violates the current minimum (e.g. window was resized), clamp to the minimum.

**Drag handle UI**: Each divider renders as a 4px-wide (vertical) or 4px-tall (horizontal) strip. On hover, the strip highlights in `--accent-purple` and the cursor changes to `col-resize` / `row-resize`. A subtle `⋮` / `⋯` glyph centered on the handle provides a visual affordance.

**Implementation approach (Angular):**

1. Create a `ResizableDividerDirective` (or a standalone `ResizableDividerComponent`) that:
   - Listens for `mousedown` on the handle element
   - On drag, calculates the delta from `mousemove` events on `document`
   - Emits a `(sizeChange)` output with the new pixel size of the primary panel
   - Cleans up listeners on `mouseup` / `mouseleave` from `document`
2. Apply the directive to the three divider elements in `AppComponent` (or whichever layout shell hosts the panels).
3. Bind the primary panel's `[style.width]` / `[style.height]` to the service-managed size; the sibling panel uses `flex: 1` to fill remaining space.
4. Store and restore sizes via a lightweight `PaneSizeService` that wraps `localStorage`.

**Touch support**: The drag handle also responds to `touchstart` / `touchmove` / `touchend` so the app is usable on tablets.

**No server changes required.** This is purely a front-end layout feature.

---

## Architecture Overview (Phase 2)

> **Legend**: `[P1]` = Phase 2 high priority (complete or current), `[P2]` = Phase 2 medium priority, `[backlog]` = deferred.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Browser (Angular App)                          │
│                                                                     │
│  QuestPanel    │  CodeEditor (file tabs) │                          │
│  AIPairChat[P1]│  OutputPanel            │                          │
│  GlossaryTab[P2]                         │                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Services                                                    │   │
│  │  GameState  QuestEngine  ClaudeAPI  IRISApi  AIPair[P1]     │   │
│  │  Glossary[P2]  Achievement[P2]                               │   │
│  │  History[backlog]  StreamingExec[backlog]                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────┬──────────────────────────────┬──────────────────────────────┘
        │                              │
        ▼                              ▼
  api.anthropic.com            localhost:52773 (IRIS)
                               ├── /api/quest/execute       (existing)
                               ├── /api/quest/compile       (existing)
                               ├── /api/quest/health        (existing)
                               ├── /api/atelier/...         (existing)
```

---

## Updated File Structure (Phase 2 additions only)

> **Label key**: `(phase2-high)` = P1 priority, `(phase2-mid)` = P2 priority, `(backlog)` = deferred.

```
quest-master/
├── src/app/
│   ├── components/
│   │   ├── ai-pair-chat/            # NEW (phase2-high)
│   │   ├── glossary/                # NEW (phase2-mid)
│   │   └── achievement-overlay/     # NEW (phase2-mid)
│   ├── services/
│   │   ├── ai-pair.service.ts          # NEW (phase2-high)
│   │   ├── glossary.service.ts         # NEW (phase2-mid)
│   │   ├── achievement.service.ts      # NEW (phase2-mid)
│   ├── models/
│   │   └── achievement.models.ts    # NEW (phase2-mid)
│   └── data/
│       └── glossary.ts              # NEW (phase2-mid)

---

## Development Sequence (Phase 2)

| # | Feature | Priority | Status |
|---|---|---|---|
| 1 | **Class-based quest infrastructure** — Atelier compile flow, compile error rendering | phase2-high | ✅ Complete |
| 2 | **AI Pair Programmer** — chat panel wired to Claude with quest context | phase2-high | ✅ Complete |
| 3 | **Documentation links in hints** — `docLinks` field, badge UI in quest panel, starter quest data | phase2-high | ✅ Complete |
| 4 | **Challenge Mode** — `starterCodeHint` field, `challengeMode` GameState flag, toolbar toggle + restore button, starter quest hints | phase2-high | ✅ Complete |
| 5 | **Concept glossary** — starter data, quest-linked popover, sidebar tab | phase2-mid | ✅ Complete |
| 6 | **Resizable panes** — drag dividers for sidebar, editor/output, output/chat | phase2-mid | ⬜ Not started |
| 7 | **Unified file-tab quest interface** — replace snippet/class modes with `files[]`, single Run + Submit | phase2-mid | ⬜ Not started |
| 8 | **Achievement system** — unlock logic, overlay animation, starter achievements | phase2-mid | ⬜ Not started |
