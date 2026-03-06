import { Injectable, computed, signal } from '@angular/core';
import { GameState, DEFAULT_GAME_STATE, QuestLogEntry } from '../models/game-state.models';
import { IRISConfig } from '../models/iris.models';
import { Quest } from '../models/quest.models';
import { calcLevel } from '../data/xp-table';

const STORAGE_KEY = 'questmaster';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private state = signal<GameState>(this.loadFromStorage());

  readonly playerName = computed(() => this.state().playerName);
  readonly xp = computed(() => this.state().xp);
  readonly level = computed(() => this.state().level);
  readonly completedQuests = computed(() => this.state().completedQuests);
  readonly currentQuestId = computed(() => this.state().currentQuestId);
  readonly coveredConcepts = computed(() => this.state().coveredConcepts);
  readonly irisConfig = computed(() => this.state().irisConfig);
  readonly anthropicApiKey = computed(() => this.state().anthropicApiKey);
  readonly questLog = computed(() => this.state().questLog);
  readonly questBank = computed(() => this.state().questBank);
  readonly unlockedBranches = computed(() => this.state().unlockedBranches);

  updateSettings(irisConfig: IRISConfig, anthropicApiKey: string, playerName?: string): void {
    this.state.update(s => ({
      ...s,
      irisConfig,
      anthropicApiKey,
      playerName: playerName ?? s.playerName,
    }));
    this.persist();
  }

  completeQuest(
    questId: string,
    xpEarned: number,
    entry: QuestLogEntry,
    newConcepts: string[] = [],
    branch?: string,
  ): void {
    this.state.update(s => {
      const newXp = s.xp + xpEarned;
      const coveredConcepts = [...new Set([...s.coveredConcepts, ...newConcepts])];
      const unlockedBranches = branch
        ? [...new Set([...s.unlockedBranches, branch])]
        : s.unlockedBranches;
      return {
        ...s,
        xp: newXp,
        level: calcLevel(newXp),
        completedQuests: [...new Set([...s.completedQuests, questId])],
        questLog: [...s.questLog, entry],
        coveredConcepts,
        unlockedBranches,
      };
    });
    this.persist();
  }

  setCurrentQuest(questId: string): void {
    this.state.update(s => ({ ...s, currentQuestId: questId }));
    this.persist();
  }

  addToQuestBank(quest: Quest): void {
    this.state.update(s => ({
      ...s,
      questBank: [...s.questBank.filter(q => q.id !== quest.id), quest],
    }));
    this.persist();
  }

  resetProgress(): void {
    this.state.set({ ...DEFAULT_GAME_STATE, irisConfig: this.state().irisConfig, anthropicApiKey: this.state().anthropicApiKey });
    this.persist();
  }

  private loadFromStorage(): GameState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_GAME_STATE, ...JSON.parse(raw) };
      }
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULT_GAME_STATE };
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }
}
