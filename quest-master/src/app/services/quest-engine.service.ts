import { Injectable, computed, inject, signal } from '@angular/core';
import { GameStateService } from './game-state.service';
import { ClaudeApiService } from './claude-api.service';
import { Quest, EvaluationResult, QuestTier } from '../models/quest.models';
import { QuestLogEntry } from '../models/game-state.models';
import { STARTER_QUESTS } from '../data/starter-quests';
import { calcLevel } from '../data/xp-table';
import { BRANCH_PROGRESSION } from '../data/branch-progression';

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
    const currentBranch = this.gameState.currentBranch();
    const currentBranchIndex = BRANCH_PROGRESSION.findIndex(s => s.branch === currentBranch);

    return this.allQuests().filter(q => {
      if (!q.prerequisites.every(p => completed.has(p))) return false;
      // Only show quests from branches the player has unlocked.
      const questBranchIndex = BRANCH_PROGRESSION.findIndex(s => s.branch === q.branch);
      if (questBranchIndex === -1) return true; // unknown branch — always show
      return questBranchIndex <= currentBranchIndex;
    });
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

  /** True while a quest is being generated via Claude. */
  readonly questGenerating = signal(false);

  /** True when the last generation attempt failed. */
  readonly questGenerationError = signal(false);

  /** Non-null while the "Branch Unlocked" toast should be shown; holds the new branch name. */
  readonly branchUnlocked = signal<string | null>(null);

  clearBranchUnlocked(): void {
    this.branchUnlocked.set(null);
  }

  /**
   * Incremented by triggerReset() when AppComponent processes a "Reset All Progress" action.
   * QuestViewComponent reacts to this signal to clear editor state and reload quest-zero.
   * Initial value 0 is ignored by the effect (fires only on explicit reset).
   */
  readonly resetEpoch = signal(0);

  private _lastBranch = '';
  private _lastApiKey = '';

  /**
   * Signal a reset to QuestViewComponent. Called by AppComponent.onReset() after
   * resetProgress() and re-initialize(). QuestViewComponent's resetEpoch effect
   * clears editor state and reloads the current quest reactively.
   */
  triggerReset(): void {
    this.resetEpoch.update(n => n + 1);
  }

  /**
   * Auto-select the first available quest on startup if none is set.
   * Call from QuestViewComponent.ngOnInit().
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
   * Returns the branch to use for the next generation call.
   * If the player has completed enough quests in `branch`, advances to the next stage.
   */
  private resolveBranch(branch: string): string {
    const stageIndex = BRANCH_PROGRESSION.findIndex(s => s.branch === branch);
    if (stageIndex === -1) return branch;
    const stage = BRANCH_PROGRESSION[stageIndex];
    if (stage.minQuestsToAdvance === null) return branch; // terminal

    const completedIds = new Set(this.gameState.completedQuests());
    const completedInBranch = this.allQuests().filter(
      q => q.branch === branch && completedIds.has(q.id)
    ).length;

    if (completedInBranch >= stage.minQuestsToAdvance && stageIndex + 1 < BRANCH_PROGRESSION.length) {
      return BRANCH_PROGRESSION[stageIndex + 1].branch;
    }
    return branch;
  }

  /**
   * Generate the next quest via Claude and cache it in the quest bank.
   * Returns the generated quest, or null if generation fails.
   */
  async generateNextQuest(branch: string, apiKey: string): Promise<Quest | null> {
    const targetBranch = this.resolveBranch(branch);
    if (targetBranch !== branch) {
      this.gameState.setCurrentBranch(targetBranch);
      this.branchUnlocked.set(targetBranch);
    }

    this._lastBranch = targetBranch;
    this._lastApiKey = apiKey;
    this.questGenerating.set(true);
    this.questGenerationError.set(false);

    const completedIds = this.gameState.completedQuests();
    const coveredConcepts = this.gameState.coveredConcepts();
    const tier: QuestTier = calcLevel(this.gameState.xp()) >= 13
      ? 'master'
      : calcLevel(this.gameState.xp()) >= 6
        ? 'journeyman'
        : 'apprentice';

    const completedInBranch = this.allQuests().filter(
      q => q.branch === targetBranch && completedIds.includes(q.id)
    ).length;
    const questType: 'standard' | 'prediction' =
      completedInBranch >= 1 && completedInBranch % 4 === 3 ? 'prediction' : 'standard';

    try {
      const quest = await this.claude.generateQuest(completedIds, coveredConcepts, targetBranch, tier, apiKey, questType);
      this.gameState.addToQuestBank(quest);

      // Race-condition recovery: if the player finished the current quest while we were
      // generating (i.e. currentQuestId now points to a completed quest), and the new
      // quest's prerequisites are satisfied, advance automatically.  The effect in
      // AppComponent will then load the quest into the editor reactively.
      const currentId = this.gameState.currentQuestId();
      const completed = this.gameState.completedQuests();
      if (currentId && completed.includes(currentId)) {
        const prereqsMet = quest.prerequisites.every(p => completed.includes(p));
        if (prereqsMet) {
          this.gameState.setCurrentQuest(quest.id);
        }
      }

      this.questGenerating.set(false);
      return quest;
    } catch {
      this.questGenerating.set(false);
      this.questGenerationError.set(true);
      return null;
    }
  }

  /**
   * Discard the current quest and generate a fresh one in the same branch.
   * Increments skipsThisSession; does NOT call recordQuestComplete().
   */
  async skipQuest(): Promise<void> {
    const branch = this.gameState.currentBranch();
    const apiKey = this.gameState.anthropicApiKey();
    this.gameState.incrementSkips();
    const newQuest = await this.generateNextQuest(branch, apiKey);
    if (newQuest) {
      this.gameState.setCurrentQuest(newQuest.id);
    }
  }

  /** Retry the last failed generation attempt. */
  retryGenerate(): void {
    if (this._lastBranch && this._lastApiKey) {
      this.generateNextQuest(this._lastBranch, this._lastApiKey);
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
