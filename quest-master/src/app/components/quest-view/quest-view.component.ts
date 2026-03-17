import { Component, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { OutputPanelComponent } from '../output-panel/output-panel.component';
import { QuestPanelComponent } from '../quest-panel/quest-panel.component';
import { XpAnimationComponent } from '../xp-animation/xp-animation.component';
import { AchievementOverlayComponent } from '../achievement-overlay/achievement-overlay.component';
import { AiPairChatComponent } from '../ai-pair-chat/ai-pair-chat.component';
import { ReviewModalComponent } from '../review-modal/review-modal.component';
import { VictoryOverlayComponent } from '../victory-overlay/victory-overlay.component';
import { GameStateService } from '../../services/game-state.service';
import { QuestEngineService } from '../../services/quest-engine.service';
import { ClassQuestService } from '../../services/class-quest.service';
import { AiPairService } from '../../services/ai-pair.service';
import { PaneSizeService } from '../../services/pane-size.service';
import { AchievementService } from '../../services/achievement.service';
import { UiEventService } from '../../services/ui-event.service';
import { GlobalService } from '../../services/global.service';
import { TimeTrackingService } from '../../services/time-tracking.service';
import { ResizableDividerDirective } from '../../directives/resizable-divider.directive';
import { Achievement } from '../../models/achievement.models';
import { CompileError, EvaluationResult, QuestFile } from '../../models/quest.models';
import { ClaudeApiError } from '../../services/claude-api.service';

@Component({
  selector: 'app-quest-view',
  standalone: true,
  imports: [
    CodeEditorComponent,
    OutputPanelComponent,
    QuestPanelComponent,
    XpAnimationComponent,
    AchievementOverlayComponent,
    AiPairChatComponent,
    ResizableDividerDirective,
    ReviewModalComponent,
    VictoryOverlayComponent,
  ],
  templateUrl: './quest-view.component.html',
  styleUrl: './quest-view.component.scss',
})
export class QuestViewComponent implements OnInit, OnDestroy {
  protected gameState = inject(GameStateService);
  private classQuest = inject(ClassQuestService);
  private aiPair = inject(AiPairService);
  private paneSizes = inject(PaneSizeService);
  private achievementSvc = inject(AchievementService);
  protected uiEvents = inject(UiEventService);
  readonly questEngine = inject(QuestEngineService);
  private globalService = inject(GlobalService);
  private timeSvc = inject(TimeTrackingService);

  showChat = signal(false);

  /** Resizable pane sizes (px), persisted in localStorage. */
  sidebarWidth = signal(this.paneSizes.get('sidebar'));
  outputHeight = signal(this.paneSizes.get('editorOutput'));
  chatHeight = signal(this.paneSizes.get('outputChat'));

  /** True when an Anthropic API key is configured. */
  readonly hasApiKey = computed(() => !!this.gameState.anthropicApiKey());
  readonly anthropicApiKey = computed(() => this.gameState.anthropicApiKey());
  readonly challengeMode = computed(() => this.gameState.challengeMode());

  /** True when the current quest is a prediction (read-only multiple-choice) quest. */
  readonly isPredictionQuest = computed(() =>
    this.questEngine.currentQuest()?.questType === 'prediction'
  );

  /** Current code in the active file tab. */
  editorCode = signal('// Write your ObjectScript here\nWRITE "Hello from IRIS!", !');

  /** Files for the current quest — drives the file tabs in the editor toolbar. */
  questFiles = signal<QuestFile[]>([]);

  /** ID of the currently active file tab. */
  activeFileId = signal<string>('');

  /** Per-file code buffers so switching tabs preserves each tab's content. */
  private fileCodeBuffers = new Map<string, string>();

  /** Execution state. */
  output = signal<string | null>(null);
  error = signal<string | null>(null);
  compileErrors = signal<CompileError[]>([]);
  isRunning = signal(false);

  /** True while Claude is evaluating a submission. */
  isEvaluating = signal(false);

  /** Last evaluation result (cleared when code is run again). */
  evaluation = signal<EvaluationResult | null>(null);

  /** Set when Claude evaluation failed and simple evaluator was used instead. Cleared on run or quest load. */
  evaluationWarning = signal<string | null>(null);

  /** Evaluation result waiting for the player to read it in the review modal. */
  reviewEvaluation = signal<EvaluationResult | null>(null);

  /** Next-quest loading logic deferred until the review modal is dismissed. */
  private pendingNextQuest: (() => void) | null = null;

  /** Quest type of the most recently completed quest — stored before the review modal opens. */
  private _lastCompletedQuestType: 'standard' | 'prediction' = 'standard';

  /** True when the post-prediction continuation choice should be shown. */
  showContinuationChoice = signal(false);

  /** XP animation trigger — increment to fire a new animation. */
  xpAnimTrigger = signal(0);
  xpAnimAmount = signal(0);
  xpAnimLeveledUp = signal(false);
  xpAnimNewLevel = signal(1);

  /** Achievement overlay — drives the achievement-overlay component. */
  achievementAnimTrigger = signal(0);
  achievementAnimItem = signal<Achievement | null>(null);

  /** Victory overlay — fires when all capstone quests are completed. */
  victoryTrigger = signal(0);
  victoryLevel   = signal(1);
  victoryXp      = signal(0);

  /** Timestamp (ms) when the current quest was loaded — used for the speed-run check. */
  private questStartedAt = 0;

  /**
   * ID of the last quest whose code was loaded into the editor.
   * Used to guard against double-loading when both the manual call and the reactive
   * effect would fire for the same quest.
   */
  private lastLoadedQuestId: string | null = null;

  /** Whether any hint was revealed for the current quest — used for the no-hints check. */
  hintsShownForCurrentQuest = signal(false);

  onSidebarResize(px: number): void {
    this.sidebarWidth.set(px);
    this.paneSizes.set('sidebar', px);
  }

  onOutputResize(px: number): void {
    this.outputHeight.set(px);
    this.paneSizes.set('editorOutput', px);
  }

  onChatResize(px: number): void {
    this.chatHeight.set(px);
    this.paneSizes.set('outputChat', px);
  }

  constructor() {
    /**
     * React to unexpected current-quest changes — e.g. when background generation
     * completes and auto-advances currentQuestId after the player finished quest-zero
     * before the AI response arrived (race condition).
     *
     * Manual code paths (ngOnInit, submitCode, onQuestSelected, resetEpoch effect)
     * update lastLoadedQuestId before calling loadQuestCode, so the guard skips them.
     */
    effect(() => {
      const quest = this.questEngine.currentQuest();
      if (quest && quest.id !== this.lastLoadedQuestId) {
        untracked(() => {
          this.lastLoadedQuestId = quest.id;
          this.loadQuestCode(quest);
          this.output.set(null);
          this.error.set(null);
          this.compileErrors.set([]);
          this.evaluation.set(null);
          this.evaluationWarning.set(null);
          this.aiPair.loadForQuest(quest.id);
        });
      }
    });

    /**
     * React to explicit resets triggered by AppComponent.onReset() via
     * QuestEngineService.triggerReset(). Clears editor state and reloads
     * the current quest (quest-zero after a progress reset).
     * Epoch 0 is the signal's initial value — skip it to avoid firing on startup.
     */
    effect(() => {
      const epoch = this.questEngine.resetEpoch();
      if (epoch === 0) return;
      untracked(() => {
        this.output.set(null);
        this.error.set(null);
        this.compileErrors.set([]);
        this.evaluation.set(null);
        this.evaluationWarning.set(null);
        const quest = this.questEngine.currentQuest();
        if (quest) {
          this.lastLoadedQuestId = quest.id;
          this.loadQuestCode(quest);
          this.aiPair.loadForQuest(quest.id);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.timeSvc.stopTracking();
    // Preserve editor state so navigating to Tree Visualizer and back doesn't lose code.
    const questId = this.questEngine.currentQuest()?.id;
    if (questId) {
      this.questEngine.savedEditorState = {
        questId,
        activeFileId: this.activeFileId(),
        editorCode: this.editorCode(),
        fileCodeBuffers: new Map(this.fileCodeBuffers),
      };
    }
  }

  ngOnInit(): void {
    this.timeSvc.startTracking();
    this.questEngine.initialize();

    const initial = this.questEngine.currentQuest();
    if (initial) {
      this.lastLoadedQuestId = initial.id;
      const saved = this.questEngine.savedEditorState;
      if (saved && saved.questId === initial.id) {
        // Restore code the user was working on before navigating away.
        this.questFiles.set(initial.files ?? []);
        this.activeFileId.set(saved.activeFileId);
        this.editorCode.set(saved.editorCode);
        this.fileCodeBuffers.clear();
        saved.fileCodeBuffers.forEach((v, k) => this.fileCodeBuffers.set(k, v));
      } else {
        this.loadQuestCode(initial);
      }
      this.aiPair.loadForQuest(initial.id);
    }
  }

  toggleChat(): void {
    this.showChat.update(v => !v);
  }

  onCopyToEditor(code: string): void {
    this.editorCode.set(code);
  }

  onToggleChallengeMode(): void {
    this.gameState.toggleChallengeMode();
    // Does not reset current editor content — takes effect on next quest load.
  }

  onRestoreStarterCode(): void {
    const file = this.questFiles().find(f => f.id === this.activeFileId());
    if (file?.starterCode) {
      this.editorCode.set(file.starterCode);
    }
  }

  onHintRevealed(): void {
    this.hintsShownForCurrentQuest.set(true);
  }

  /** Load a quest's files into the editor, respecting challenge mode. */
  private loadQuestCode(quest: { files: QuestFile[]; questType?: string }): void {
    this.questStartedAt = Date.now();
    this.hintsShownForCurrentQuest.set(false);
    this.fileCodeBuffers.clear();
    const files = quest.files ?? [];
    this.questFiles.set(files);
    const firstFile = files[0] ?? null;
    this.activeFileId.set(firstFile?.id ?? '');
    // Prediction quests always show the full code — it is the question itself.
    const useChallengeMode = this.gameState.challengeMode() && quest.questType !== 'prediction';
    this.editorCode.set(
      firstFile
        ? (useChallengeMode
            ? (firstFile.starterCodeHint ?? '')
            : (firstFile.starterCode ?? ''))
        : '',
    );
    // Pre-populate buffers for non-active files.
    for (const file of files.slice(1)) {
      this.fileCodeBuffers.set(
        file.id,
        useChallengeMode
          ? (file.starterCodeHint ?? '')
          : (file.starterCode ?? ''),
      );
    }
  }

  onFileSelected(fileId: string): void {
    // Save current editor state into the outgoing file's buffer.
    this.fileCodeBuffers.set(this.activeFileId(), this.editorCode());
    this.activeFileId.set(fileId);
    // Restore the incoming file's buffer (or its starter code as fallback).
    const saved = this.fileCodeBuffers.get(fileId);
    if (saved !== undefined) {
      this.editorCode.set(saved);
    } else {
      const file = this.questFiles().find(f => f.id === fileId);
      this.editorCode.set(
        file
          ? (this.gameState.challengeMode()
              ? (file.starterCodeHint ?? '')
              : (file.starterCode ?? ''))
          : '',
      );
    }
  }

  /** Collect current code for all files into a map (active file from editorCode signal). */
  private collectFileCode(): Map<string, string> {
    const map = new Map(this.fileCodeBuffers);
    map.set(this.activeFileId(), this.editorCode());
    return map;
  }

  runCode(): void {
    if (this.isRunning()) return;

    const files = this.questFiles();
    const fileCodeMap = this.collectFileCode();
    const hasAnyCode = files.some(f => (fileCodeMap.get(f.id) ?? '').trim());
    if (!hasAnyCode) return;

    this.isRunning.set(true);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);
    this.evaluationWarning.set(null);

    this.runAllFiles(files, fileCodeMap);
  }

  private async runAllFiles(files: QuestFile[], fileCodeMap: Map<string, string>): Promise<void> {
    const quest = this.questEngine.currentQuest();
    try {
      const result = await this.classQuest.runQuestFiles(
        this.gameState.irisConfig(),
        files,
        fileCodeMap,
        quest?.testHarness,
      );
      this.isRunning.set(false);
      if (result.hasErrors) {
        if (result.errorKind === 'compile') {
          this.compileErrors.set(result.errors);
          this.error.set(null);
        } else {
          this.compileErrors.set([]);
          this.error.set(result.errors[0]?.text ?? 'Unknown error');
        }
        this.output.set(null);
      } else {
        this.compileErrors.set([]);
        this.output.set(result.output);
        this.error.set(null);
        this.globalService.refresh();
      }
    } catch (e: any) {
      this.isRunning.set(false);
      this.error.set(e?.message ?? 'Unexpected error');
    }
  }

  async submitCode(): Promise<void> {
    const quest = this.questEngine.currentQuest();
    if (!quest || this.questEngine.currentQuestCompleted() || this.isEvaluating()) return;

    const hasOutput = this.output() !== null || this.error() !== null || this.compileErrors().length > 0;
    if (!hasOutput) {
      this.error.set('Run your code first, then submit.');
      return;
    }

    let result: EvaluationResult;
    const apiKey = this.gameState.anthropicApiKey();

    const effectiveOutput = this.compileErrors().length > 0
      ? this.compileErrors().map(e => e.line > 0 ? `Line ${e.line}:${e.col} ${e.text}` : e.text).join('\n')
      : (this.output() ?? '');
    const effectiveError = this.compileErrors().length > 0
      ? 'Compile failed'
      : (this.error() ?? '');

    // Collect all files' code for the submission (for Claude evaluation context).
    const fileCodeMap = this.collectFileCode();
    const allCode = this.questFiles()
      .map(f => {
        const code = fileCodeMap.get(f.id) ?? '';
        return this.questFiles().length > 1 ? `// --- ${f.label} (${f.filename}) ---\n${code}` : code;
      })
      .join('\n\n');

    if (apiKey) {
      this.isEvaluating.set(true);
      try {
        result = await this.questEngine.evaluateWithClaude(
          quest,
          allCode,
          effectiveOutput,
          effectiveError,
          apiKey,
        );
      } catch (e) {
        result = this.questEngine.evaluateSimple(quest, effectiveOutput, effectiveError !== '');
        this.evaluationWarning.set(e instanceof ClaudeApiError ? e.message : 'AI evaluation unavailable — result is based on output matching only.');
      } finally {
        this.isEvaluating.set(false);
      }
    } else {
      result = this.questEngine.evaluateSimple(quest, effectiveOutput, effectiveError !== '');
    }

    this.evaluation.set(result);

    if (result.passed) {
      const levelBefore = this.gameState.level();
      this.questEngine.completeQuest(quest, allCode, result);
      const levelAfter = this.gameState.level();

      this.gameState.updateNoHintsStreak(this.hintsShownForCurrentQuest());

      this.xpAnimAmount.set(result.xpEarned);
      this.xpAnimLeveledUp.set(levelAfter > levelBefore);
      this.xpAnimNewLevel.set(levelAfter);
      this.xpAnimTrigger.update(n => n + 1);

      const newAchievements = this.achievementSvc.check(
        quest.id,
        result.score,
        this.questStartedAt,
        this.questEngine.allQuests(),
      );
      this.showAchievements(newAchievements);

      // Capture next-quest loading as a deferred closure — executed only after
      // the player dismisses the review modal via onReviewConfirmed().
      const next = this.questEngine.currentQuest();
      if (next && next.id !== quest.id) {
        this.pendingNextQuest = () => {
          this.lastLoadedQuestId = next.id;
          this.classQuest.cleanupLastClass(this.gameState.irisConfig());
          this.loadQuestCode(next);
          this.output.set(null);
          this.error.set(null);
          this.compileErrors.set([]);
          this.evaluationWarning.set(null);
          this.aiPair.loadForQuest(next.id);
        };
      }

      if (apiKey && this.questEngine.needsQuestGeneration()) {
        this.questEngine.generateNextQuest(quest.branch, apiKey);
      }
    }

    // Track quest type before showing review modal (currentQuest may advance after completeQuest).
    this._lastCompletedQuestType = quest.questType ?? 'standard';

    // Show review modal for every result (pass and fail).
    this.reviewEvaluation.set(result);
  }

  onPredictionSubmitted(choice: string): void {
    const quest = this.questEngine.currentQuest();
    if (!quest || this.questEngine.currentQuestCompleted()) return;

    const isCorrect = choice === quest.correctAnswer;
    const result: EvaluationResult = {
      passed: isCorrect,
      score: isCorrect ? 100 : 0,
      bonusAchieved: [],
      feedback: isCorrect
        ? 'Correct prediction! Your mental model is sharp.'
        : `Not quite — the correct answer was: ${quest.correctAnswer}`,
      codeReview: quest.evaluationCriteria,
      xpEarned: isCorrect ? quest.xpReward : 0,
    };

    this.evaluation.set(result);

    if (result.passed) {
      const levelBefore = this.gameState.level();
      this.questEngine.completeQuest(quest, '', result);
      const levelAfter = this.gameState.level();

      this.gameState.updateNoHintsStreak(this.hintsShownForCurrentQuest());

      this.xpAnimAmount.set(result.xpEarned);
      this.xpAnimLeveledUp.set(levelAfter > levelBefore);
      this.xpAnimNewLevel.set(levelAfter);
      this.xpAnimTrigger.update(n => n + 1);

      const newAchievements = this.achievementSvc.check(
        quest.id,
        result.score,
        this.questStartedAt,
        this.questEngine.allQuests(),
      );
      this.showAchievements(newAchievements);

      const next = this.questEngine.currentQuest();
      if (next && next.id !== quest.id) {
        this.pendingNextQuest = () => {
          this.lastLoadedQuestId = next.id;
          this.classQuest.cleanupLastClass(this.gameState.irisConfig());
          this.loadQuestCode(next);
          this.output.set(null);
          this.error.set(null);
          this.compileErrors.set([]);
          this.evaluationWarning.set(null);
          this.aiPair.loadForQuest(next.id);
        };
      }

      const apiKey = this.gameState.anthropicApiKey();
      if (apiKey && this.questEngine.needsQuestGeneration()) {
        this.questEngine.generateNextQuest(quest.branch, apiKey);
      }
    }

    // Track quest type before showing review modal (currentQuest may advance after completeQuest).
    this._lastCompletedQuestType = quest.questType ?? 'standard';

    this.reviewEvaluation.set(result);
  }

  onReviewConfirmed(): void {
    this.reviewEvaluation.set(null);

    // After a prediction quest, show the continuation choice (unless it was post-failure triggered).
    const wasPrediction = this._lastCompletedQuestType === 'prediction';
    if (wasPrediction && !this.questEngine.lastPredictionWasPostFailure()) {
      this.showContinuationChoice.set(true);
      return;
    }

    if (this.pendingNextQuest) {
      this.pendingNextQuest();
      this.pendingNextQuest = null;
    }
    if (this.questEngine.gameComplete()) {
      this.victoryLevel.set(this.gameState.level());
      this.victoryXp.set(this.gameState.xp());
      this.victoryTrigger.update(n => n + 1);
    }
  }

  onContinuationChoice(type: 'writing' | 'prediction'): void {
    this.showContinuationChoice.set(false);
    const forceType: 'standard' | 'prediction' = type === 'prediction' ? 'prediction' : 'standard';

    if (this.pendingNextQuest) {
      this.pendingNextQuest();
      this.pendingNextQuest = null;
    }

    const apiKey = this.gameState.anthropicApiKey();
    const branch = this.gameState.currentBranch();
    if (apiKey) {
      this.questEngine.generateNextQuest(branch, apiKey, forceType);
    }

    if (this.questEngine.gameComplete()) {
      this.victoryLevel.set(this.gameState.level());
      this.victoryXp.set(this.gameState.xp());
      this.victoryTrigger.update(n => n + 1);
    }
  }

  /** Show unlocked achievements sequentially, each after a 3.5 s gap. */
  private showAchievements(achievements: Achievement[]): void {
    achievements.forEach((ach, index) => {
      setTimeout(() => {
        this.achievementAnimItem.set(ach);
        this.achievementAnimTrigger.update(n => n + 1);
      }, index * 4000);
    });
  }

  onQuestSelected(questId: string): void {
    this.classQuest.cleanupLastClass(this.gameState.irisConfig());
    this.lastLoadedQuestId = questId;
    this.gameState.setCurrentQuest(questId);
    const q = this.questEngine.allQuests().find(q => q.id === questId);
    if (q) this.loadQuestCode(q);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);
    this.evaluationWarning.set(null);
    this.aiPair.loadForQuest(questId);
  }
}
