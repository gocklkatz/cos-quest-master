import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DifficultyService } from './difficulty.service';
import { GameStateService } from './game-state.service';
import { DifficultyPreference, AdvancedFocus } from '../models/game-state.models';

describe('DifficultyService', () => {
  function buildMockGameState(
    xp: number,
    pref: DifficultyPreference | null,
    focus: AdvancedFocus | null,
  ) {
    return {
      xp: signal(xp),
      difficultyPreference: signal(pref),
      advancedFocus: signal(focus),
    } as unknown as GameStateService;
  }

  async function setup(xp: number, pref: DifficultyPreference | null, focus: AdvancedFocus | null) {
    const mockGameState = buildMockGameState(xp, pref, focus);
    await TestBed.configureTestingModule({
      providers: [
        DifficultyService,
        { provide: GameStateService, useValue: mockGameState },
      ],
    }).compileComponents();
    return TestBed.inject(DifficultyService);
  }

  // ── effectiveTier ────────────────────────────────────────────────────────

  describe('effectiveTier — advanced always master', () => {
    it('advanced + oop at L1 → master', async () => {
      const svc = await setup(0, 'advanced', 'oop');
      expect(svc.effectiveTier()).toBe('master');
    });

    it('advanced + sql at L15 → master', async () => {
      const svc = await setup(5000, 'advanced', 'sql');
      expect(svc.effectiveTier()).toBe('master');
    });
  });

  describe('effectiveTier — intermediate tier floor', () => {
    it('intermediate at L1 → journeyman', async () => {
      const svc = await setup(0, 'intermediate', null);
      expect(svc.effectiveTier()).toBe('journeyman');
    });

    it('intermediate at L12 → journeyman', async () => {
      // L12 requires 3000 XP; L13 requires 3700 XP
      const svc = await setup(3000, 'intermediate', null);
      expect(svc.effectiveTier()).toBe('journeyman');
    });

    it('intermediate at L13 → master', async () => {
      const svc = await setup(3700, 'intermediate', null);
      expect(svc.effectiveTier()).toBe('master');
    });
  });

  describe('effectiveTier — beginner/null standard XP gate', () => {
    it('beginner L1 → apprentice', async () => {
      const svc = await setup(0, 'beginner', null);
      expect(svc.effectiveTier()).toBe('apprentice');
    });

    it('beginner L6 → journeyman', async () => {
      // L6 requires 500 XP
      const svc = await setup(500, 'beginner', null);
      expect(svc.effectiveTier()).toBe('journeyman');
    });

    it('beginner L13 → master', async () => {
      const svc = await setup(3700, 'beginner', null);
      expect(svc.effectiveTier()).toBe('master');
    });

    it('null preference L1 → apprentice (same as beginner)', async () => {
      const svc = await setup(0, null, null);
      expect(svc.effectiveTier()).toBe('apprentice');
    });

    it('null preference L6 → journeyman', async () => {
      const svc = await setup(500, null, null);
      expect(svc.effectiveTier()).toBe('journeyman');
    });

    it('null preference L13 → master', async () => {
      const svc = await setup(3700, null, null);
      expect(svc.effectiveTier()).toBe('master');
    });
  });

  // ── initialSubBranch ─────────────────────────────────────────────────────

  describe('initialSubBranch', () => {
    it('advanced + oop → classes-methods', async () => {
      const svc = await setup(0, 'advanced', 'oop');
      expect(svc.initialSubBranch()).toBe('classes-methods');
    });

    it('advanced + sql → sql-queries', async () => {
      const svc = await setup(0, 'advanced', 'sql');
      expect(svc.initialSubBranch()).toBe('sql-queries');
    });

    it('intermediate → classes-properties', async () => {
      const svc = await setup(0, 'intermediate', null);
      expect(svc.initialSubBranch()).toBe('classes-properties');
    });

    it('beginner → setup', async () => {
      const svc = await setup(0, 'beginner', null);
      expect(svc.initialSubBranch()).toBe('setup');
    });

    it('null → setup', async () => {
      const svc = await setup(0, null, null);
      expect(svc.initialSubBranch()).toBe('setup');
    });
  });
});
