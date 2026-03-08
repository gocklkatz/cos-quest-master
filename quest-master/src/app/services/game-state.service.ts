import { Injectable, computed, signal } from '@angular/core';
import { GameState, DEFAULT_GAME_STATE, QuestLogEntry } from '../models/game-state.models';
import { IRISConfig } from '../models/iris.models';
import { Quest, normalizeQuest } from '../models/quest.models';
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
  readonly challengeMode = computed(() => this.state().challengeMode);

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

  clearQuestBank(): void {
    this.state.update(s => ({ ...s, questBank: [] }));
    this.persist();
  }

  toggleChallengeMode(): void {
    this.state.update(s => ({ ...s, challengeMode: !s.challengeMode }));
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
        const parsed = JSON.parse(raw);
        // Normalize any questBank entries from the pre-Feature-6 shape.
        if (Array.isArray(parsed.questBank)) {
          parsed.questBank = parsed.questBank.map(normalizeQuest);
        }
        return { ...DEFAULT_GAME_STATE, ...parsed };
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
