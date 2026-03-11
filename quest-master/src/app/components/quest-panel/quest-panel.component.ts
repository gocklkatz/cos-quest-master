import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Quest, EvaluationResult } from '../../models/quest.models';
import { QuestEngineService } from '../../services/quest-engine.service';
import { GameStateService } from '../../services/game-state.service';
import { TimeTrackingService } from '../../services/time-tracking.service';
import { xpForNextLevel, levelProgress, MAX_LEVEL } from '../../data/xp-table';
import { BRANCH_DISPLAY_NAMES } from '../../data/branch-progression';

@Component({
  selector: 'app-quest-panel',
  standalone: true,
  imports: [],
  templateUrl: './quest-panel.component.html',
  styleUrl: './quest-panel.component.scss',
})
export class QuestPanelComponent {
  private questEngine = inject(QuestEngineService);
  readonly gameState = inject(GameStateService);
  private timeSvc = inject(TimeTrackingService);
  readonly maxLevel = MAX_LEVEL;

  get xpForNextLevelValue(): number {
    return xpForNextLevel(this.gameState.level());
  }

  get xpProgress(): number {
    return levelProgress(this.gameState.xp());
  }

  get isMaxLevel(): boolean {
    return this.gameState.level() >= MAX_LEVEL;
  }

  readonly questGenerating = this.questEngine.questGenerating;
  readonly questGenerationError = this.questEngine.questGenerationError;
  readonly branchUnlocked = this.questEngine.branchUnlocked;

  readonly goalMetToday = this.timeSvc.goalMetToday;

  readonly goalPercent = computed(() => {
    const goal = this.gameState.dailyGoalMinutes();
    if (goal <= 0) return 0;
    return Math.min(100, (this.timeSvc.todaySeconds() / (goal * 60)) * 100);
  });

  readonly goalLabel = computed(() => {
    if (this.timeSvc.goalMetToday()) return 'Goal Met \u2713';
    const todayMin = Math.floor(this.timeSvc.todaySeconds() / 60);
    const goalMin = this.gameState.dailyGoalMinutes();
    return `Today: ${todayMin}m\u00a0/\u00a0${goalMin}m`;
  });

  readonly branchUnlockedLabel = computed(() => {
    const b = this.branchUnlocked();
    if (!b) return null;
    return BRANCH_DISPLAY_NAMES[b] ?? b;
  });

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  dismissBranchToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.questEngine.clearBranchUnlocked();
  }

  quest = input<Quest | null>(null);
  availableQuests = input<Quest[]>([]);
  completedQuestIds = input<string[]>([]);
  evaluation = input<EvaluationResult | null>(null);
  isEvaluating = input(false);

  questSelected = output<string>();
  hintRevealed = output<void>();
  /** Emitted when the player submits a prediction answer; carries the chosen string. */
  predictionSubmitted = output<string>();

  /** How many hints have been revealed. Reset when quest changes. */
  hintsRevealed = signal(0);

  /** The choice the player has selected for a prediction quest. */
  selectedChoice = signal<string | null>(null);

  /** True after the player has submitted their prediction (disables radio + button). */
  predictionAnswered = signal(false);

  constructor() {
    // Reset revealed hints and prediction state whenever the active quest changes.
    effect(() => {
      this.quest(); // track
      this.hintsRevealed.set(0);
      this.selectedChoice.set(null);
      this.predictionAnswered.set(false);
    });

    // Auto-dismiss the "Branch Unlocked" toast after 4 seconds.
    effect(() => {
      if (this.branchUnlocked()) {
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => this.dismissBranchToast(), 4000);
      }
    });
  }

  readonly tierLabel = computed(() => {
    switch (this.quest()?.tier) {
      case 'journeyman': return 'Journeyman';
      case 'master': return 'Master';
      default: return 'Apprentice';
    }
  });

  readonly tierClass = computed(() => this.quest()?.tier ?? 'apprentice');

  readonly revealedHints = computed(() =>
    (this.quest()?.hints ?? []).slice(0, this.hintsRevealed())
  );

  readonly canRevealMore = computed(() =>
    this.hintsRevealed() < (this.quest()?.hints.length ?? 0)
  );

  revealHint(): void {
    if (this.canRevealMore()) {
      this.hintsRevealed.update(n => n + 1);
      this.hintRevealed.emit();
    }
  }

  selectQuest(id: string): void {
    this.questSelected.emit(id);
  }

  retryGenerate(): void {
    this.questEngine.retryGenerate();
  }

  submitPrediction(): void {
    const choice = this.selectedChoice();
    if (!choice || this.predictionAnswered()) return;
    this.predictionAnswered.set(true);
    this.predictionSubmitted.emit(choice);
  }

  isCompleted(id: string): boolean {
    return this.completedQuestIds().includes(id);
  }
}
