import { Component, inject, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../services/game-state.service';
import { IrisConnectionService } from '../../services/iris-connection.service';
import { QuestEngineService } from '../../services/quest-engine.service';
import { IRISConfig } from '../../models/iris.models';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss',
})
export class SettingsModalComponent {
  closed = output<void>();
  /** Emitted (instead of `closed`) when the player confirms a full progress reset. */
  reset = output<void>();

  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private questEngine = inject(QuestEngineService);

  baseUrl = signal(this.gameState.irisConfig().baseUrl);
  namespace = signal(this.gameState.irisConfig().namespace);
  username = signal(this.gameState.irisConfig().username);
  password = signal(this.gameState.irisConfig().password);
  anthropicApiKey = signal(this.gameState.anthropicApiKey());
  playerName = signal(this.gameState.playerName());

  showResetConfirm = signal(false);

  save(): void {
    const config: IRISConfig = {
      baseUrl: this.baseUrl(),
      namespace: this.namespace(),
      username: this.username(),
      password: this.password(),
    };
    this.gameState.updateSettings(config, this.anthropicApiKey(), this.playerName());
    this.connectionSvc.startPolling(config);
    this.closed.emit();
  }

  clearQuestBank(): void {
    this.gameState.clearQuestBank();
  }

  confirmReset(): void {
    this.showResetConfirm.set(true);
  }

  doReset(): void {
    this.gameState.resetProgress();
    // Re-select quest-zero immediately so the panel isn't empty.
    this.questEngine.initialize();
    // Fire-and-forget: pre-generate the first AI quest so it is ready when quest-zero completes.
    const apiKey = this.anthropicApiKey();
    if (apiKey) {
      this.questEngine.generateNextQuest(this.gameState.currentBranch(), apiKey);
    }
    this.showResetConfirm.set(false);
    // Emit reset (not closed) so AppComponent can reload the editor for quest-zero.
    this.reset.emit();
  }

  cancel(): void {
    this.closed.emit();
  }
}
