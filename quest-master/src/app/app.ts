import { Component, OnInit, inject, signal } from '@angular/core';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { CodeEditorComponent } from './components/code-editor/code-editor.component';
import { OutputPanelComponent } from './components/output-panel/output-panel.component';
import { GameStateService } from './services/game-state.service';
import { IrisConnectionService } from './services/iris-connection.service';
import { IrisApiService } from './services/iris-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderBarComponent, SettingsModalComponent, CodeEditorComponent, OutputPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private irisApi = inject(IrisApiService);

  showSettings = signal(false);

  /** Current code in the editor. */
  editorCode = signal('// Write your ObjectScript here\nWRITE "Hello from IRIS!", !');

  /** Execution state. */
  output = signal<string | null>(null);
  error = signal<string | null>(null);
  isRunning = signal(false);

  ngOnInit(): void {
    this.connectionSvc.startPolling(this.gameState.irisConfig());
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
    // Re-poll after settings change (e.g. new IRIS URL or credentials)
    this.connectionSvc.startPolling(this.gameState.irisConfig());
  }

  runCode(): void {
    if (this.isRunning()) return;

    const code = this.editorCode();
    if (!code.trim()) return;

    this.isRunning.set(true);
    this.output.set(null);
    this.error.set(null);

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
