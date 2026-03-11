import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { GameStateService } from './game-state.service';

@Injectable({ providedIn: 'root' })
export class TimeTrackingService implements OnDestroy {
  private gameState = inject(GameStateService);

  private readonly IDLE_TIMEOUT_MS = 120_000;
  private readonly FLUSH_INTERVAL_MS = 10_000;

  private _pending = signal(0);
  private _ticker: ReturnType<typeof setInterval> | null = null;
  private _flushTicker: ReturnType<typeof setInterval> | null = null;
  private _lastActivity = Date.now();
  private _isTracking = false;

  /** Live count of today's active seconds (persisted + unflushed pending). */
  readonly todaySeconds = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (this.gameState.timeLog()[today] ?? 0) + this._pending();
  });

  readonly goalMetToday = computed(() => {
    const goal = this.gameState.dailyGoalMinutes();
    if (goal <= 0) return false;
    return this.todaySeconds() >= goal * 60;
  });

  startTracking(): void {
    if (this._isTracking) return;
    this._isTracking = true;
    this._lastActivity = Date.now();
    this._ticker = setInterval(() => this._tick(), 1000);
    this._flushTicker = setInterval(() => this._flush(), this.FLUSH_INTERVAL_MS);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    document.addEventListener('keydown', this._onActivity, { passive: true });
    document.addEventListener('click', this._onActivity, { passive: true });
    document.addEventListener('mousemove', this._onActivity, { passive: true });
  }

  stopTracking(): void {
    if (!this._isTracking) return;
    this._flush();
    this._isTracking = false;
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
    if (this._flushTicker) { clearInterval(this._flushTicker); this._flushTicker = null; }
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    document.removeEventListener('keydown', this._onActivity);
    document.removeEventListener('click', this._onActivity);
    document.removeEventListener('mousemove', this._onActivity);
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }

  private _tick = (): void => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - this._lastActivity > this.IDLE_TIMEOUT_MS) return;
    this._pending.update(n => n + 1);
  };

  private _flush = (): void => {
    const n = this._pending();
    if (n <= 0) return;
    this.gameState.recordActiveTime(n);
    this._pending.set(0);
  };

  private _onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this._lastActivity = Date.now();
    }
  };

  private _onActivity = (): void => {
    this._lastActivity = Date.now();
  };
}
