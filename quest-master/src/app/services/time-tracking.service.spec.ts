import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeTrackingService } from './time-tracking.service';
import { GameStateService } from './game-state.service';

function buildMockGameState(goalMinutes = 20, timeLogInit: Record<string, number> = {}) {
  const timeLog = signal<Record<string, number>>(timeLogInit);
  const dailyGoalMinutes = signal(goalMinutes);
  return {
    timeLog,
    dailyGoalMinutes,
    recordActiveTime: vi.fn((s: number) => {
      const today = new Date().toISOString().slice(0, 10);
      timeLog.update(log => ({ ...log, [today]: (log[today] ?? 0) + s }));
    }),
  } as unknown as GameStateService;
}

describe('TimeTrackingService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    TestBed.resetTestingModule();
  });

  function setup(goalMinutes = 20, timeLogInit: Record<string, number> = {}) {
    const mock = buildMockGameState(goalMinutes, timeLogInit);
    TestBed.configureTestingModule({
      providers: [TimeTrackingService, { provide: GameStateService, useValue: mock }],
    });
    return { svc: TestBed.inject(TimeTrackingService), mock };
  }

  it('todaySeconds reflects persisted + pending time', () => {
    const today = new Date().toISOString().slice(0, 10);
    const { svc } = setup(20, { [today]: 30 });
    svc.startTracking();

    vi.advanceTimersByTime(3000); // 3 ticks

    expect(svc.todaySeconds()).toBe(33); // 30 persisted + 3 pending
    svc.stopTracking();
  });

  it('does not tick while document is hidden', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    const { svc } = setup();
    svc.startTracking();

    vi.advanceTimersByTime(5000);

    expect(svc.todaySeconds()).toBe(0);
    svc.stopTracking();
  });

  it('stops ticking after IDLE_TIMEOUT_MS of inactivity', () => {
    const { svc } = setup();
    svc.startTracking();

    // Advance 122 s without any activity events.
    // Ticks are allowed up to and including the 120th second (Date.now() - lastActivity === 120 000).
    // At 120 001 ms the check fires and no more pending increments occur.
    vi.advanceTimersByTime(122_000);

    expect(svc.todaySeconds()).toBe(120);
    svc.stopTracking();
  });

  it('resumes ticking after visibilitychange to visible', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    const { svc } = setup();
    svc.startTracking();
    vi.advanceTimersByTime(2000); // hidden — no ticks

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3000); // now visible — 3 ticks

    expect(svc.todaySeconds()).toBe(3);
    svc.stopTracking();
  });

  it('flushes pending seconds to GameStateService on stopTracking', () => {
    const { svc, mock } = setup();
    svc.startTracking();
    vi.advanceTimersByTime(5000);
    svc.stopTracking();

    expect(mock.recordActiveTime).toHaveBeenCalled();
    const calls: number[][] = (mock.recordActiveTime as ReturnType<typeof vi.fn>).mock.calls;
    const total = calls.reduce((sum, args) => sum + (args[0] as number), 0);
    expect(total).toBe(5);
  });

  it('goalMetToday is false when goal is 0 (disabled)', () => {
    const { svc } = setup(0);
    svc.startTracking();
    vi.advanceTimersByTime(3_600_000);
    expect(svc.goalMetToday()).toBe(false);
    svc.stopTracking();
  });

  it('goalMetToday becomes true when accumulated time meets goal', () => {
    const { svc } = setup(1); // 1 minute = 60 s
    svc.startTracking();
    vi.advanceTimersByTime(60_000); // 60 ticks
    expect(svc.goalMetToday()).toBe(true);
    svc.stopTracking();
  });
});
