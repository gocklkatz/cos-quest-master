import { Component, computed, effect, input, model, output } from '@angular/core';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { QuestFile } from '../../models/quest.models';
import { registerObjectScript } from '../../app.config';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [EditorComponent],
  templateUrl: './code-editor.component.html',
  styleUrl: './code-editor.component.scss',
})
export class CodeEditorComponent {
  /** Two-way bindable: parent sets starter code; child emits user edits. */
  code = model('');

  /** Files for the current quest — shown as tabs above the editor. */
  files = input<QuestFile[]>([]);

  /** ID of the currently active file tab. */
  activeFileId = input<string>('');

  /** Whether challenge mode is active (no starter code on quest load). */
  challengeMode = input(false);

  /** When true, Monaco editor is read-only (used for prediction quests). */
  readOnly = input(false);

  /** Emitted when the user presses Ctrl+Enter or clicks Run. */
  runRequested = output<void>();

  /** Emitted when the user clicks a different file tab. */
  fileSelected = output<string>();

  /** Emitted when the user toggles challenge mode. */
  toggleChallengeMode = output<void>();

  /** Emitted when the user clicks "Show starter code" in challenge mode. */
  restoreStarterCode = output<void>();

  /** Active QuestFile derived from files + activeFileId. */
  protected readonly activeFile = computed(() =>
    this.files().find(f => f.id === this.activeFileId()) ?? null
  );

  readonly editorOptions = {
    theme: 'objectscript-dark',
    language: 'objectscript',
    minimap: { enabled: false },
    fontSize: 14,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on' as const,
    renderLineHighlight: 'line' as const,
    tabSize: 2,
    wordWrap: 'on' as const,
  };

  private editor: any = null;

  constructor() {
    // When the parent changes the `code` signal (e.g. loading starter code from a quest),
    // push the new value into Monaco without triggering a propagateChange → setValue loop.
    effect(() => {
      const newCode = this.code();
      if (this.editor) {
        const current: string = this.editor.getValue();
        if (current !== newCode) {
          // Replace content. Use model.setValue() to bypass Monaco's editor-level
          // read-only guard (which blocks executeEdits on prediction quests) while
          // still firing onDidChangeModelContent so the user-edit listener stays correct.
          this.editor.getModel().setValue(newCode);
        }
      }
    });

    // Propagate readOnly changes to Monaco after the editor has been initialised.
    effect(() => {
      const ro = this.readOnly();
      if (this.editor) {
        this.editor.updateOptions({ readOnly: ro });
      }
    });
  }

  onEditorInit(editor: any): void {
    this.editor = editor;

    // Re-register language/theme in case HMR caused onMonacoLoad to be skipped.
    // (ngx-monaco-editor-v2 skips onMonacoLoad when window.monaco already exists.)
    const monaco = (window as any).monaco;
    registerObjectScript();
    monaco.editor.setTheme('objectscript-dark');
    monaco.editor.setModelLanguage(editor.getModel(), 'objectscript');

    // Set initial value (effect() runs before editor exists on first load).
    const initialCode = this.code();
    if (initialCode) {
      editor.setValue(initialCode);
    }

    // Apply readOnly state that may have been set before the editor initialised.
    editor.updateOptions({ readOnly: this.readOnly() });

    // Forward user edits to the model() signal.
    editor.onDidChangeModelContent(() => {
      this.code.set(editor.getValue());
    });

    // Ctrl+Enter → run code.
    editor.addAction({
      id: 'run-on-iris',
      label: 'Run on IRIS',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => this.runRequested.emit(),
    });
  }

  selectFile(fileId: string): void {
    if (fileId !== this.activeFileId()) {
      this.fileSelected.emit(fileId);
    }
  }
}
