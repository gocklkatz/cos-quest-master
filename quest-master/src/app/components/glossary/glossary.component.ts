import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Quest } from '../../models/quest.models';
import { GlossaryService } from '../../services/glossary.service';
import { GlossaryEntry } from '../../data/glossary';

@Component({
  selector: 'app-glossary',
  standalone: true,
  templateUrl: './glossary.component.html',
  styleUrl: './glossary.component.scss',
})
export class GlossaryComponent {
  readonly glossary = inject(GlossaryService);

  activeQuest = input<Quest | null>(null);
  highlightTerm = input<string | null>(null);

  copyToEditor = output<string>();

  readonly listRef = viewChild<ElementRef<HTMLElement>>('entryList');

  constructor() {
    effect(() => {
      const term = this.highlightTerm();
      if (!term) return;
      // Give Angular one tick to render the updated list before scrolling.
      setTimeout(() => {
        const el = this.listRef()?.nativeElement?.querySelector(`[data-term="${CSS.escape(term)}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    });
  }

  isQuestConcept(entry: GlossaryEntry): boolean {
    const q = this.activeQuest();
    if (!q) return false;
    return q.conceptsIntroduced.some(c => c.toLowerCase() === entry.term.toLowerCase());
  }

  isHighlighted(entry: GlossaryEntry): boolean {
    const ht = this.highlightTerm();
    return !!ht && ht.toLowerCase() === entry.term.toLowerCase();
  }

  copy(entry: GlossaryEntry): void {
    this.copyToEditor.emit(entry.example);
  }

  readonly categoryColors: Record<string, string> = {
    command: 'cat-command',
    function: 'cat-function',
    'special-variable': 'cat-special',
    class: 'cat-class',
    pattern: 'cat-pattern',
  };

  catClass(category: string): string {
    return this.categoryColors[category] ?? '';
  }
}
