# Phase 1 Design Decisions

---

### D-P1-01 · Phase 1 design: No Separate Backend

**Context**: The app needs to call two external services — the Claude API for AI-powered quest generation and code evaluation, and an IRIS Docker instance for code execution. A traditional architecture would add a server-side intermediary.

**Decision**: The app runs entirely in the browser. Both Claude API calls and IRIS REST calls are made directly from the Angular client. No Node/Express or other backend server is introduced.

**Rejected alternatives**: A server-side backend that would proxy API calls and manage the API key centrally. Rejected because it adds deployment complexity and the target user is a developer running IRIS locally — a purely client-side app is simpler to distribute and run.

**Affects**: `phase1_main.md §2` ("Important: No Separate Backend")

---

### D-P1-02 · Phase 1 design: Claude API called via `fetch`, not `HttpClient`

**Context**: Angular's `HttpClient` includes built-in XSRF protection that attaches headers to outgoing requests. The Anthropic API requires specific custom headers including `x-api-key` and `anthropic-dangerous-direct-browser-access`.

**Decision**: `ClaudeApiService.callClaude()` uses the native browser `fetch` API rather than Angular's `HttpClient` to avoid Angular's XSRF header interference with the Anthropic API's required custom headers.

**Rejected alternatives**: Using `HttpClient` with custom interceptors to suppress XSRF behavior. Rejected because `fetch` is simpler and avoids the need to configure Angular internals for a single external API.

**Affects**: `phase1_main.md §8.1`

---

### D-P1-03 · Phase 1 design: HTTP Basic Auth for IRIS calls via `HttpHeaders` in the service

**Context**: The IRIS REST API (both the Atelier API and the custom `/api/quest/` endpoint) uses HTTP Basic Authentication. The Angular CLI proxy forwards requests during development; in production the browser calls IRIS directly.

**Decision**: Authentication is implemented by manually constructing an `Authorization: Basic <base64>` header inside `IrisApiService.getHeaders()` using Angular's `HttpHeaders`. Credentials come from the `IRISConfig` object stored in app state.

**Rejected alternatives**: An `HttpInterceptor` that injects auth headers globally. Rejected because the interceptor would apply to all `HttpClient` calls including Claude, and the per-service approach is simpler for a single authenticated endpoint group.

**Affects**: `phase1_main.md §7.2`

---

### D-P1-04 · Phase 1 design: `localStorage` under single key `questmaster` for all state persistence

**Context**: The app must persist player progress (XP, level, completed quests, settings, API key, cached quest bank) across page reloads without a server-side store.

**Decision**: All persisted state is serialised as a single JSON blob and stored under the localStorage key `questmaster`. Reads and writes go through `GameStateService.loadFromStorage()` and `GameStateService.persist()`.

**Rejected alternatives**: Using separate localStorage keys per concern (e.g. `questmaster.xp`, `questmaster.settings`). Rejected because a single key simplifies serialisation, reset logic, and debugging (one entry to inspect or delete).

**Affects**: `phase1_main.md §9`

---

### D-P1-05 · Phase 1 design: Angular signals (not NgRx / BehaviorSubjects) for state management

**Context**: The app has shared reactive state (XP, current quest, connection status) that multiple components need to read and react to.

**Decision**: Angular signals (`signal()`, `computed()`, `effect()`) are used for all state management in `GameStateService` and `IrisConnectionService`. No NgRx store or RxJS `BehaviorSubject` pattern is introduced.

**Rejected alternatives**: NgRx (Redux-style store) — rejected as over-engineered for a single-developer learning app. RxJS `BehaviorSubject` — rejected because Angular signals are the modern recommended approach and integrate directly with Angular's change detection.

**Affects**: `phase1_main.md §2` (Tech Stack), `phase1_main.md §9`, `phase1_main.md §12.2`

---

### D-P1-06 · Phase 1 design: Monaco Editor (not CodeMirror 6) for the code editor

**Context**: The code editor component needs syntax highlighting, line numbers, and optionally autocomplete for ObjectScript. Two main browser-capable editors were considered.

**Decision**: Monaco Editor via the `ngx-monaco-editor-v2` Angular wrapper is used. A custom Monarch tokeniser is registered to provide ObjectScript syntax highlighting (keywords, built-in functions, global variables, comments, strings, numbers).

**Rejected alternatives**: CodeMirror 6 — listed as an alternative in the Tech Stack table but not chosen. The spec names `ngx-monaco-editor-v2` in the implementation details and provides a full Monaco integration example, indicating Monaco was the selected option.

**Affects**: `phase1_main.md §2` (Tech Stack), `phase1_main.md §11`

---

### D-P1-07 · Phase 1 design: XECUTE execution model — code runs as raw ObjectScript commands

**Context**: The `/api/quest/execute` endpoint must execute arbitrary player-submitted ObjectScript and return captured stdout. ObjectScript can be executed in different ways server-side.

**Decision**: Player code is executed using `XECUTE code` inside the `QuestMaster.REST.Execute` dispatch class. Code runs as raw ObjectScript commands in the current process context, not wrapped in a generated class method or routine. IO is redirected to a temp file to capture `WRITE` output.

**Rejected alternatives**: Dynamically generating a class definition from the submitted code and compiling it before execution. Rejected because it adds compilation latency and complexity; XECUTE is simpler for the snippet-level code that quests require.

**Affects**: `phase1_main.md §3` (Custom Execution Endpoint), `phase1_main.md §6` (Quest Zero reference implementation)

---

### D-P1-08 · Phase 1 design: User-supplied Anthropic API key stored in localStorage

**Context**: The app calls the Claude API from the browser to generate quests and evaluate code. A server-side key would require a backend; embedding a key in the app bundle would expose it publicly.

**Decision**: The user provides their own Anthropic API key via the Settings modal. The key is stored in `GameState.anthropicApiKey` and persisted to localStorage under the `questmaster` key. The app provides a graceful fallback mode when no key is present (hard-coded quests only, no AI review).

**Rejected alternatives**: A server-side API key managed by the app operator. Rejected because there is no backend (D-P1-01) and the target audience is developers comfortable managing their own API keys. Embedding a key in the bundle was not considered viable due to security exposure.

**Affects**: `phase1_main.md §2` (Tech Stack), `phase1_main.md §8.1`, `phase1_main.md §8.3`, `phase1_main.md §9`

---

### D-P1-09 · Phase 1 design: Angular standalone components with no NgModules

**Context**: Angular 17+ supports a standalone component model that eliminates the need for `NgModule` declarations. The project targets Angular 17+.

**Decision**: All components are declared with `standalone: true` and import their dependencies directly. No `NgModule` files are created. The app is bootstrapped via `appConfig` with `ApplicationConfig`.

**Rejected alternatives**: The traditional NgModule-based architecture. Rejected because standalone components are Angular's current recommended approach, reduce boilerplate, and improve tree-shaking.

**Affects**: `phase1_main.md §12.1`

---

### D-P1-10 · Phase 1 design: Angular CLI dev proxy for CORS avoidance during development

**Context**: During development the Angular dev server runs on `localhost:4200` and IRIS runs on `localhost:52773`. Direct browser calls to IRIS trigger CORS preflight. Configuring IRIS CORS for every developer setup is error-prone.

**Decision**: A `proxy.conf.json` is configured to forward `/api/quest` and `/api/atelier` requests from the Angular CLI dev server to `http://localhost:52773`, making IRIS calls same-origin in development. In production, IRIS CORS headers are configured directly.

**Rejected alternatives**: Configuring IRIS CORS (`CORSAllowed = 1`, allowed origins) as the primary development flow. This is documented as the production approach but is secondary to the proxy for local development ease.

**Affects**: `phase1_main.md §3` (CORS Configuration), `phase1_main.md §12.4`

---

### D-P1-11 · Phase 1 design: Hard-coded starter quests with AI-generated quests as extension

**Context**: The app requires Claude API access for quest generation, but a first-time user may not have an API key, and network latency for quest generation could interrupt the onboarding experience.

**Decision**: Quest Zero, Quest 1 ("Hello, Guildmate"), and Quest 2 ("The Adventurer's Ledger") are hard-coded in `src/app/data/starter-quests.ts`. AI-generated quests extend the quest bank after the starter quests are exhausted. When Claude is unavailable, only the hard-coded quests are offered.

**Rejected alternatives**: Fully dynamic quest generation from the first quest onward. Rejected because it would require an API key before the user can experience any of the app, and because a static Quest Zero is necessary to validate the IRIS endpoint setup before proceeding.

**Affects**: `phase1_main.md §6`, `phase1_main.md §8.3`, `phase1_main.md §13`

---

### D-P1-12 · Phase 1 design: Quest Zero as a prerequisite gate for all other quests

**Context**: The app depends on the `QuestMaster.REST.Execute` IRIS endpoint being present and working. If the endpoint is absent, code execution fails for every subsequent quest.

**Decision**: Quest Zero ("Forge the Anvil") tasks the player with creating the execution endpoint. Before unlocking any quest beyond Quest Zero, the app validates the endpoint by calling `GET /api/quest/health` and `POST /api/quest/execute` with `{"code": "WRITE 1+1"}`. All other quests list `"prerequisites": ["quest-zero"]`.

**Rejected alternatives**: Shipping a pre-built `QuestMaster.REST.Execute` class with the Docker setup so the player never has to build it. Rejected because building the execution endpoint is itself a meaningful learning exercise that introduces `%CSP.REST`, XECUTE, and IO redirection.

**Affects**: `phase1_main.md §3` (Custom Execution Endpoint note), `phase1_main.md §4.3`, `phase1_main.md §12.5`

---

### D-P1-13 · Phase 1 design: Connection status polled every 30 seconds via RxJS `interval`

**Context**: The IRIS Docker instance may become unavailable during a session. The UI must reflect connection state without requiring user-initiated checks.

**Decision**: `IrisConnectionService` uses `interval(30000)` piped with `startWith(0)` and `switchMap` to poll `GET /api/quest/health` every 30 seconds. The result is stored in a signal (`connectionStatus`) exposed to the header connection indicator component.

**Rejected alternatives**: WebSocket or server-sent events for push-based status updates. Rejected as over-engineered; the IRIS instance is local and a 30-second polling interval is adequate for a development tool.

**Affects**: `phase1_main.md §7.3`

---

### D-P1-14 · Phase 1 design: Claude model fixed at `claude-sonnet-4-20250514`

**Context**: The `ClaudeApiService` must specify a model for all API calls (quest generation and code evaluation).

**Decision**: The model is hard-coded as `claude-sonnet-4-20250514` with `max_tokens: 2048` in `callClaude()`. The model is not exposed as a user-configurable setting.

**Rejected alternatives**: Allowing the user to select the model via settings (e.g. Haiku for speed, Opus for quality). Rejected for simplicity in Phase 1; a single well-capable model avoids UX complexity and response format variability.

**Affects**: `phase1_main.md §8.1`

---

### D-P1-15 · Phase 1 design: Fantasy / guild visual theme with parchment and dark editor

**Context**: The app needs a visual identity that reinforces the gamified learning narrative.

**Decision**: A fantasy / guild aesthetic is used: muted parchment background for the quest panel, dark (`vs-dark`) theme for the Monaco editor, and three tier badges (bronze Apprentice, silver Journeyman, gold Master).

**Rejected alternatives**: Not documented.

**Affects**: `phase1_main.md §5.4`
