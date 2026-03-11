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

### 2026-03-11: F4 — Test coverage: Vitest unit test for GlobalService only
**Context**: CLAUDE.md requires an automated test for every feature. Two options: Vitest unit test for `GlobalService`, or Playwright E2E for the D3 SVG component.
**Decision**: Vitest unit test (`global.service.spec.ts`). Mock `IrisApiService.getGlobals()` with a JSON fixture and assert the `globals` signal is updated correctly.
**Rejected alternatives**: Playwright E2E — D3-rendered SVG structure is an implementation detail that is brittle to assert against; the visual correctness is better verified manually via the Verification Plan.
