# Feature 08: Quest Time Tracking & Goals (Phase 3)

| Field | Value |
|---|---|
| Priority | phase3-mid |
| Status | ✅ Complete |
| Depends On | — |
| Pedagogical Principle | Spaced Repetition / Habit Formation |

---

## Task Prompt
Track **active** time spent on quests and allow the player to set a daily time goal (minutes/day). A persistent progress indicator in the Quest Panel shows today's progress toward the goal. Two new achievements reward consistent daily practice and cumulative effort.

**Acceptance criteria:**
- Timer runs only while the quest tab is visible and the player is not idle (> 120 s without keyboard/mouse).
- Accumulated seconds per calendar day persist in `localStorage` across refreshes.
- The daily goal is configurable in the Settings modal (default: 20 min).
- A progress bar in the Quest Panel shows today's time vs. goal; turns visually complete ("Goal Met") once reached.
- Two new achievements fire correctly when thresholds are met.
- Weekly goals are **out of scope** for this feature.

---

## Pedagogical Design

**The Learning Problem**: Cramming vs. Learning. Many students try to finish all quests in one sitting, leading to poor long-term retention.

**The Cognitive Solution**: Spaced Repetition and Habit Formation. By rewarding *consistent effort over time* rather than just *quest completion*, we encourage "little and often" practice which is superior for long-term memory.

---

## Design Decisions

### "Active time" definition
Active time = time the app tab is **visible** AND the player has had keyboard/click/mousemove activity **within the last 120 seconds**. The `TimeTrackingService` uses:
- `document.addEventListener('visibilitychange')` — pauses the ticker when the tab is hidden, resumes when visible.
- `document.addEventListener('keydown' | 'click' | 'mousemove')` — resets an idle countdown; when it reaches 0 the ticker pauses until the next event.
- A 1-second `setInterval` ticks up the accumulated seconds for today's ISO date (`YYYY-MM-DD`).

Rationale: Page Visibility API is sufficient; finer-grained editor focus tracking adds complexity without clear pedagogical benefit.

### Scope: daily goal only
Weekly goals mentioned in phase3_main.md are deferred. The feature doc ("Goal: X mins/day") is authoritative. Weekly tracking can be layered in a future iteration with no schema changes (the per-day `timeLog` already supports it).

### Achievement strategy: time-based, not completion-based
The existing `streak-7` ("Week Warrior") fires on 7 consecutive quest-completion days and is left untouched. F8 adds two **time-based** achievements that are distinct:

| id | Name | Condition |
|---|---|---|
| `goal-streak-3` | Consistent Coder | Daily time goal met on 3 consecutive calendar days |
| `hours-10` | Seasoned Apprentice | Total accumulated active time ≥ 36,000 seconds (10 hours) |

### "Goal Met" UI
A slim progress bar directly below the XP bar in `QuestPanelComponent`. Shows "Today: Xm / Ym". On goal met: bar fills to 100%, label changes to "Goal Met ✓", bar colour shifts to accent-green. No blocking overlay or toast — it is ambient, not interruptive.

---

## Implementation Details

### `GameState` schema additions (`game-state.models.ts`)

```ts
/** Player's daily active-time goal in minutes. Default: 20. */
dailyGoalMinutes: number;
/** Accumulated active seconds per calendar day. Key = ISO date YYYY-MM-DD. */
timeLog: Record<string, number>;
```

Add to `DEFAULT_GAME_STATE`:
```ts
dailyGoalMinutes: 20,
timeLog: {},
```

`resetProgress()` already spreads `DEFAULT_GAME_STATE`, so `timeLog` and `dailyGoalMinutes` reset automatically — no changes needed to that method.

### `GameStateService` additions

```ts
readonly dailyGoalMinutes = computed(() => this.state().dailyGoalMinutes);
readonly timeLog = computed(() => this.state().timeLog);

setDailyGoal(minutes: number): void { ... persist() }

/** Adds `seconds` to today's entry in timeLog. */
recordActiveTime(seconds: number): void { ... persist() }
```

### `TimeTrackingService` (new)

```
src/app/services/time-tracking.service.ts
```

- `startTracking()` / `stopTracking()` — called from `QuestViewComponent` on init/destroy.
- Internal 1-second `setInterval`; increments `pendingSeconds` counter.
- Every 10 seconds, flushes `pendingSeconds` to `GameStateService.recordActiveTime()` to limit write frequency.
- Exposes `todaySeconds = signal<number>(0)` (computed live from `timeLog` + unflushed pending).
- Exposes `goalMetToday = computed(() => ...)`.

### `AchievementService` additions

Add `goal-streak-3` and `hours-10` to `ACHIEVEMENTS` array. Add `evaluate()` cases:
- `goal-streak-3`: helper checks if the last 3 consecutive calendar days each have `timeLog[date] >= dailyGoalMinutes * 60`.
- `hours-10`: sum all `timeLog` values ≥ 36,000.

`AchievementService.check()` already receives `state` snapshot — `timeLog` and `dailyGoalMinutes` will be available via `state` after the model update.

### `SettingsModal` additions

New section "Learning Goals":
```html
<label>
  Daily goal (minutes)
  <input type="number" min="1" max="480" ... />
</label>
```
Wired to `save()` via `gameState.setDailyGoal()`.

### `QuestPanelComponent` additions

Inject `TimeTrackingService`. When `dailyGoalMinutes === 0` the bar is hidden entirely (`@if (gameState.dailyGoalMinutes() > 0)`). Otherwise add a `<div class="daily-goal-bar">` below the XP bar:
```html
<div class="daily-goal-bar" [class.goal-met]="timeSvc.goalMetToday()">
  <div class="bar-fill" [style.width.%]="goalPercent()"></div>
  <span class="label">{{ goalLabel() }}</span>
</div>
```

---

## Files Changed

- `src/app/models/game-state.models.ts` — add `dailyGoalMinutes`, `timeLog` to interface and defaults
- `src/app/services/game-state.service.ts` — add computed signals + `setDailyGoal()`, `recordActiveTime()`
- `src/app/services/time-tracking.service.ts` — **new** service
- `src/app/services/achievement.service.ts` — add `goal-streak-3`, `hours-10` achievements + evaluate cases
- `src/app/components/settings-modal/settings-modal.component.ts` — add `dailyGoalMinutes` signal + wiring
- `src/app/components/settings-modal/settings-modal.component.html` — add Learning Goals section
- `src/app/components/quest-panel/quest-panel.component.ts` — inject `TimeTrackingService`, add goal helpers
- `src/app/components/quest-panel/quest-panel.component.html` — add daily goal progress bar
- `src/app/components/quest-panel/quest-panel.component.scss` — style the progress bar
- `src/app/components/quest-view/quest-view.component.ts` — call `timeSvc.startTracking()` on init, `stopTracking()` on destroy

---

## Open Questions

- [x] ~~Should `resetProgress()` clear `timeLog` (and lose all time history), or preserve it?~~ **Yes — clear it.** Time data resets with the rest of progress.
- [x] ~~Should the daily goal progress bar be hidden when `dailyGoalMinutes === 0`?~~ **Yes — `0` means "no goal"; the progress bar is hidden.** The number input in Settings must allow `0` as a valid value (disabled state).

---

## Verification Plan

1. **Manual**: Open the app, set daily goal to 1 minute in Settings.
2. **Manual**: Work on a quest for 60 seconds (keep tab visible, move mouse). Verify the progress bar fills to 100% and shows "Goal Met ✓".
3. **Manual**: Refresh the browser. Verify the 60 seconds are still recorded (persisted in `localStorage`).
4. **Manual**: Switch to another browser tab for > 2 minutes. Return. Verify the timer did not accumulate time during the absence.
5. **Manual**: Trigger `goal-streak-3` by meeting the daily goal on 3 consecutive test dates (mock `Date.now` in devtools or Vitest).
6. **Automated (Vitest)**: `time-tracking.service.spec.ts`
   - Timer does not tick when `document.visibilityState === 'hidden'`.
   - Timer pauses after 120 s of no activity events.
   - Timer resumes on next input event.
   - `recordActiveTime()` correctly accumulates seconds in the correct date key.
7. **Automated (Vitest)**: `achievement.service.spec.ts` (extend existing)
   - `goal-streak-3` does not fire for 2 consecutive days.
   - `goal-streak-3` fires for 3 consecutive days.
   - `hours-10` fires when `timeLog` total ≥ 36,000 s.
   - `hours-10` does not fire below threshold.

---

## Back-links

- Phase: [Phase 3 Main](phase3_main.md)
- Decisions: [DECISIONS.md](DECISIONS.md) — see entries tagged with this feature's ID
