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
import { QuestEngineService } from './services/quest-engine.service';
import { ClassQuestService } from './services/class-quest.service';
import { AiPairService } from './services/ai-pair.service';
import { PaneSizeService } from './services/pane-size.service';
import { ResizableDividerDirective } from './directives/resizable-divider.directive';
import { CompileError, EvaluationResult, QuestFile } from './models/quest.models';

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
    ResizableDividerDirective,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private classQuest = inject(ClassQuestService);
  private aiPair = inject(AiPairService);
  private paneSizes = inject(PaneSizeService);
  readonly questEngine = inject(QuestEngineService);

  showSettings = signal(false);
  showChat = signal(false);
  sidebarTab = signal<'quest' | 'glossary'>('quest');

  /** Resizable pane sizes (px), persisted in localStorage. */
  sidebarWidth = signal(this.paneSizes.get('sidebar'));
  outputHeight = signal(this.paneSizes.get('editorOutput'));
  chatHeight = signal(this.paneSizes.get('outputChat'));
  glossaryHighlight = signal<string | null>(null);

  /** True when an Anthropic API key is configured. */
  readonly hasApiKey = computed(() => !!this.gameState.anthropicApiKey());
  readonly anthropicApiKey = computed(() => this.gameState.anthropicApiKey());
  readonly challengeMode = computed(() => this.gameState.challengeMode());

  /** Current code in the active file tab. */
  editorCode = signal('// Write your ObjectScript here\nWRITE "Hello from IRIS!", !');

  /** Files for the current quest — drives the file tabs in the editor toolbar. */
  questFiles = signal<QuestFile[]>([]);

  /** ID of the currently active file tab. */
  activeFileId = signal<string>('');

  /** Per-file code buffers so switching tabs preserves each tab's content. */
  private fileCodeBuffers = new Map<string, string>();

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

  onSidebarResize(px: number): void {
    this.sidebarWidth.set(px);
    this.paneSizes.set('sidebar', px);
  }

  onOutputResize(px: number): void {
    this.outputHeight.set(px);
    this.paneSizes.set('editorOutput', px);
  }

  onChatResize(px: number): void {
    this.chatHeight.set(px);
    this.paneSizes.set('outputChat', px);
  }

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
    const file = this.questFiles().find(f => f.id === this.activeFileId());
    if (file?.starterCode) {
      this.editorCode.set(file.starterCode);
    }
  }

  /** Load a quest's files into the editor, respecting challenge mode. */
  private loadQuestCode(quest: { files: QuestFile[] }): void {
    this.fileCodeBuffers.clear();
    const files = quest.files ?? [];
    this.questFiles.set(files);
    const firstFile = files[0] ?? null;
    this.activeFileId.set(firstFile?.id ?? '');
    this.editorCode.set(
      firstFile
        ? (this.gameState.challengeMode()
            ? (firstFile.starterCodeHint ?? '')
            : (firstFile.starterCode ?? ''))
        : '',
    );
    // Pre-populate buffers for non-active files.
    for (const file of files.slice(1)) {
      this.fileCodeBuffers.set(
        file.id,
        this.gameState.challengeMode()
          ? (file.starterCodeHint ?? '')
          : (file.starterCode ?? ''),
      );
    }
  }

  onFileSelected(fileId: string): void {
    // Save current editor state into the outgoing file's buffer.
    this.fileCodeBuffers.set(this.activeFileId(), this.editorCode());
    this.activeFileId.set(fileId);
    // Restore the incoming file's buffer (or its starter code as fallback).
    const saved = this.fileCodeBuffers.get(fileId);
    if (saved !== undefined) {
      this.editorCode.set(saved);
    } else {
      const file = this.questFiles().find(f => f.id === fileId);
      this.editorCode.set(
        file
          ? (this.gameState.challengeMode()
              ? (file.starterCodeHint ?? '')
              : (file.starterCode ?? ''))
          : '',
      );
    }
  }

  /** Collect current code for all files into a map (active file from editorCode signal). */
  private collectFileCode(): Map<string, string> {
    const map = new Map(this.fileCodeBuffers);
    map.set(this.activeFileId(), this.editorCode());
    return map;
  }

  runCode(): void {
    if (this.isRunning()) return;

    const files = this.questFiles();
    const fileCodeMap = this.collectFileCode();
    const hasAnyCode = files.some(f => (fileCodeMap.get(f.id) ?? '').trim());
    if (!hasAnyCode) return;

    this.isRunning.set(true);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);

    this.runAllFiles(files, fileCodeMap);
  }

  private async runAllFiles(files: QuestFile[], fileCodeMap: Map<string, string>): Promise<void> {
    const quest = this.questEngine.currentQuest();
    try {
      const result = await this.classQuest.runQuestFiles(
        this.gameState.irisConfig(),
        files,
        fileCodeMap,
        quest?.testHarness,
      );
      this.isRunning.set(false);
      if (result.hasErrors) {
        if (result.errorKind === 'compile') {
          this.compileErrors.set(result.errors);
          this.error.set(null);
        } else {
          this.compileErrors.set([]);
          this.error.set(result.errors[0]?.text ?? 'Unknown error');
        }
        this.output.set(null);
      } else {
        this.compileErrors.set([]);
        this.output.set(result.output);
        this.error.set(null);
      }
    } catch (e: any) {
      this.isRunning.set(false);
      this.error.set(e?.message ?? 'Unexpected error');
    }
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

    const effectiveOutput = this.compileErrors().length > 0
      ? this.compileErrors().map(e => e.line > 0 ? `Line ${e.line}:${e.col} ${e.text}` : e.text).join('\n')
      : (this.output() ?? '');
    const effectiveError = this.compileErrors().length > 0
      ? 'Compile failed'
      : (this.error() ?? '');

    // Collect all files' code for the submission (for Claude evaluation context).
    const fileCodeMap = this.collectFileCode();
    const allCode = this.questFiles()
      .map(f => {
        const code = fileCodeMap.get(f.id) ?? '';
        return this.questFiles().length > 1 ? `// --- ${f.label} (${f.filename}) ---\n${code}` : code;
      })
      .join('\n\n');

    if (apiKey) {
      this.isEvaluating.set(true);
      try {
        result = await this.questEngine.evaluateWithClaude(
          quest,
          allCode,
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
      this.questEngine.completeQuest(quest, allCode, result);
      const levelAfter = this.gameState.level();

      this.xpAnimAmount.set(result.xpEarned);
      this.xpAnimLeveledUp.set(levelAfter > levelBefore);
      this.xpAnimNewLevel.set(levelAfter);
      this.xpAnimTrigger.update(n => n + 1);

      const next = this.questEngine.currentQuest();
      if (next && next.id !== quest.id) {
        this.classQuest.cleanupLastClass(this.gameState.irisConfig());
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
    this.classQuest.cleanupLastClass(this.gameState.irisConfig());
    this.gameState.setCurrentQuest(questId);
    const q = this.questEngine.allQuests().find(q => q.id === questId);
    if (q) this.loadQuestCode(q);
    this.output.set(null);
    this.error.set(null);
    this.compileErrors.set([]);
    this.evaluation.set(null);
    this.aiPair.loadForQuest(questId);
  }
}
