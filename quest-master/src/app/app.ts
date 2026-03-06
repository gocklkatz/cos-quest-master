import { Component, OnInit, inject, signal } from '@angular/core';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { CodeEditorComponent } from './components/code-editor/code-editor.component';
import { OutputPanelComponent } from './components/output-panel/output-panel.component';
import { QuestPanelComponent } from './components/quest-panel/quest-panel.component';
import { GameStateService } from './services/game-state.service';
import { IrisConnectionService } from './services/iris-connection.service';
import { IrisApiService } from './services/iris-api.service';
import { QuestEngineService } from './services/quest-engine.service';
import { EvaluationResult } from './models/quest.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderBarComponent,
    SettingsModalComponent,
    CodeEditorComponent,
    OutputPanelComponent,
    QuestPanelComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private irisApi = inject(IrisApiService);
  readonly questEngine = inject(QuestEngineService);

  showSettings = signal(false);

  /** Current code in the editor. */
  editorCode = signal('// Write your ObjectScript here\nWRITE "Hello from IRIS!", !');

  /** Execution state. */
  output = signal<string | null>(null);
  error = signal<string | null>(null);
  isRunning = signal(false);

  /** Last evaluation result (cleared when code is run again). */
  evaluation = signal<EvaluationResult | null>(null);

  ngOnInit(): void {
    this.connectionSvc.startPolling(this.gameState.irisConfig());
    this.questEngine.initialize();

    // Load starter code for the initial quest.
    const initial = this.questEngine.currentQuest();
    if (initial?.starterCode) {
      this.editorCode.set(initial.starterCode);
    }
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
    this.connectionSvc.startPolling(this.gameState.irisConfig());
  }

  runCode(): void {
    if (this.isRunning()) return;

    const code = this.editorCode();
    if (!code.trim()) return;

    this.isRunning.set(true);
    this.output.set(null);
    this.error.set(null);
    this.evaluation.set(null); // clear previous evaluation when re-running

    this.irisApi.executeCode(this.gameState.irisConfig(), code).subscribe(result => {
      this.isRunning.set(false);
      if (result.success) {
        this.output.set(result.output ?? '');
      } else {
        this.error.set(result.error ?? 'Unknown error');
      }
    });
  }

  submitCode(): void {
    const quest = this.questEngine.currentQuest();
    if (!quest || this.questEngine.currentQuestCompleted()) return;

    if (this.output() === null && this.error() === null) {
      // No run yet — show a prompt in the error slot.
      this.error.set('Run your code first, then submit.');
      return;
    }

    const result = this.questEngine.evaluateSimple(
      quest,
      this.output() ?? '',
      this.error() !== null,
    );
    this.evaluation.set(result);

    if (result.passed) {
      this.questEngine.completeQuest(quest, this.editorCode(), result);
      // Load starter code for the newly selected quest (if any).
      const next = this.questEngine.currentQuest();
      if (next && next.id !== quest.id) {
        this.editorCode.set(next.starterCode ?? '');
        this.output.set(null);
        this.error.set(null);
      }
    }
  }

  onQuestSelected(questId: string): void {
    this.gameState.setCurrentQuest(questId);
    const q = this.questEngine.allQuests().find(q => q.id === questId);
    this.editorCode.set(q?.starterCode ?? '');
    this.output.set(null);
    this.error.set(null);
    this.evaluation.set(null);
  }
}
