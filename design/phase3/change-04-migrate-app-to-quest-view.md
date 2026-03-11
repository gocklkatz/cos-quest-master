# Change 04: Migrate AppComponent to QuestViewComponent (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ⬜ Not started |
| Depends On | — |
| Required By | C3 (Navbar Navigation) — C3 routes to `QuestViewComponent`; it must exist first |

---

## Task Prompt

Extract all quest-workflow state, logic, and template from `AppComponent` into a new standalone `QuestViewComponent`. After this change, `AppComponent` is a thin shell: navbar + `<router-outlet>` + `SettingsModal`. `QuestViewComponent` becomes the `/quest` route and owns everything related to running, evaluating, and displaying quests.

Acceptance criteria:
- `AppComponent` template contains only `<app-header-bar>`, optional `<app-settings-modal>`, and `<router-outlet>`.
- `AppComponent` class contains only: `showSettings` signal, `openSettings()`, `closeSettings()`, and the connection-restart portion of `onReset()`.
- All quest-workflow signals, methods, and child components live in `QuestViewComponent`.
- The app behaves identically to before (no regressions in F1, F2, F9, F10, F11).
- `ng build` produces zero errors; `ng test` produces zero regressions.

---

## Design Rationale

`AppComponent` currently owns ~450 lines of quest-workflow logic alongside the app shell (navbar, settings). This prevents Angular Router from owning top-level navigation, because routing requires the workspace to be a separate component rendered inside `<router-outlet>`. C3 cannot add proper routes until the workspace is its own component.

Splitting AppComponent into a thin shell + `QuestViewComponent` is a prerequisite structural refactor. It unlocks C3's routing, keeps each component focused, and makes future top-level views (Tree Visualizer, future profile page) straightforward additions.

---

## What Moves to `QuestViewComponent`

### Template (`app.html` → `quest-view.component.html`)

| Block | Destination |
|---|---|
| `.ai-disabled-banner` | `QuestViewComponent` |
| `<div class="workspace">` (entire block: sidebar, dividers, editor, output, chat) | `QuestViewComponent` |
| `<app-review-modal>` | `QuestViewComponent` |
| `<app-xp-animation>` | `QuestViewComponent` |
| `<app-achievement-overlay>` | `QuestViewComponent` |

### TypeScript (`app.ts` → `quest-view.component.ts`)

All signals, computed properties, and methods **except** those in the "stays in AppComponent" list:

- Signals: `showChat`, `sidebarWidth`, `outputHeight`, `chatHeight`, `editorCode`, `questFiles`, `activeFileId`, `output`, `error`, `compileErrors`, `isRunning`, `isEvaluating`, `evaluation`, `reviewEvaluation`, `xpAnimTrigger`, `xpAnimAmount`, `xpAnimLeveledUp`, `xpAnimNewLevel`, `achievementAnimTrigger`, `achievementAnimItem`, `hintsShownForCurrentQuest`
- Private fields: `fileCodeBuffers`, `pendingNextQuest`, `questStartedAt`, `lastLoadedQuestId`
- Computed: `hasApiKey`, `anthropicApiKey`, `challengeMode`
- Methods: `runCode()`, `runAllFiles()`, `submitCode()`, `onReviewConfirmed()`, `onQuestSelected()`, `onFileSelected()`, `loadQuestCode()`, `collectFileCode()`, `toggleChat()`, `onCopyToEditor()`, `onToggleChallengeMode()`, `onRestoreStarterCode()`, `onHintRevealed()`, `showAchievements()`
- Lifecycle: `constructor()` (reactive effect), `ngOnInit()` (quest engine init + initial quest load)
- Injected services: `GameStateService`, `ClassQuestService`, `AiPairService`, `PaneSizeService`, `AchievementService`, `QuestEngineService`
- Resize handlers: `onSidebarResize()`, `onOutputResize()`, `onChatResize()`

### Styles (`app.scss` → `quest-view.component.scss`)

All rules except `.app-shell`:
`.ai-disabled-banner`, `.workspace`, `.quest-sidebar`, `.quest-placeholder`, `.editor-area`, `.editor-pane`, `.run-toolbar`, `.run-btn`, `@keyframes spin`, `.submit-btn`, `.run-hint`, `.output-pane`, `.chat-toggle-btn`, `.chat-pane`, `.resize-divider` (and all sub-rules).

---

## What Stays in `AppComponent`

### Template (`app.html`)

```html
<div class="app-shell">
  <app-header-bar (openSettings)="openSettings()" />

  @if (showSettings()) {
    <app-settings-modal (closed)="closeSettings()" (reset)="onReset()" />
  }

  <router-outlet />
</div>
```

*(At this stage, no Router is wired yet — `<router-outlet>` is a placeholder for C3 to activate. Until C3 lands, `AppComponent` can render `<app-quest-view />` directly as a temporary measure, or the outlet can be left as a stub.)*

### TypeScript (`app.ts`)

```typescript
showSettings = signal(false);

openSettings(): void { this.showSettings.set(true); }

closeSettings(): void {
  this.showSettings.set(false);
  this.connectionSvc.startPolling(this.gameState.irisConfig());
}

onReset(): void {
  this.showSettings.set(false);
  this.connectionSvc.startPolling(this.gameState.irisConfig());
  // Quest-state reset is handled reactively in QuestViewComponent via resetEpoch.
}
```

Injected services retained: `IrisConnectionService`, `GameStateService`.

### Styles (`app.scss`)

Only `.app-shell`:
```scss
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
```

---

## The Reset Cross-Boundary Problem

After the split, `onReset()` in `AppComponent` can no longer call `loadQuestCode()` or clear `output`/`evaluation` signals — those live in `QuestViewComponent`. The settings modal fires `(reset)` which bubbles up to `AppComponent`, but the quest-reload logic is in a child component.

**Solution: `resetEpoch` signal on `QuestEngineService`**

1. Add a `resetEpoch = signal(0)` to `QuestEngineService`.
2. Increment it at the end of `initialize()`: `this.resetEpoch.update(n => n + 1)`.
3. `QuestViewComponent` adds an `effect()` on `resetEpoch`:
   ```typescript
   effect(() => {
     const epoch = this.questEngine.resetEpoch();
     if (epoch === 0) return; // skip initial value
     untracked(() => {
       this.output.set(null);
       this.error.set(null);
       this.compileErrors.set([]);
       this.evaluation.set(null);
       const quest = this.questEngine.currentQuest();
       if (quest) {
         this.lastLoadedQuestId = quest.id;
         this.loadQuestCode(quest);
         this.aiPair.loadForQuest(quest.id);
       }
     });
   });
   ```

This keeps the reset reactive and avoids any `@ViewChild` coupling between `AppComponent` and `QuestViewComponent`.

---

## Transitional Rendering (before C3)

Until C3 activates `provideRouter`, there is no `<router-outlet>`. Two options:

- **Option A (recommended)**: Keep `<app-quest-view />` directly in `app.html` (no outlet yet). C3 then replaces it with `<router-outlet />`.
- **Option B**: Wire `provideRouter` as part of C4 with a single `/quest` redirect. Adds scope but avoids a two-step `app.html` change.

The spec recommends Option A — C4 scope is structural only; routing infrastructure belongs to C3.

---

## Implementation Details

- **Frontend**:
  - Create `src/app/components/quest-view/quest-view.component.ts` as a standalone component.
  - Move template, logic, and styles as described above.
  - `QuestViewComponent` does **not** use `RouterModule` — that is added by C3.
  - Add `resetEpoch` signal to `QuestEngineService` and wire the reset effect in `QuestViewComponent`.
  - `AppComponent` imports: `HeaderBarComponent`, `SettingsModalComponent`, `QuestViewComponent`, `RouterOutlet` (stubbed for C3).
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Files Changed

- `src/app/components/quest-view/quest-view.component.ts` — **new**: all quest-workflow logic from `AppComponent`
- `src/app/components/quest-view/quest-view.component.html` — **new**: workspace template from `app.html`
- `src/app/components/quest-view/quest-view.component.scss` — **new**: workspace styles from `app.scss`
- `src/app/app.ts` — stripped to shell (settings + connection only)
- `src/app/app.html` — stripped to shell template
- `src/app/app.scss` — only `.app-shell` rule remains
- `src/app/services/quest-engine.service.ts` — add `resetEpoch` signal; increment in `initialize()`

---

## Open Questions

- [ ] **Transitional rendering**: Use Option A (`<app-quest-view />` directly until C3) or Option B (add minimal router now)? Recommended: Option A.
- [ ] **`SettingsModal` and `ReviewModal` co-location**: `SettingsModal` stays in `AppComponent` (navbar-triggered). `ReviewModal` moves to `QuestViewComponent` (quest-triggered). Confirm this split is acceptable.
- [ ] **`XpAnimation` and `AchievementOverlay` placement**: Both are full-screen fixed overlays. They can safely move to `QuestViewComponent` (fixed positioning renders above everything). Confirm this or keep in `AppComponent`.

---

## Verification Plan

1. Run the app — confirm the three-pane layout and quest workflow behave identically to before.
2. Run a quest, submit, confirm `ReviewModal` appears and XP animation fires.
3. Open Settings → Reset All Progress → confirm quest-zero reloads in the editor and output/evaluation are cleared.
4. Open Settings → change IRIS config → confirm connection indicator updates.
5. Confirm `ng build` produces zero errors.
6. Confirm `ng test` produces zero regressions.
