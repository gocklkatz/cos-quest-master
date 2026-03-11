import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Quest, EvaluationResult } from '../../models/quest.models';
import { QuestEngineService } from '../../services/quest-engine.service';
import { GameStateService } from '../../services/game-state.service';
import { xpForNextLevel, levelProgress, MAX_LEVEL } from '../../data/xp-table';

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

  quest = input<Quest | null>(null);
  availableQuests = input<Quest[]>([]);
  completedQuestIds = input<string[]>([]);
  evaluation = input<EvaluationResult | null>(null);
  isEvaluating = input(false);

  questSelected = output<string>();
  hintRevealed = output<void>();

  /** How many hints have been revealed. Reset when quest changes. */
  hintsRevealed = signal(0);

  constructor() {
    // Reset revealed hints whenever the active quest changes.
    effect(() => {
      this.quest(); // track
      this.hintsRevealed.set(0);
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

  isCompleted(id: string): boolean {
    return this.completedQuestIds().includes(id);
  }
}
