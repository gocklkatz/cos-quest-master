import { Injectable, inject } from '@angular/core';
import { Achievement } from '../models/achievement.models';
import { QuestLogEntry } from '../models/game-state.models';
import { Quest } from '../models/quest.models';
import { GameStateService } from './game-state.service';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-quest',
    name: 'Anvil Forged',
    description: 'Complete Quest Zero',
    icon: '⚒️',
    rarity: 'common',
    xpBonus: 50,
  },
  {
    id: 'perfect-score',
    name: 'Flawless',
    description: 'Score 100 on any quest',
    icon: '💎',
    rarity: 'rare',
    xpBonus: 100,
  },
  {
    id: 'speed-run',
    name: 'The Flash',
    description: 'Submit within 60 seconds of starting a quest',
    icon: '⚡',
    rarity: 'rare',
    xpBonus: 100,
  },
  {
    id: 'no-hints',
    name: 'Unaided',
    description: 'Complete 5 quests without revealing any hints',
    icon: '🦅',
    rarity: 'epic',
    xpBonus: 200,
  },
  {
    id: 'all-branches',
    name: 'Polymath',
    description: 'Complete at least one quest in every branch',
    icon: '🌿',
    rarity: 'epic',
    xpBonus: 200,
  },
  {
    id: 'capstone',
    name: 'Guild Master',
    description: 'Complete the Capstone Project',
    icon: '👑',
    rarity: 'legendary',
    xpBonus: 500,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Complete at least one quest for 7 days in a row',
    icon: '🗓️',
    rarity: 'rare',
    xpBonus: 150,
  },
  {
    id: 'goal-streak-3',
    name: 'Consistent Coder',
    description: 'Meet your daily time goal 3 days in a row',
    icon: '🔥',
    rarity: 'rare',
    xpBonus: 150,
  },
  {
    id: 'hours-10',
    name: 'Seasoned Apprentice',
    description: 'Accumulate 10 hours of active coding',
    icon: '⏳',
    rarity: 'epic',
    xpBonus: 300,
  },
];

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private gameState = inject(GameStateService);

  readonly achievements = ACHIEVEMENTS;

  /**
   * Check all achievement conditions against the current game state and unlock
   * any that are newly met. Returns the list of newly-unlocked achievements.
   *
   * Call this after `gameState.completeQuest()` and `gameState.updateNoHintsStreak()`.
   */
  check(
    justCompletedQuestId: string,
    score: number,
    questStartedAt: number,
    allQuests: Quest[],
  ): Achievement[] {
    const state = this.gameState.snapshot();
    const alreadyUnlocked = state.unlockedAchievements;
    const newlyUnlocked: Achievement[] = [];

    for (const ach of ACHIEVEMENTS) {
      if (alreadyUnlocked.includes(ach.id)) continue;
      if (this.evaluate(ach.id, state, justCompletedQuestId, score, questStartedAt, allQuests)) {
        this.gameState.unlockAchievement(ach.id, ach.xpBonus);
        newlyUnlocked.push(ach);
      }
    }

    return newlyUnlocked;
  }

  private evaluate(
    id: string,
    state: ReturnType<GameStateService['snapshot']>,
    justCompletedQuestId: string,
    score: number,
    questStartedAt: number,
    allQuests: Quest[],
  ): boolean {
    switch (id) {
      case 'first-quest':
        return justCompletedQuestId === 'quest-zero';

      case 'perfect-score':
        return score === 100;

      case 'speed-run':
        return Date.now() - questStartedAt <= 60_000;

      case 'no-hints':
        return state.noHintsStreak >= 5;

      case 'all-branches': {
        const branches = [...new Set(allQuests.map(q => q.branch))];
        return (
          branches.length > 0 &&
          branches.every(branch =>
            allQuests
              .filter(q => q.branch === branch)
              .some(q => state.completedQuests.includes(q.id)),
          )
        );
      }

      case 'capstone':
        return justCompletedQuestId === 'capstone';

      case 'streak-7':
        return this.hasSevenDayStreak(state.questLog);

      case 'goal-streak-3':
        return this.hasGoalStreak(state.timeLog, state.dailyGoalMinutes, 3);

      case 'hours-10': {
        const total = Object.values(state.timeLog).reduce((sum, s) => sum + s, 0);
        return total >= 36_000;
      }

      default:
        return false;
    }
  }

  private hasGoalStreak(timeLog: Record<string, number>, goalMinutes: number, required: number): boolean {
    if (goalMinutes <= 0) return false;
    const goalSeconds = goalMinutes * 60;
    const days = Object.entries(timeLog)
      .filter(([, seconds]) => seconds >= goalSeconds)
      .map(([date]) => date)
      .sort();
    if (days.length < required) return false;
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
      if (diffDays === 1) {
        streak++;
        if (streak >= required) return true;
      } else {
        streak = 1;
      }
    }
    return false;
  }

  private hasSevenDayStreak(questLog: QuestLogEntry[]): boolean {
    if (questLog.length < 7) return false;
    const days = [...new Set(questLog.map(e => e.completedAt.slice(0, 10)))].sort();
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
      if (diffDays === 1) {
        streak++;
        if (streak >= 7) return true;
      } else {
        streak = 1;
      }
    }
    return false;
  }
}
