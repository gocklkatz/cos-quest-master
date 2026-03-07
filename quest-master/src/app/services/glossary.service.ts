import { Injectable, computed, signal } from '@angular/core';
import { GlossaryEntry, GLOSSARY } from '../data/glossary';
import { Quest } from '../models/quest.models';

@Injectable({ providedIn: 'root' })
export class GlossaryService {
  readonly allEntries: GlossaryEntry[] = GLOSSARY;

  readonly searchQuery = signal('');

  readonly filteredEntries = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allEntries;
    return this.allEntries.filter(e =>
      e.term.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.relatedConcepts.some(c => c.toLowerCase().includes(q)),
    );
  });

  getEntry(term: string): GlossaryEntry | undefined {
    const lower = term.toLowerCase();
    return this.allEntries.find(e => e.term.toLowerCase() === lower);
  }

  /** Returns glossary entries that match any concept from the quest's conceptsIntroduced. */
  getQuestEntries(quest: Quest): GlossaryEntry[] {
    const concepts = quest.conceptsIntroduced.map(c => c.toLowerCase());
    return this.allEntries.filter(e => concepts.includes(e.term.toLowerCase()));
  }
}
