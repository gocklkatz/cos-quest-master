import { Injectable, computed, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { ClaudeApiService } from './claude-api.service';
import { Quest, EvaluationResult, QuestTier } from '../models/quest.models';
import { QuestLogEntry } from '../models/game-state.models';
import { STARTER_QUESTS } from '../data/starter-quests';
import { calcLevel } from '../data/xp-table';

@Injectable({ providedIn: 'root' })
export class QuestEngineService {
  private gameState = inject(GameStateService);
  private claude = inject(ClaudeApiService);

  /** All known quests: hard-coded starters + any AI-generated ones cached in state. */
  readonly allQuests = computed(() => [
    ...STARTER_QUESTS,
    ...this.gameState.questBank(),
  ]);

  /** Quests whose prerequisites have all been completed (regardless of whether already done). */
  readonly availableQuests = computed(() => {
    const completed = new Set(this.gameState.completedQuests());
    return this.allQuests().filter(q =>
      q.prerequisites.every(p => completed.has(p))
    );
  });

  /** Available quests that haven't been completed yet. */
  readonly activeQuests = computed(() => {
    const completed = new Set(this.gameState.completedQuests());
    return this.availableQuests().filter(q => !completed.has(q.id));
  });

  readonly completedQuestIds = computed(() => this.gameState.completedQuests());

  /** The full Quest object for the currently selected quest. */
  readonly currentQuest = computed(() => {
    const id = this.gameState.currentQuestId();
    return this.allQuests().find(q => q.id === id) ?? null;
  });

  /** Whether the current quest has already been completed. */
  readonly currentQuestCompleted = computed(() => {
    const id = this.gameState.currentQuestId();
    return id ? this.gameState.completedQuests().includes(id) : false;
  });

  /**
   * Auto-select the first available quest on startup if none is set.
   * Call from AppComponent.ngOnInit().
   */
  initialize(): void {
    if (!this.gameState.currentQuestId()) {
      const first = this.activeQuests()[0];
      if (first) this.gameState.setCurrentQuest(first.id);
    }
  }

  /**
   * Evaluate a submission without Claude (fallback / step-3 mode).
   * Passes if IRIS ran without error (and output matches expectedOutput if set).
   */
  evaluateSimple(quest: Quest, output: string, hasError: boolean): EvaluationResult {
    const passed =
      !hasError &&
      (!quest.expectedOutput || output.includes(quest.expectedOutput));

    const xpEarned = passed ? quest.xpReward : 0;

    return {
      passed,
      score: passed ? 80 : 0,
      bonusAchieved: [],
      feedback: passed
        ? `Well done, adventurer! "${quest.title}" is complete. You earned ${xpEarned} XP.`
        : quest.expectedOutput
          ? `The output does not match what was expected. Expected to find: "${quest.expectedOutput}". Check your code and try again.`
          : 'Your code produced an error. Fix it and run again before submitting.',
      codeReview: '',
      xpEarned,
    };
  }

  /**
   * Evaluate a submission using Claude API.
   */
  async evaluateWithClaude(quest: Quest, code: string, output: string, errors: string, apiKey: string): Promise<EvaluationResult> {
    return this.claude.evaluateSubmission(quest, code, output, errors, apiKey);
  }

  /**
   * Generate the next quest via Claude and cache it in the quest bank.
   * Returns the generated quest, or null if generation fails.
   */
  async generateNextQuest(branch: string, apiKey: string): Promise<Quest | null> {
    const completedIds = this.gameState.completedQuests();
    const coveredConcepts = this.gameState.coveredConcepts();
    const tier: QuestTier = calcLevel(this.gameState.xp()) >= 13
      ? 'master'
      : calcLevel(this.gameState.xp()) >= 6
        ? 'journeyman'
        : 'apprentice';

    try {
      const quest = await this.claude.generateQuest(completedIds, coveredConcepts, branch, tier, apiKey);
      this.gameState.addToQuestBank(quest);
      return quest;
    } catch {
      return null;
    }
  }

  /**
   * Record a completed quest in game state and advance to the next quest.
   */
  completeQuest(quest: Quest, code: string, evaluation: EvaluationResult): void {
    const entry: QuestLogEntry = {
      questId: quest.id,
      title: quest.title,
      completedAt: new Date().toISOString(),
      score: evaluation.score,
      xpEarned: evaluation.xpEarned,
      codeSubmitted: code,
      feedback: evaluation.feedback,
    };

    this.gameState.completeQuest(
      quest.id,
      evaluation.xpEarned,
      entry,
      quest.conceptsIntroduced,
      quest.branch,
    );

    // Advance to the next uncompleted quest automatically.
    const next = this.activeQuests().find(q => q.id !== quest.id);
    if (next) {
      this.gameState.setCurrentQuest(next.id);
    }
  }
}
