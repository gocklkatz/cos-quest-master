# Phase 3 — Architecture Decisions

### 2026-03-11: F2 — Follow-up question placed in ReviewModal, not QuestPanel
**Context**: The F2 spec said to render the follow-up question in `QuestPanel` below the feedback block. However, F10 (AI Review Modal) — implemented first — intercepts every evaluation result in a blocking modal. By the time the modal is dismissed the next quest has already loaded, so a QuestPanel follow-up question would appear too late or be overwritten.
**Decision**: Render the `followUpQuestion` and free-text reflection input inside `ReviewModalComponent`, where the user is already paused reading feedback. The Enter key handler is guarded so Enter inside the textarea does not accidentally dismiss the modal.
**Rejected alternatives**: Keeping it in QuestPanel — timing is wrong post-F10; a second modal — unnecessary complexity.

---


### 2026-03-11: C4 — AI-disabled banner Settings link uses Output event
**Context**: The AI-disabled banner in `QuestViewComponent` has a "Settings" link that opens the settings modal. `openSettings()` belongs to `AppComponent` — `QuestViewComponent` cannot call it directly without coupling.
**Decision**: `QuestViewComponent` exposes `@Output() openSettingsRequested = new EventEmitter<void>()`. The template calls `openSettingsRequested.emit()`. `AppComponent.app.html` listens: `(openSettingsRequested)="openSettings()"`.
**Rejected alternatives**: Moving `openSettings` state into `QuestViewComponent` — wrong layer, settings modal is an app-shell concern. Using a shared service for modal state — over-engineering for a single call site.

---

### 2026-03-11: C4 — Standalone component test isolation with overrideComponent
**Context**: `QuestViewComponent` imports `CodeEditorComponent` which requires `NGX_MONACO_EDITOR_CONFIG`. Even with `NO_ERRORS_SCHEMA` on the test module, the provider error fires because standalone component imports are instantiated regardless of the schema.
**Decision**: Use `TestBed.overrideComponent(QuestViewComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })` to strip all child imports from the component itself during tests. `NO_ERRORS_SCHEMA` on both the module and component override suppresses unknown element errors in the template.
**Rejected alternatives**: Providing a mock `NGX_MONACO_EDITOR_CONFIG` — brittle, requires knowing all transitive provider requirements of every imported component.

---

### 2026-03-11: F9 — Loading indicator scope and retry strategy

**Context**: F9 required decisions on (1) how much of the quest card to replace during generation, (2) the thematic copy, (3) which service holds the signals, and (4) how a "Try again" retry button in `QuestPanel` can re-invoke `generateNextQuest()` without re-passing `branch`/`apiKey`.

**Decision**:
- **Partial replacement (Option A)**: only the quest header/narrative/objective/hints/bonus sections are replaced by the shimmer skeleton; the quest list at the bottom stays visible throughout.
- **Thematic label**: *"The anvil is hot…"*
- **Service**: signals live on `QuestEngineService` (the spec incorrectly named it `QuestService`).
- **Retry pattern**: `QuestEngineService` caches `_lastBranch` and `_lastApiKey` at the start of every `generateNextQuest()` call and exposes a `retryGenerate()` method that re-uses those values. `QuestPanel` calls `retryGenerate()` with no arguments.
- **Signal access in `QuestPanel`**: inject `QuestEngineService` directly (rather than threading signals down as inputs), consistent with the decision to keep generation state encapsulated in the service.

**Rejected alternatives**:
- *Full card replacement*: simpler but causes a layout jump and loses the quest list context, increasing disorientation.
- *Output event for retry*: emitting from `QuestPanel` up to `AppComponent` adds indirection with no benefit once the service is already injected.
- *Inject `GameStateService` into `QuestPanel` for apiKey*: couples the component to a second service for a single edge case.

---

### 2026-03-11: F4 — D3.js chosen over pure SVG for tree layout
**Context**: The Global Tree Visualizer needs an interactive, collapsible tree with variable-depth nodes. Two options were evaluated before implementation started.
**Decision**: Use D3 (`d3-hierarchy` + `d3-zoom`). Add `d3` and `@types/d3` to `package.json`. The ~80 KB minified cost is acceptable for a local dev tool; the Reingold-Tilford layout algorithm is non-trivial to implement by hand.
**Rejected alternatives**: Pure SVG — zero dependencies but requires writing the layout math manually, which is a significant distraction from the pedagogical goal.

---

### 2026-03-11: F4 — Globals inclusion filter uses allow-list regex, not deny-list
**Context**: The original spec only excluded `^%` globals. IRIS has many other internal globals (`^IRIS*`, `^Cache*`, `^rOBJ`, `^oddDEF`, etc.) that should not appear in the visualizer.
**Decision**: Only include globals whose names match `$MATCH(name, "^\^[A-Za-z][A-Za-z0-9]*$")`. This is an allow-list (plain alphanumeric names only) that naturally excludes all IRIS-internal globals without requiring an enumerated deny-list that would need maintenance as IRIS versions evolve.
**Rejected alternatives**: Deny-list of known prefixes (`^%`, `^IRIS`, `^Cache`, `^rI`, `^odd`) — brittle; new IRIS releases may introduce new internal global families.

---

### 2026-03-11: F4 — Node-count cap: 50 children per node, 200 nodes total
**Context**: Depth limit of 3 was specified but no cap on breadth. A global with thousands of first-level subscripts could produce an oversized JSON payload or an unreadable tree.
**Decision**: Cap at 50 children per node and 200 nodes total across the entire response. When truncated, the affected node includes `"truncated": true` so the frontend can render a visual indicator.
**Rejected alternatives**: No cap (risk of browser hang on large globals); cap on total payload size in bytes (harder to implement in ObjectScript than a node count).

---

### 2026-03-11: F4 — UI placement is full-page /tree route (not sidebar tab)
**Context**: The original F4 spec described the visualizer as a "sidebar tab." C3 shipped a full-width routed page at `/tree` with a `TreeVisualizerComponent` stub and navbar navigation, which supersedes the sidebar tab concept.
**Decision**: F4 implements the body of `TreeVisualizerComponent` as a full-width page. No changes to `app.html` or the three-pane quest layout are required.
**Rejected alternatives**: Sidebar tab — obsolete after C3 introduced top-level router-based navigation.

---

### 2026-03-11: F4 — GlobalService delegates to IrisApiService, not direct HttpClient
**Context**: Two patterns were possible: `GlobalService` makes its own `HttpClient` calls, or it delegates to `IrisApiService` which already handles auth headers and error formatting.
**Decision**: Add `getGlobals(config: IRISConfig)` to `IrisApiService`. `GlobalService` injects `IrisApiService` + `GameStateService` (for `irisConfig()`). Consistent with all other IRIS-facing services.
**Rejected alternatives**: Direct `HttpClient` in `GlobalService` — duplicates auth header logic and error handling already centralised in `IrisApiService`.

---

### 2026-03-11: F5 — GuildMember class defined by player (Option A), class name prescribed
**Context**: capstone-01 requires a `%Persistent` class. Two options: player defines it (multi-file quest) or a pre-seeded class is compiled into IRIS before the quest.
**Decision**: Player defines `User.GuildMember` as part of capstone-01 using the multi-file quest format (`.cls` + `.script` with `dependsOn`). The class name `User.GuildMember` is prescribed in the quest definition so the storage global name is deterministic (`^User.GuildMemberD`).
**Rejected alternatives**: Pre-seeded class — requires an undocumented backend setup step; also removes the pedagogical value of the player seeing a `%Persistent` class defined for the first time.

---

### 2026-03-11: F5 — capstone-02 uses SQL SELECT, not %OpenId, to avoid ID threading
**Context**: After `%Save()` in capstone-01 the player has an ID, but there is no mechanical way to pass it to capstone-02. Options: rely on Claude to accept any plausible ID in `%OpenId()`, prescribe ID=1, use `$ORDER` to discover the ID, or redesign capstone-02 around SQL SELECT.
**Decision**: capstone-02 uses `&sql(SELECT ... FROM User.GuildMember)` to retrieve the saved record. No ID is required; SQL is declarative. `evaluationCriteria` instructs Claude to accept any valid SQL query against `User.GuildMember` that retrieves at least one row.
**Rejected alternatives**: Prescribe ID=1 — breaks if the player runs capstone-01 multiple times. `$ORDER` discovery — blurs the conceptual boundary with capstone-03 which is explicitly the "raw globals" step. `testHarness` global bridge — pollutes the USER namespace and adds complexity without pedagogical value.

---

### 2026-03-11: F8 — Active time definition: Page Visibility + 120 s idle timeout
**Context**: The spec said "measure focus time" without defining what "active" means. Options ranged from total time the quest is open, to editor-focus-only, to idle-timeout based.
**Decision**: Active = tab is visible (Page Visibility API) AND a keyboard/click/mousemove event has occurred within the last 120 seconds. A 1-second `setInterval` ticks only when both conditions are true. Flush to `GameStateService.recordActiveTime()` every 10 seconds to limit localStorage write frequency.
**Rejected alternatives**: Editor-focus-only — too narrow; players reading quest text or AI feedback are still actively engaged. Zero-idle-timeout (any visible second counts) — overly generous; rewards leaving the tab open.

---

### 2026-03-11: F8 — Weekly goals deferred; daily only in scope
**Context**: phase3_main.md mentioned "daily and weekly goals" but the feature doc only specified "X mins/day". Implementing both requires additional `GameState` schema and UI.
**Decision**: Daily goal only. The `timeLog: Record<string, number>` schema already stores per-day data and can support weekly aggregation in a future iteration with no schema changes.
**Rejected alternatives**: Implement both now — adds two extra UI controls and a weekly-aggregate computed signal for minimal marginal value in the first iteration.

---

### 2026-03-11: F8 — New achievements are time-based, not completion-based
**Context**: The feature doc mentioned "3-day streak" and phase3_main.md mentioned "7-Day Streak" and "10 Hours Invested". `streak-7` ("Week Warrior") already fires on 7 consecutive quest-completion days and is unrelated to time tracking.
**Decision**: Add two new time-based achievements: `goal-streak-3` (daily goal met on 3 consecutive days) and `hours-10` (total accumulated time ≥ 36,000 s). `streak-7` is left untouched.
**Rejected alternatives**: Replace `streak-7` with a time-based variant — breaks existing unlocks and removes completion-frequency tracking which has independent value.

---

### 2026-03-11: F8 — Goal Met indicator is ambient progress bar, not toast
**Context**: The verification plan said "a Goal Met indicator appears" but did not specify the UI component or location.
**Decision**: Slim progress bar below the XP bar in `QuestPanelComponent`. Always visible; fills as today's active time accumulates; label changes to "Goal Met ✓" and colour shifts to accent-green on completion. Ambient, not interruptive — consistent with the panel's role as a status sidebar.
**Rejected alternatives**: Toast notification — interruptive at an unpredictable moment (mid-quest); second modal — too heavy for a motivational nudge.

---

### 2026-03-11: F6 — Prediction quest trigger: fixed ratio (every 4th quest per branch)
**Context**: The spec said "extend `generateQuest()` with a `questType` parameter" but did not specify when `QuestEngineService` should pass `questType: 'prediction'`. Options ranged from a random probability to user-selectable mode to a fixed ratio.
**Decision**: `QuestEngineService` generates a prediction quest when `completedInBranch >= 1 && completedInBranch % 4 === 3`. This is every 4th quest in a branch, starting from position 3 (the 4th). The minimum of 1 ensures the player has written at least one piece of code in a branch before being asked to read and predict.
**Rejected alternatives**: Random probability — unpredictable; could cluster prediction quests or skip them entirely in a branch. User-selectable mode — adds UI complexity and reduces the worked-example effect (players would opt out). Branch-level config in `BRANCH_PROGRESSION` — over-engineering for a simple ratio.

---

### 2026-03-11: F6 — Completion flow: synthesise EvaluationResult, reuse ReviewModal
**Context**: Normal quest completion flows through `evaluateSubmission()` (Claude API) → `EvaluationResult` → `ReviewModal` → XP award → next quest. Prediction quests grade locally — no Claude call — so a separate path was needed.
**Decision**: Synthesise a minimal `EvaluationResult` with `passed`, `score`, `feedback` (correct/incorrect message), `codeReview` (evaluation criteria as explanation), and `xpEarned`. Pass it through the existing pipeline unchanged. `ReviewModal` and XP award are reused with no modifications.
**Rejected alternatives**: A separate prediction-result modal — duplicates `ReviewModal` without benefit. Direct `GameStateService.addXp()` call bypassing the modal — player skips the explanation, defeating the pedagogical purpose.

---

### 2026-03-11: F6 — Wrong answer: no retry, treat as learning moment
**Context**: After a wrong prediction, two options: (a) allow one retry after revealing the correct answer, or (b) reveal the answer and continue without retry.
**Decision**: No retry. The `ReviewModal` shows the correct answer and explanation; the player dismisses and advances. XP is zero. The learning value is in reading the explanation, not in being allowed to "correct" the choice.
**Rejected alternatives**: One retry — adds state complexity (tracking "is this a retry?") and creates a trivial second chance that undermines the worked-example goal of studying the code carefully before answering.

---

### 2026-03-12: F13 — skipQuest() reads apiKey from GameStateService, not a parameter

**Context**: `skipQuest()` must call `generateNextQuest(currentBranch, apiKey)`. The apiKey could come from a parameter (requiring `QuestPanelComponent` to receive it as an input and forward it) or be read directly from `GameStateService.anthropicApiKey()` inside the service.

**Decision**: `QuestEngineService.skipQuest()` reads `apiKey` from `GameStateService.anthropicApiKey()` and `currentBranch` from `GameStateService.currentBranch()`. No parameter needed; no new input binding on `QuestPanelComponent`.

**Rejected alternatives**: Parameter on `skipQuest(apiKey, branch)` — `QuestPanelComponent` already injects `GameStateService` but threading these values as arguments adds boilerplate with no benefit, since `QuestEngineService` already has a service dependency on `GameStateService`.

---

### 2026-03-12: F13 — skipsThisSession is in-memory only, not persisted to localStorage

**Context**: The spec said `skipsThisSession` is stored on `GameStateService` and reset on `resetProgress()`. A decision was needed on whether to add it to the `GameState` interface (persisted) or keep it as a standalone signal (in-memory).

**Decision**: Plain `signal<number>(0)` on `GameStateService`, outside `GameState`. Not serialised to `localStorage`. Resets on page reload and on `resetProgress()`. `GameState` model and `DEFAULT_GAME_STATE` are not modified.

**Rejected alternatives**: Adding to `GameState` — "this session" semantics imply page-scoped lifetime; persisting it would require a schema migration comment and would mislead future readers into thinking session counters are durable state.

---

### 2026-03-11: F6 — Read-only mechanism: questType check, not QuestFile.readOnly
**Context**: `QuestFile` already has a `readOnly?: boolean` field. Two approaches for locking the editor: set `QuestFile.readOnly: true` on all files in a prediction quest (relying on AI to include it), or check `questType === 'prediction'` in `QuestViewComponent`.
**Decision**: Use `questType === 'prediction'` in `QuestViewComponent` to set Monaco `readOnly`. `QuestFile.readOnly` is reserved for per-file scaffolding in multi-file quests (e.g. a read-only fixture file alongside an editable solution file). Coupling read-only state to quest type is semantically correct and immune to AI omission errors.
**Rejected alternatives**: `QuestFile.readOnly: true` set by the AI prompt — AI could forget to include the field, silently making the editor editable on a prediction quest.

---

### 2026-03-16: F10 — Modal for failed quests and no "Try Again" button
**Context**: Two open questions in F10 were left unresolved at feature completion: (1) whether the modal should appear on failure as well as success, and (2) whether a "Try Again" button should be offered for failed quests.
**Decision**: (1) Modal appears for **every** submission result (pass and fail). The Verification Plan step 1 tests this explicitly and the implementation was shipped accordingly. (2) No "Try Again" button — the single **OK** button is sufficient; failed quests return the player to the same quest automatically. Keeping the modal minimal avoids mode confusion (the player should not feel locked out of retrying).
**Rejected alternatives**: Fail-only inline result (no modal) — breaks UX consistency; players expect the same post-submit flow regardless of outcome. "Try Again" button — deferred to Phase 4 if player research shows the modal causes re-attempt confusion.

---

### 2026-03-11: F4 — Test coverage: Vitest unit test for GlobalService only
**Context**: CLAUDE.md requires an automated test for every feature. Two options: Vitest unit test for `GlobalService`, or Playwright E2E for the D3 SVG component.
**Decision**: Vitest unit test (`global.service.spec.ts`). Mock `IrisApiService.getGlobals()` with a JSON fixture and assert the `globals` signal is updated correctly.
**Rejected alternatives**: Playwright E2E — D3-rendered SVG structure is an implementation detail that is brittle to assert against; the visual correctness is better verified manually via the Verification Plan.
