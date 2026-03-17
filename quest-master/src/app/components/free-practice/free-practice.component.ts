import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../services/game-state.service';
import { ClaudeApiService } from '../../services/claude-api.service';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { Quest, QuestFile } from '../../models/quest.models';
import { BRANCH_DISPLAY_NAMES } from '../../data/branch-progression';

@Component({
  selector: 'app-free-practice',
  standalone: true,
  imports: [FormsModule, CodeEditorComponent],
  templateUrl: './free-practice.component.html',
  styleUrl: './free-practice.component.scss',
})
export class FreePracticeComponent {
  protected gameState = inject(GameStateService);
  private claudeApi = inject(ClaudeApiService);

  protected readonly branchEntries = Object.entries(BRANCH_DISPLAY_NAMES);

  protected selectedTopic = signal<string>(Object.keys(BRANCH_DISPLAY_NAMES)[0]);
  protected isGenerating = signal(false);
  protected currentQuest = signal<Quest | null>(null);
  protected error = signal<string | null>(null);

  /** Code in the editor — driven by the quest's starter code on load, then editable. */
  protected editorCode = signal('');

  /** Active file for the CodeEditorComponent — always uses the first file of the quest. */
  protected activeFileId = signal<string>('');

  /** Files for the current quest. */
  protected questFiles = signal<QuestFile[]>([]);

  protected selectTopic(topic: string): void {
    this.selectedTopic.set(topic);
  }

  async generateQuest(): Promise<void> {
    const apiKey = this.gameState.anthropicApiKey();
    if (!apiKey) {
      this.error.set('An Anthropic API key is required. Configure it in Settings.');
      return;
    }

    this.isGenerating.set(true);
    this.error.set(null);

    try {
      const quest = await this.claudeApi.generateQuest(
        [],
        [],
        this.selectedTopic(),
        this.gameState.currentEffectiveTier(),
        apiKey,
        'standard',
        this.gameState.questCategory(),
      );
      this.currentQuest.set(quest);
      this.questFiles.set(quest.files ?? []);
      const firstFile = quest.files?.[0] ?? null;
      this.activeFileId.set(firstFile?.id ?? '');
      this.editorCode.set(firstFile?.starterCode ?? '');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to generate quest. Check your API key and try again.');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
