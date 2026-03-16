# Change 04: Migrate AppComponent to QuestViewComponent (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ✅ Complete |
| Depends On | — |
| Required By | C3 (Navbar Navigation) — C3 routes to `QuestViewComponent`; it must exist first |

---

## Task Prompt

Extract all quest-workflow state, logic, and template from `AppComponent` into a new standalone `QuestViewComponent`. After this change, `AppComponent` is a thin shell: navbar + `<app-quest-view />` + `SettingsModal`. `QuestViewComponent` owns everything related to running, evaluating, and displaying quests. (No router yet — `<app-quest-view />` is rendered directly; C3 replaces it with `<router-outlet />`.)

Acceptance criteria:
- `AppComponent` template contains only `<app-header-bar>`, optional `<app-settings-modal>`, and `<app-quest-view />`.
- `AppComponent` class contains only: `showSettings` signal, `openSettings()`, `closeSettings()`, and `onReset()` (connection restart + `questEngine.triggerReset()`).
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

  <app-quest-view />
</div>
```

*(C3 replaces `<app-quest-view />` with `<router-outlet />` when routing is activated. No router wiring in C4.)*

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
  this.questEngine.triggerReset();
  // Quest-state reset (output clear + quest reload) is handled reactively
  // in QuestViewComponent via the resetEpoch effect.
}
```

Injected services retained: `IrisConnectionService`, `GameStateService`, `QuestEngineService`.

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

**Solution: `resetEpoch` signal + `triggerReset()` on `QuestEngineService`**

`initialize()` must NOT increment `resetEpoch` — it is called from `QuestViewComponent.ngOnInit()` on startup too, which would cause the effect to fire and double-load the quest alongside the normal `ngOnInit` load.

Instead:

1. Add `resetEpoch = signal(0)` to `QuestEngineService`.
2. Add a dedicated `triggerReset()` method that increments the epoch:
   ```typescript
   triggerReset(): void {
     this.resetEpoch.update(n => n + 1);
   }
   ```
3. `AppComponent.onReset()` calls `this.questEngine.triggerReset()` after closing settings and restarting connection polling.
4. `QuestViewComponent` adds an `effect()` on `resetEpoch`:
   ```typescript
   effect(() => {
     const epoch = this.questEngine.resetEpoch();
     if (epoch === 0) return; // skip initial value — only fires on explicit reset
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

This keeps the reset reactive, avoids `@ViewChild` coupling, and does not interfere with the startup load path.

---

## Transitional Rendering (before C3)

**Resolved: Option A.**

`AppComponent` renders `<app-quest-view />` directly. No `<router-outlet>` and no `provideRouter` in C4 — routing infrastructure is C3's responsibility. C3 replaces the direct element with `<router-outlet />` and wires `provideRouter`.

---

## Implementation Details

- **Frontend**:
  - Create `src/app/components/quest-view/quest-view.component.ts` as a standalone component.
  - Move template, logic, and styles as described above.
  - `QuestViewComponent` does **not** use `RouterModule` — that is added by C3.
  - Add `resetEpoch` signal and `triggerReset()` to `QuestEngineService`; wire the reset effect in `QuestViewComponent`.
  - `AppComponent` imports: `HeaderBarComponent`, `SettingsModalComponent`, `QuestViewComponent`. No `RouterOutlet` import in C4.
- **IRIS Backend**: —
- **AI Prompts**: —

---

## Files Changed

- `src/app/components/quest-view/quest-view.component.ts` — **new**: all quest-workflow logic from `AppComponent`
- `src/app/components/quest-view/quest-view.component.html` — **new**: workspace template from `app.html`
- `src/app/components/quest-view/quest-view.component.scss` — **new**: workspace styles from `app.scss`
- `src/app/components/quest-view/quest-view.component.spec.ts` — **new**: unit tests (see Verification Plan)
- `src/app/app.ts` — stripped to shell (settings + connection only)
- `src/app/app.html` — stripped to shell template (`<app-quest-view />` replaces workspace block)
- `src/app/app.scss` — only `.app-shell` rule remains
- `src/app/app.spec.ts` — update smoke test import (App class unchanged in shape; confirm it still creates)
- `src/app/services/quest-engine.service.ts` — add `resetEpoch` signal and `triggerReset()` method; update JSDoc on `initialize()` to reference `QuestViewComponent`
- `src/app/services/quest-engine.service.spec.ts` — add `triggerReset()` test case

---

## Open Questions

- ~~**Transitional rendering**: Use Option A (`<app-quest-view />` directly until C3) or Option B (add minimal router now)?~~ **Resolved: Option A.** No router in C4.
- ~~**`SettingsModal` and `ReviewModal` co-location**: `SettingsModal` stays in `AppComponent` (navbar-triggered). `ReviewModal` moves to `QuestViewComponent` (quest-triggered). Confirm this split is acceptable.~~ **Resolved: split confirmed.**
- ~~**`XpAnimation` and `AchievementOverlay` placement**: Both are full-screen fixed overlays. They can safely move to `QuestViewComponent` (fixed positioning renders above everything).~~ **Resolved: both move to `QuestViewComponent`.**

---

## Verification Plan

### Automated tests (must pass before marking Complete)

**`quest-engine.service.spec.ts` — add one test:**
1. `triggerReset()` increments `resetEpoch` from 0 → 1 on the first call, 1 → 2 on the second.

**`quest-view.component.spec.ts` — new spec, minimum three test cases:**

2. **Smoke**: `QuestViewComponent` creates without error (mock all injected services).

3. **`resetEpoch` effect — reset clears state and reloads quest**:
   - Arrange: mock `QuestEngineService` with `resetEpoch = signal(0)` and `currentQuest` returning a stub quest; `output`, `error`, `evaluation` signals set to non-null values.
   - Act: call `questEngine.triggerReset()` (increment `resetEpoch` to 1) and run change detection.
   - Assert: `output()`, `error()`, `evaluation()` are `null`; `loadQuestCode` was called with the stub quest.

4. **Constructor effect — auto-loads quest on external `currentQuest` change**:
   - Arrange: `lastLoadedQuestId` is `'quest-A'`; `currentQuest` signal changes to a quest with `id: 'quest-B'`.
   - Assert: `loadQuestCode` is called; `lastLoadedQuestId` is updated to `'quest-B'`.

### Manual regression checks

5. Run the app — confirm the three-pane layout and quest workflow behave identically to before.
6. Run a quest, submit, confirm `ReviewModal` appears and XP animation fires.
7. Open Settings → Reset All Progress → confirm quest-zero reloads in the editor and output/evaluation are cleared.
8. Open Settings → change IRIS config → confirm connection indicator updates.
9. Confirm `ng build` produces zero errors.
10. Confirm `ng test` produces zero regressions.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
