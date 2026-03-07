import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { CodeEditorComponent } from './components/code-editor/code-editor.component';
import { OutputPanelComponent } from './components/output-panel/output-panel.component';
import { QuestPanelComponent } from './components/quest-panel/quest-panel.component';
import { XpAnimationComponent } from './components/xp-animation/xp-animation.component';
import { AiPairChatComponent } from './components/ai-pair-chat/ai-pair-chat.component';
import { GlossaryComponent } from './components/glossary/glossary.component';
import { GameStateService } from './services/game-state.service';
import { IrisConnectionService } from './services/iris-connection.service';
import { IrisApiService } from './services/iris-api.service';
import { QuestEngineService } from './services/quest-engine.service';
import { ClassQuestService } from './services/class-quest.service';
import { AiPairService } from './services/ai-pair.service';
import { CompileError, EvaluationResult, QuestMode } from './models/quest.models';

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
    AiPairChatComponent,
    GlossaryComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private irisApi = inject(IrisApiService);
  private classQuest = inject(ClassQuestService);
  private aiPair = inject(AiPairService);
  readonly questEngine = inject(QuestEngineService);

  showSettings = signal(false);
  showChat = signal(false);
  sidebarTab = signal<'quest' | 'glossary'>('quest');
  glossaryHighlight = signal<string | null>(null);

  /** True when an Anthropic API key is configured. */
  readonly hasApiKey = computed(() => !!this.gameState.anthropicApiKey());
  readonly anthropicApiKey = computed(() => this.gameState.anthropicApiKey());
  readonly challengeMode = computed(() => this.gameState.challengeMode());

  /** Current code in the editor. */
  editorCode = signal('// Write your ObjectScript here\nWRITE "Hello from IRIS!", !');

  /** Active editor mode — driven by the current quest's mode field, or manually toggled. */
  editorMode = signal<QuestMode>('snippet');

  /** Execution state. */
  output = signal<string | null>(null);
  error = signal<string | null>(null);
  compileErrors = signal<CompileError[]>([]);
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

      // Load starter code and chat history for the initial quest.
    const initial = this.questEngine.currentQuest();
    if (initial) {
      this.loadQuestCode(initial);
      this.aiPair.loadForQuest(initial.id);
    }
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
    this.connectionSvc.startPolling(this.gameState.irisConfig());
  }

  toggleChat(): void {
    this.showChat.update(v => !v);
  }

  onConceptClicked(term: string): void {
    this.sidebarTab.set('glossary');
    this.glossaryHighlight.set(term);
  }

  onCopyToEditor(code: string): void {
    this.editorCode.set(code);
  }

  onToggleChallengeMode(): void {
    this.gameState.toggleChallengeMode();
    // Does not reset current editor content — takes effect on next quest load.
  }

  onRestoreStarterCode(): void {
    const quest = this.questEngine.currentQuest();
    if (quest?.starterCode) {
      this.editorCode.set(quest.starterCode);
    }
  }

  /** Apply challengeMode logic when loading a quest into the editor. */
  private loadQuestCode(quest: { starterCode?: string; starterCodeHint?: string; mode?: QuestMode }): void {
    this.editorCode.set(
      this.gameState.challengeMode()
        ? (quest.starterCodeHint ?? '')
        : (quest.starterCode ?? ''),
    );
    this.editorMode.set(quest.mode ?? 'snippet');
  }

  onModeChanged(mode: QuestMode): void {
    this.editorMode.set(mode);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);
  }

  runCode(): void {
    if (this.isRunning()) return;

    const code = this.editorCode();
    if (!code.trim()) return;

    this.isRunning.set(true);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);

    if (this.editorMode() === 'class') {
      this.runClassMode(code);
    } else {
      this.irisApi.executeCode(this.gameState.irisConfig(), code).subscribe(result => {
        this.isRunning.set(false);
        if (result.success) {
          this.output.set(result.output ?? '');
        } else {
          this.error.set(result.error ?? 'Unknown error');
        }
      });
    }
  }

  private async runClassMode(source: string): Promise<void> {
    const quest = this.questEngine.currentQuest();
    const className = quest?.className ?? this.inferClassName(source);

    if (!className) {
      this.isRunning.set(false);
      this.error.set('Could not determine class name. Make sure your code starts with "Class ClassName".');
      return;
    }

    try {
      const result = await this.classQuest.runClassQuest(
        this.gameState.irisConfig(),
        className,
        source,
        quest?.testHarness,
      );
      this.isRunning.set(false);
      if (result.hasErrors) {
        this.compileErrors.set(result.errors);
        this.output.set(null);
        this.error.set(null);
      } else {
        this.compileErrors.set([]);
        this.output.set(result.output);
        this.error.set(null);
      }
    } catch (e: any) {
      this.isRunning.set(false);
      this.error.set(e?.message ?? 'Unexpected error during class compile');
    }
  }

  /** Extract class name from "Class Foo.Bar Extends ..." header. */
  private inferClassName(source: string): string | null {
    const match = source.match(/^\s*Class\s+([\w.]+)/im);
    return match ? match[1] : null;
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

    // For class mode, build a combined output/error string for evaluation.
    const effectiveOutput = this.editorMode() === 'class'
      ? this.buildClassOutput()
      : (this.output() ?? '');
    const effectiveError = this.editorMode() === 'class'
      ? this.buildClassError()
      : (this.error() ?? '');

    if (apiKey) {
      this.isEvaluating.set(true);
      try {
        result = await this.questEngine.evaluateWithClaude(
          quest,
          this.editorCode(),
          effectiveOutput,
          effectiveError,
          apiKey,
        );
      } catch {
        result = this.questEngine.evaluateSimple(quest, effectiveOutput, effectiveError !== '');
      } finally {
        this.isEvaluating.set(false);
      }
    } else {
      result = this.questEngine.evaluateSimple(quest, effectiveOutput, effectiveError !== '');
    }

    this.evaluation.set(result);

    if (result.passed) {
      const levelBefore = this.gameState.level();
      this.questEngine.completeQuest(quest, this.editorCode(), result);
      const levelAfter = this.gameState.level();

      this.xpAnimAmount.set(result.xpEarned);
      this.xpAnimLeveledUp.set(levelAfter > levelBefore);
      this.xpAnimNewLevel.set(levelAfter);
      this.xpAnimTrigger.update(n => n + 1);

      const next = this.questEngine.currentQuest();
      if (next && next.id !== quest.id) {
        // Clean up the compiled class before switching away.
        if (this.editorMode() === 'class') {
          this.classQuest.cleanupLastClass(this.gameState.irisConfig());
        }
        this.loadQuestCode(next);
        this.output.set(null);
        this.error.set(null);
        this.compileErrors.set([]);
        this.aiPair.loadForQuest(next.id);
      }

      if (apiKey && this.questEngine.activeQuests().length < 2) {
        this.questEngine.generateNextQuest(quest.branch, apiKey);
      }
    }
  }

  onQuestSelected(questId: string): void {
    const prev = this.questEngine.currentQuest();
    if (prev && this.editorMode() === 'class') {
      this.classQuest.cleanupLastClass(this.gameState.irisConfig());
    }
    this.gameState.setCurrentQuest(questId);
    const q = this.questEngine.allQuests().find(q => q.id === questId);
    if (q) this.loadQuestCode(q);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);
    this.aiPair.loadForQuest(questId);
  }

  private buildClassOutput(): string {
    const errors = this.compileErrors();
    if (errors.length > 0) {
      return errors.map(e => e.line > 0 ? `Line ${e.line}:${e.col} ${e.text}` : e.text).join('\n');
    }
    return this.output() ?? '';
  }

  private buildClassError(): string {
    return this.compileErrors().length > 0 ? 'Compile failed' : (this.error() ?? '');
  }
}
