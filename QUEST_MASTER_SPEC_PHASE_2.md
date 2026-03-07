# ObjectScript Quest Master — Phase 2 Specification

> **Purpose**: This document defines Phase 2 extensions to the Quest Master app. Phase 1 delivered the full core loop (editor → IRIS execute → Claude evaluate → XP). Phase 2 deepens the content, improves the developer experience, and lays groundwork for social/multiplayer features.

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
| **P2 — High value, medium complexity** | Multi-file project quests, concept glossary, streaming output |
| **P3 — Strategic, higher complexity** | Multiplayer/social, backend persistence, instructor mode |
| **Backlog — deferred** | Global/SQL Explorers, real-time streaming, code history & diff, interoperability track |

---

## Features

### 1. Class-Based Quest Track

**The problem**: Phase 1 XECUTE quests can only teach imperative code snippets. ObjectScript's most important paradigm — defining classes, methods, and properties — requires compiling actual `.cls` files into IRIS. This is the largest gap in Phase 1 content.

**The solution**: Use the Atelier API (already proxied at `/api/atelier`) to save and compile full class definitions. Add a new `ClassQuestService` that:

1. Sends the player's full class source to `PUT /api/atelier/v1/USER/doc/{ClassName}.cls`
2. Compiles it via `POST /api/atelier/v1/USER/action/compile`
3. Executes a test harness via `POST /api/quest/execute` (e.g., `WRITE ##class(MyClass).MyMethod()`)
4. Returns combined compile errors + execution output for evaluation

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

**UI changes needed:**
- Toggle in CodeEditorComponent: `[Snippet mode]` vs `[Class mode]`
- In class mode, the editor shows a full `.cls` scaffold and the run button triggers the compile + test-harness flow
- Compile errors are rendered separately from runtime output (red vs grey)
- Class mode quests display the class name and a separate "test code" block that is auto-run after compile

**New `Quest` interface fields:**
```typescript
interface Quest {
  // ... existing fields ...
  mode: 'snippet' | 'class' | 'project';  // NEW — full union; defaults to 'snippet' for backwards compat
  testHarness?: string;                    // NEW — ObjectScript snippet to run after class compiles
  className?: string;                      // NEW — e.g. "Guild.Member"
}
```

> **Note on `mode` union**: All three mode values live on the base `Quest` interface. `ProjectQuest` (Feature #5) uses `Omit<Quest, 'mode'>` to re-declare `mode: 'project'` as a narrowed type without conflicting with the base union.

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

### 5. Multi-File Project Quests

**The problem**: Real IRIS development involves multiple related classes (e.g., a persistent class + a REST dispatch class + a data validator). Single-file quests cannot teach this coordination.

**The solution**: Add a `ProjectQuest` variant that bundles multiple files:

```typescript
// Omit<Quest, 'mode'> avoids conflicting with the base union — 'project' is a valid
// narrowing of 'snippet' | 'class' | 'project' without overriding the base type.
interface ProjectQuest extends Omit<Quest, 'mode'> {
  mode: 'project';
  files: ProjectFile[];   // ordered list of files to create/edit
}

interface ProjectFile {
  className: string;          // e.g. "Inventory.Item"
  filename: string;           // e.g. "Inventory.Item.cls"
  description: string;        // shown in file tab label
  starterCode?: string;
  readOnly?: boolean;         // true for provided utility classes
  dependsOn?: string[];       // classNames this file must be compiled after
                              // e.g. ["Inventory.Item"] for a REST class that references it
}
```

`ClassQuestService` topologically sorts `files` by `dependsOn` before issuing Atelier compile calls sequentially. Circular dependencies are a quest-authoring error — a validation step in `starter-quests.ts` (or a build-time lint rule) should detect them before they reach the user.

**UI changes**:
- File tabs appear above the editor when a project quest is active
- Each tab is independently editable
- "Compile All" compiles all files in dependency order (determined by prerequisites field)
- Test harness runs after all files compile successfully

**Example capstone project quest**: Build a REST API for a `Library.Book` persistent class with search, create, and delete endpoints — all in one coordinated project.

---

### 6. Concept Glossary & Documentation Links

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

### 7. Leaderboard & Achievements

**Depends on**: P3 Backend (#10)

**Leaderboard**:
- Opt-in ranking by XP (display name set by player)
- Filterable by tier (Apprentice / Journeyman / Master)
- Shows: rank, name, XP, level, quests completed, highest score
- Weekly reset option for competitive classroom use

**Achievement system** — new `Achievement` type:

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

Starter achievements:

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

## New Architecture Additions

### Updated Dependency Diagram (Phase 2)

> **Legend**: `[P1]` = Phase 2 high priority (current), `[P2]` = Phase 2 medium priority, `[P3]` = Phase 3 future, `[backlog]` = deferred, not in current Phase 2 scope.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Browser (Angular App)                          │
│                                                                     │
│  QuestPanel    │  CodeEditor    │  GlobalExplorer [backlog]         │
│  AIPairChat[P1]│  OutputPanel   │  SQLExplorer [backlog]            │
│  GlossaryTab[P2]               │  DiffViewer [backlog]             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Services                                                    │   │
│  │  GameState  QuestEngine  ClaudeAPI  IRISApi  AIPair[P1]     │   │
│  │  Achievement[P3]  History[backlog]  Glossary[P2]            │   │
│  │  StreamingExec[backlog]                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────┬──────────────────────────────┬──────────────────────────────┘
        │                              │
        ▼                              ▼
  api.anthropic.com            localhost:52773 (IRIS)
                               ├── /api/quest/execute       (existing)
                               ├── /api/quest/compile       (existing)
                               ├── /api/quest/health        (existing)
                               ├── /api/atelier/...         (existing)
                               ├── /api/explore/globals     (NEW [backlog])
                               ├── /api/explore/globals/tree(NEW [backlog])
                               ├── /api/explore/sql         (NEW [backlog])
                               ├── /api/explore/sql/tables  (NEW [backlog])
                               ├── /api/explore/classes     (NEW [backlog])
                               └── /api/quest/stream        (NEW [backlog])
        │
        ▼ (P3 only)
  localhost:3001 (Bun backend)
  ├── /auth/...
  ├── /progress/...
  ├── /leaderboard
  └── /quest-bank/...
```

---

## New IRIS Class: `QuestMaster.REST.Explorer` *(Backlog — not in current Phase 2)*

This class is defined here for reference but is deferred to the backlog. It will be implemented when the Global Explorer and SQL Explorer components are promoted from backlog.

```objectscript
Class QuestMaster.REST.Explorer Extends %CSP.REST
{
Parameter HandleCorsRequest = 1;
Parameter CONTENTTYPE = "application/json";

XData UrlMap [ XMLNamespace = "http://www.intersystems.com/urlmap" ]
{
<Routes>
  <Route Url="/globals" Method="GET" Call="ListGlobals"/>
  <Route Url="/globals/tree" Method="GET" Call="GetGlobalTree"/>
  <Route Url="/sql" Method="POST" Call="RunSQL"/>
  <Route Url="/sql/tables" Method="GET" Call="ListTables"/>
  <Route Url="/classes" Method="GET" Call="ListClasses"/>
</Routes>
}

// ... implementations ...
}
```

Register at `/api/explore/` in IRIS web applications. When implemented, add a matching proxy entry to `proxy.conf.json`:
```json
"/api/explore": {
  "target": "http://localhost:52773",
  "secure": false,
  "changeOrigin": true
}
```
All Explorer endpoints are therefore reachable at `/api/explore/globals`, `/api/explore/sql`, etc. — consistent with the architecture diagram above.

---

## Updated File Structure (Phase 2 additions only)

> **Label key**: `(phase2-high)` = P1 priority, `(phase2-mid)` = P2 priority, `(phase3)` = future, `(backlog)` = deferred.

```
quest-master/
├── src/app/
│   ├── components/
│   │   ├── ai-pair-chat/            # NEW (phase2-high)
│   │   ├── glossary/                # NEW (phase2-mid)
│   │   ├── global-explorer/         # NEW (backlog)
│   │   ├── sql-explorer/            # NEW (backlog)
│   │   ├── diff-viewer/             # NEW (backlog)
│   │   ├── achievement-overlay/     # NEW (phase3)
│   │   └── leaderboard/             # NEW (phase3)
│   ├── services/
│   │   ├── ai-pair.service.ts          # NEW (phase2-high)
│   │   ├── glossary.service.ts         # NEW (phase2-mid)
│   │   ├── global-explorer.service.ts  # NEW (backlog)
│   │   ├── sql-explorer.service.ts     # NEW (backlog)
│   │   ├── attempt-history.service.ts  # NEW (backlog)
│   │   ├── streaming-exec.service.ts   # NEW (backlog)
│   │   ├── achievement.service.ts      # NEW (phase3)
│   │   └── sync.service.ts             # NEW (phase3)
│   ├── models/
│   │   ├── project-quest.models.ts  # NEW (phase2-mid)
│   │   └── achievement.models.ts    # NEW (phase3)
│   └── data/
│       └── glossary.ts              # NEW (phase2-mid)
├── iris/
│   ├── QuestMaster.REST.Execute.cls       # MODIFIED (backlog — async/streaming)
│   └── QuestMaster.REST.Explorer.cls      # NEW (backlog — globals, SQL, classes)
└── backend/                               # NEW (phase3)
    ├── server.ts                          # Bun HTTP server
    ├── routes/auth.ts
    ├── routes/progress.ts
    └── routes/leaderboard.ts
```

---

## Development Sequence (Phase 2)

| # | Feature | Priority | Status |
|---|---|---|---|
| 1 | **Class-based quest infrastructure** — Atelier compile flow, `mode` field, compile error rendering | phase2-high | ✅ Complete |
| 2 | **AI Pair Programmer** — chat panel wired to Claude with quest context | phase2-high | ✅ Complete |
| 3 | **Documentation links in hints** — `docLinks` field, badge UI in quest panel, starter quest data | phase2-high | ✅ Complete |
| 4 | **Challenge Mode** — `starterCodeHint` field, `challengeMode` GameState flag, toolbar toggle + restore button, starter quest hints | phase2-high | ✅ Complete |
| 5 | **Concept glossary** — starter data, quest-linked popover, sidebar tab | phase2-mid | ⬜ Not started |
| 6 | **Multi-file project quests** — file tabs, project mode compile flow | phase2-mid | ⬜ Not started |
| 7 | **Leaderboard & achievements** — opt-in ranking, unlock logic, overlay animation | phase3 | ⬜ Not started |

---

## Open Questions for Phase 2 Planning

1. **Class cleanup**: ~~Do compiled classes persist between sessions?~~

   **Decision**: Classes compiled during class-mode quests persist in the USER namespace until the player loads a *different* class-mode quest. On quest switch, `ClassQuestService` issues `DELETE /api/atelier/v1/USER/doc/{previousClassName}.cls` before compiling the new class. This keeps the namespace tidy without a separate cleanup endpoint. Classes persist within a session so players can re-run test harnesses without re-compiling. A manual **"Clean up my classes"** button in Settings can call the delete endpoint for any classes matching a `Guild.*` or `QM.Player.*` prefix.

2. **XECUTE vs class mode trade-off**: Should snippet-mode quests eventually be converted to class-mode (defining a method and calling it), or kept as-is? Class mode is more idiomatic but XECUTE is simpler to grade deterministically.

3. **Streaming complexity**: Full SSE streaming from IRIS is architecturally complex. The polling-based approach (JOB + GET) is simpler but adds latency. For Phase 2, recommend polling first, SSE as a later optimization.

4. **Backend hosting**: For classroom use, the Bun backend needs to be accessible by students. Does this imply a cloud deployment, or is this always local? Recommend keeping Phase 2 backend local-first (Docker Compose service) and treating cloud deployment as Phase 3.

5. **Interop prerequisites**: Enabling Interoperability in IRIS requires System Management privileges and a licensed namespace. Should Interop quests be optional (an advanced extension pack) rather than part of the main skill tree?
