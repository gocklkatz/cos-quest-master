import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AchievementService } from './achievement.service';
import { GameStateService } from './game-state.service';
import { DEFAULT_GAME_STATE } from '../models/game-state.models';

function buildMockGameState(overrides: Partial<ReturnType<GameStateService['snapshot']>> = {}) {
  const base = { ...DEFAULT_GAME_STATE, ...overrides };
  return {
    snapshot: signal(base) as unknown as GameStateService['snapshot'],
    unlockAchievement: () => {},
  } as unknown as GameStateService;
}

describe('AchievementService — F8 time-based achievements', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── goal-streak-3 ──────────────────────────────────────

  it('goal-streak-3: does not fire for only 2 consecutive goal days', () => {
    const d1 = '2026-03-09';
    const d2 = '2026-03-10';
    const mock = buildMockGameState({
      dailyGoalMinutes: 20,
      timeLog: { [d1]: 1200, [d2]: 1200 }, // 20 min each
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).not.toContain('goal-streak-3');
  });

  it('goal-streak-3: fires for 3 consecutive goal days', () => {
    const d1 = '2026-03-09';
    const d2 = '2026-03-10';
    const d3 = '2026-03-11';
    const mock = buildMockGameState({
      dailyGoalMinutes: 20,
      timeLog: { [d1]: 1200, [d2]: 1200, [d3]: 1200 },
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).toContain('goal-streak-3');
  });

  it('goal-streak-3: does not fire when 3 days meet goal but are not consecutive', () => {
    const mock = buildMockGameState({
      dailyGoalMinutes: 20,
      timeLog: {
        '2026-03-07': 1200,
        '2026-03-09': 1200,
        '2026-03-11': 1200,
      },
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).not.toContain('goal-streak-3');
  });

  it('goal-streak-3: does not fire when dailyGoalMinutes is 0', () => {
    const mock = buildMockGameState({
      dailyGoalMinutes: 0,
      timeLog: {
        '2026-03-09': 1200,
        '2026-03-10': 1200,
        '2026-03-11': 1200,
      },
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).not.toContain('goal-streak-3');
  });

  // ── hours-10 ───────────────────────────────────────────

  it('hours-10: does not fire below 36 000 seconds total', () => {
    const mock = buildMockGameState({
      timeLog: { '2026-03-11': 35_999 },
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).not.toContain('hours-10');
  });

  it('hours-10: fires at exactly 36 000 seconds total', () => {
    const mock = buildMockGameState({
      timeLog: { '2026-03-10': 18_000, '2026-03-11': 18_000 },
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).toContain('hours-10');
  });

  it('hours-10: fires when total spans multiple days', () => {
    const mock = buildMockGameState({
      timeLog: {
        '2026-03-09': 10_000,
        '2026-03-10': 10_000,
        '2026-03-11': 16_001,
      },
    });
    TestBed.configureTestingModule({
      providers: [AchievementService, { provide: GameStateService, useValue: mock }],
    });
    const svc = TestBed.inject(AchievementService);
    const result = svc.check('some-quest', 50, Date.now(), []);
    expect(result.map(a => a.id)).toContain('hours-10');
  });
});
