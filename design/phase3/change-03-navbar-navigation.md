# Change 03: Replace Header Bar with Slim Navbar + Navigation (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Pedagogical Principle | Cognitive Load Reduction / Workspace Expansion |
| Depends On | — (ships with a stub `TreeVisualizerComponent`; F4 fills it later) |

---

## Task Prompt

Replace the current full-height header bar (which contains the app title, XP bar, level badge, connection indicator, and settings button) with a slim top navbar (~40px). The navbar contains the app logo/title on the left, navigation links in the centre, and utility controls on the right. The XP bar and level badge move into the top of the quest sidebar, where they are contextually relevant. The navbar navigation links switch between two top-level views:

1. **Quest View** — the existing three-pane layout (quest sidebar + editor + output). Default view.
2. **Tree Visualizer** — full-width view that replaces the workspace with the Global Tree Visualizer component.

Acceptance criteria:
- Navbar height ≤ 40px; total vertical space gained vs. current header ≥ 20px.
- XP bar and level badge are visible in the quest sidebar when Quest View is active.
- Switching to Tree Visualizer hides the quest sidebar and editor area; switching back restores them.
- Connection indicator and settings gear remain in the navbar and are visible in both views.
- `ng build` produces zero errors; `ng test` produces zero regressions.

---

## Design Rationale

**Problem**: The header bar occupies ~60px of vertical real estate to display the app title, an XP progress bar, and a level badge. In a code-focused tool, vertical space directly impacts how much code and output is visible at once.

**Solution**:
- Slim the navbar to ~40px (logo + nav links + utility icons only) — reclaims ~20px of vertical space.
- Move XP/level to the quest sidebar. XP is earned by completing quests, so it belongs in the quest context. When the user is in the Tree Visualizer, XP is irrelevant and need not be visible.
- The navbar nav links make the two top-level views (quest workflow vs. data exploration) explicit and discoverable without cluttering the workspace.

---

## Implementation Details

- **Frontend**:
    - Refactor `HeaderBarComponent` into a slim navbar:
        - Remove the `.xp-section` block from the template and its associated styles.
        - Add two nav link buttons (`[Quest View]`, `[Tree Visualizer]`) between the brand and the right-section. Active link is highlighted with an underline or accent colour.
        - Enable Angular Router in the project (`app.config.ts` + `provideRouter`). Define two routes: `/quest` (Quest View, default redirect from `/`) and `/tree` (Tree Visualizer).
    - Convert the workspace and visualizer into routed components (or lazy-loaded routes).
    - Nav link buttons in `HeaderBarComponent` use `routerLink` directives; active state driven by `routerLinkActive`.
    - Remove `(viewChanged)` / `activeView` signal approach — the Router owns view state.
    - Add an XP section to the top of `QuestPanelComponent`: inject `GameStateService` directly; render the XP bar and level badge above the quest list. XP is only visible when the Quest View route is active.
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Open Questions

- ~~Should the nav links use Angular Router (requires enabling routing in the project) or a simple `activeView` signal in `AppComponent`?~~ Resolved: use Angular Router. Enable routing in the project; each top-level view gets its own route (`/quest`, `/tree`).
- ~~When in Tree Visualizer view, should a compact XP badge be shown in the navbar?~~ Resolved: XP is hidden entirely outside of Quest View — no navbar badge needed.
- ~~Should the `QuestPanelComponent` inject `GameStateService` directly for the XP display, or should XP/level be threaded as inputs from `AppComponent`?~~ Resolved: `QuestPanelComponent` injects `GameStateService` directly.

---

## Files Changed

- `src/app/components/header-bar/header-bar.component.html` — remove XP section; add nav link buttons
- `src/app/components/header-bar/header-bar.component.ts` — add `activeView` input + `viewChanged` output; remove XP/level computed properties
- `src/app/components/header-bar/header-bar.component.scss` — slim navbar styles; remove XP bar styles; add active-link indicator
- `src/app/components/quest-panel/quest-panel.component.html` — add XP bar + level badge at top of sidebar
- `src/app/components/quest-panel/quest-panel.component.ts` — inject `GameStateService` (or add XP inputs)
- `src/app/components/quest-panel/quest-panel.component.scss` — XP section styles within sidebar
- `src/app/app.config.ts` — add `provideRouter` with Quest and Tree Visualizer routes
- `src/app/app.html` — replace workspace block with `<router-outlet />`; remove `activeView` bindings
- `src/app/app.ts` — remove `activeView` signal (Router owns view state)
- `src/app/app.scss` — reduce header height; ensure `<router-outlet>` host fills remaining viewport

---

## Verification Plan

1. Confirm the navbar height is visibly slimmer than the previous header.
2. Confirm the XP bar and level badge appear at the top of the quest sidebar in Quest View.
3. Click "Tree Visualizer" nav link — confirm the workspace (quest sidebar + editor + output) is replaced by the visualizer area.
4. Click "Quest View" nav link — confirm the workspace is restored with all panes intact.
5. Confirm the connection indicator and settings gear are visible in both views.
6. Confirm `ng build` produces zero errors.
7. Confirm `ng test` produces zero regressions.
