import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Quest, EvaluationResult } from '../../models/quest.models';
import { SkillTreeComponent } from '../skill-tree/skill-tree.component';
import { QuestLogComponent } from '../quest-log/quest-log.component';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-quest-panel',
  standalone: true,
  imports: [SkillTreeComponent, QuestLogComponent],
  templateUrl: './quest-panel.component.html',
  styleUrl: './quest-panel.component.scss',
})
export class QuestPanelComponent {
  private gameState = inject(GameStateService);

  readonly questLog = computed(() => this.gameState.questLog());

  quest = input<Quest | null>(null);
  availableQuests = input<Quest[]>([]);
  allQuests = input<Quest[]>([]);
  completedQuestIds = input<string[]>([]);
  evaluation = input<EvaluationResult | null>(null);
  isEvaluating = input(false);

  /** Branch selected in the skill tree for filtering the quest list. */
  selectedBranch = signal<string | null>(null);

  /** Available quests filtered by the selected branch (or all if none selected). */
  readonly filteredQuests = computed(() => {
    const branch = this.selectedBranch();
    return branch
      ? this.availableQuests().filter(q => q.branch === branch)
      : this.availableQuests();
  });

  questSelected = output<string>();
  conceptClicked = output<string>();

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
    }
  }

  selectQuest(id: string): void {
    this.questSelected.emit(id);
  }

  isCompleted(id: string): boolean {
    return this.completedQuestIds().includes(id);
  }
}
