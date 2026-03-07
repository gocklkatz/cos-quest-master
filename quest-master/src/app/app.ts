import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { CodeEditorComponent } from './components/code-editor/code-editor.component';
import { OutputPanelComponent } from './components/output-panel/output-panel.component';
import { QuestPanelComponent } from './components/quest-panel/quest-panel.component';
import { XpAnimationComponent } from './components/xp-animation/xp-animation.component';
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
    XpAnimationComponent,
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

  /** True when an Anthropic API key is configured. */
  readonly hasApiKey = computed(() => !!this.gameState.anthropicApiKey());

  /** Current code in the editor. */
  editorCode = signal('// Write your ObjectScript here\nWRITE "Hello from IRIS!", !');

  /** Execution state. */
  output = signal<string | null>(null);
  error = signal<string | null>(null);
  isRunning = signal(false);

  /** True while Claude is evaluating a submission. */
  isEvaluating = signal(false);

  /** Last evaluation result (cleared when code is run again). */
  evaluation = signal<EvaluationResult | null>(null);

  /** XP animation trigger — increment to fire a new animation. */
  xpAnimTrigger = signal(0);
  xpAnimAmount = signal(0);
  xpAnimLeveledUp = signal(false);
  xpAnimNewLevel = signal(1);

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

  async submitCode(): Promise<void> {
    const quest = this.questEngine.currentQuest();
    if (!quest || this.questEngine.currentQuestCompleted() || this.isEvaluating()) return;

    if (this.output() === null && this.error() === null) {
      this.error.set('Run your code first, then submit.');
      return;
    }

    let result: EvaluationResult;
    const apiKey = this.gameState.anthropicApiKey();

    if (apiKey) {
      this.isEvaluating.set(true);
      try {
        result = await this.questEngine.evaluateWithClaude(
          quest,
          this.editorCode(),
          this.output() ?? '',
          this.error() ?? '',
          apiKey,
        );
      } catch {
        // Claude failed — fall back to simple evaluation
        result = this.questEngine.evaluateSimple(quest, this.output() ?? '', this.error() !== null);
      } finally {
        this.isEvaluating.set(false);
      }
    } else {
      result = this.questEngine.evaluateSimple(quest, this.output() ?? '', this.error() !== null);
    }

    this.evaluation.set(result);

    if (result.passed) {
      const levelBefore = this.gameState.level();
      this.questEngine.completeQuest(quest, this.editorCode(), result);
      const levelAfter = this.gameState.level();

      // Fire XP animation.
      this.xpAnimAmount.set(result.xpEarned);
      this.xpAnimLeveledUp.set(levelAfter > levelBefore);
      this.xpAnimNewLevel.set(levelAfter);
      this.xpAnimTrigger.update(n => n + 1);

      // Load starter code for the newly selected quest (if any).
      const next = this.questEngine.currentQuest();
      if (next && next.id !== quest.id) {
        this.editorCode.set(next.starterCode ?? '');
        this.output.set(null);
        this.error.set(null);
      }

      // Generate next quest via Claude if few active quests remain.
      if (apiKey && this.questEngine.activeQuests().length < 2) {
        this.questEngine.generateNextQuest(quest.branch, apiKey);
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
