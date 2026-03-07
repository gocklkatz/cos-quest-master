import { Component, computed, input, signal } from '@angular/core';
import { QuestLogEntry } from '../../models/game-state.models';

@Component({
  selector: 'app-quest-log',
  standalone: true,
  templateUrl: './quest-log.component.html',
  styleUrl: './quest-log.component.scss',
})
export class QuestLogComponent {
  entries = input<QuestLogEntry[]>([]);

  expanded = signal(false);

  /** Entries in reverse chronological order (most recent first). */
  readonly sortedEntries = computed(() => [...this.entries()].reverse());

  toggleExpanded(): void {
    this.expanded.update(v => !v);
  }

  formatDate(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  }

  scoreClass(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  }
}
