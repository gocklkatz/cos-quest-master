# Change 03: Replace Header Bar with Slim Navbar + Navigation (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ✅ Complete |
| Pedagogical Principle | Cognitive Load Reduction / Workspace Expansion |
| Depends On | [C4 — Migrate AppComponent](change-04-migrate-app-to-quest-view.md) ✅ (QuestViewComponent must exist as a standalone routed component) |

---

## Task Prompt

Replace the current full-height header bar (which contains the app title, XP bar, level badge, connection indicator, and settings button) with a slim top navbar (~40px). The navbar contains the app logo/title on the left, navigation links in the centre, and utility controls on the right. The XP bar and level badge move into the top of the quest sidebar, where they are contextually relevant. The navbar navigation links switch between two top-level views:

1. **Quest View** — the existing three-pane layout (quest sidebar + editor + output). Default view.
2. **Tree Visualizer** — full-width view that replaces the workspace with the Global Tree Visualizer component.

Acceptance criteria:
- Navbar height ≤ 40px; total vertical space gained vs. current header ≥ 16px (current header is 56px).
- XP bar and level badge are visible in the quest sidebar when Quest View is active.
- Switching to Tree Visualizer hides the quest sidebar and editor area; switching back restores them.
- Connection indicator and settings gear remain in the navbar and are visible in both views.
- `ng build` produces zero errors; `ng test` produces zero regressions.

---

## Design Rationale

**Problem**: The header bar occupies ~56px of vertical real estate to display the app title, an XP progress bar, and a level badge. In a code-focused tool, vertical space directly impacts how much code and output is visible at once.

**Solution**:
- Slim the navbar to ~40px (logo + nav links + utility icons only) — reclaims ~16px of vertical space.
- Move XP/level to the quest sidebar. XP is earned by completing quests, so it belongs in the quest context. When the user is in the Tree Visualizer, XP is irrelevant and need not be visible.
- The navbar nav links make the two top-level views (quest workflow vs. data exploration) explicit and discoverable without cluttering the workspace.

---

## Implementation Details

- **Frontend**:
    - Refactor `HeaderBarComponent` into a slim navbar:
        - Remove the `.xp-section` block from the template and its associated styles.
        - Remove XP/level computed properties (`xpForCurrentLevel`, `xpForNextLevelValue`, `xpProgress`, `isMaxLevel`) and the `MAX_LEVEL` field from the TS class.
        - Add two nav link buttons (`[Quest View]`, `[Tree Visualizer]`) between the brand and the right-section. Active link is highlighted with an underline or accent colour.
        - Import `RouterLink` and `RouterLinkActive` in the component's `imports` array. Nav link buttons use `routerLink` directives; active state driven by `routerLinkActive`.
    - Enable Angular Router in the project (`app.config.ts` + `provideRouter`). Define two routes: `/quest` (`QuestViewComponent`, default redirect from `/`) and `/tree` (`TreeVisualizerComponent`).
    - Replace `<app-quest-view (openSettingsRequested)="openSettings()" />` in `app.html` with `<router-outlet />`. Import `RouterOutlet` in `AppComponent`.
    - Add an XP section to the top of `QuestPanelComponent`: inject `GameStateService` directly; render the XP bar and level badge above the quest list. XP is only visible when the Quest View route is active.
    - Create a new `UiEventService` with a `settingsRequested` `Subject`. `QuestViewComponent` calls `uiEvents.requestSettings()` instead of emitting `openSettingsRequested`; `AppComponent` subscribes and sets `showSettings(true)`. Remove the `@Output() openSettingsRequested` EventEmitter from `QuestViewComponent`.
    - Create a stub `TreeVisualizerComponent` (standalone): full-width centred placeholder card with an icon, title ("Global Tree Visualizer"), a one-line description ("Displays the live state of IRIS globals in the USER namespace"), and a muted "Not yet implemented" badge. F4 will replace the internals.
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Open Questions

- ~~Should the nav links use Angular Router (requires enabling routing in the project) or a simple `activeView` signal in `AppComponent`?~~ Resolved: use Angular Router. Enable routing in the project; each top-level view gets its own route (`/quest`, `/tree`).
- ~~When in Tree Visualizer view, should a compact XP badge be shown in the navbar?~~ Resolved: XP is hidden entirely outside of Quest View — no navbar badge needed.
- ~~Should the `QuestPanelComponent` inject `GameStateService` directly for the XP display, or should XP/level be threaded as inputs from `AppComponent`?~~ Resolved: `QuestPanelComponent` injects `GameStateService` directly.
- ~~How does `QuestViewComponent` trigger Settings to open when rendered via `<router-outlet>` (no parent binding)?~~ Resolved: introduce a shared `UiEventService` with a `settingsRequested` Subject. `QuestViewComponent` calls the service; `AppComponent` subscribes. Rejected: injecting `AppComponent` directly (tight coupling); removing the settings link entirely (F4 Tree Visualizer view may also need it eventually).
- ~~What should the `TreeVisualizerComponent` stub render?~~ Resolved: a full-width centred placeholder card (icon + title + description + "Not yet implemented" badge). Rejected: empty `<div>` (breaks Verification Plan step 3); redirect to `/quest` (prevents verifying the route works).

---

## Files Changed

- `src/app/components/header-bar/header-bar.component.html` — remove XP section; add nav link buttons with `routerLink`/`routerLinkActive`
- `src/app/components/header-bar/header-bar.component.ts` — remove XP/level computed properties and `MAX_LEVEL`; add `RouterLink`, `RouterLinkActive` imports
- `src/app/components/header-bar/header-bar.component.scss` — slim navbar to ~40px; remove XP bar styles; add active-link indicator
- `src/app/components/quest-panel/quest-panel.component.html` — add XP bar + level badge at top of sidebar
- `src/app/components/quest-panel/quest-panel.component.ts` — inject `GameStateService` directly for XP display
- `src/app/components/quest-panel/quest-panel.component.scss` — XP section styles within sidebar
- `src/app/components/quest-view/quest-view.component.ts` — replace `@Output() openSettingsRequested` with `UiEventService.requestSettings()` call
- `src/app/components/tree-visualizer/tree-visualizer.component.ts` — new stub component (standalone)
- `src/app/components/tree-visualizer/tree-visualizer.component.html` — placeholder card
- `src/app/components/tree-visualizer/tree-visualizer.component.scss` — centred card styles
- `src/app/services/ui-event.service.ts` — new service; `settingsRequested` Subject
- `src/app/app.config.ts` — add `provideRouter` with `/quest` and `/tree` routes and a `/` redirect
- `src/app/app.html` — replace `<app-quest-view>` with `<router-outlet />`; import `RouterOutlet`
- `src/app/app.ts` — subscribe to `UiEventService.settingsRequested` to open the settings modal; import `RouterOutlet`
- `src/app/app.scss` — ensure `<router-outlet>` host fills remaining viewport height

---

## Verification Plan

1. Confirm the navbar height is visibly slimmer than the previous header (≤ 40px).
2. Confirm the XP bar and level badge appear at the top of the quest sidebar in Quest View.
3. Click "Tree Visualizer" nav link — confirm the workspace (quest sidebar + editor + output) is replaced by the visualizer placeholder card.
4. Click "Quest View" nav link — confirm the workspace is restored with all panes intact.
5. Confirm the connection indicator and settings gear are visible in both views.
6. Open Settings from the AI-disabled banner link inside Quest View — confirm the modal opens correctly via `UiEventService`.
7. Confirm `ng build` produces zero errors.
8. Confirm `ng test` produces zero regressions.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
