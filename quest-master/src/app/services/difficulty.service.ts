import { Injectable, computed, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { QuestTier } from '../models/quest.models';
import { calcLevel } from '../data/xp-table';

@Injectable({ providedIn: 'root' })
export class DifficultyService {
  private gameState = inject(GameStateService);

  /**
   * The effective quest complexity tier, merging player preference with XP level.
   * Replaces the TODO(F18)-tagged inline calculation in QuestEngineService.
   */
  readonly effectiveTier = computed((): QuestTier => {
    const pref = this.gameState.difficultyPreference();
    const level = calcLevel(this.gameState.xp());

    if (pref === 'advanced') return 'master';
    if (pref === 'intermediate') return level >= 13 ? 'master' : 'journeyman';
    // beginner or null — standard XP gate
    if (level >= 13) return 'master';
    if (level >= 6) return 'journeyman';
    return 'apprentice';
  });

  /**
   * The sub-branch the player should start in, based on their difficulty preference.
   * Only meaningful at first-session initialisation or after Reset All Progress.
   */
  readonly initialSubBranch = computed((): string => {
    const pref = this.gameState.difficultyPreference();
    const focus = this.gameState.advancedFocus();

    if (pref === 'advanced') {
      return focus === 'sql' ? 'sql-queries' : 'classes-methods';
    }
    if (pref === 'intermediate') return 'classes-properties';
    return 'setup';
  });
}
