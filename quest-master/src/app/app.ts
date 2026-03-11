import { Component, OnInit, inject, signal } from '@angular/core';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { QuestViewComponent } from './components/quest-view/quest-view.component';
import { GameStateService } from './services/game-state.service';
import { IrisConnectionService } from './services/iris-connection.service';
import { QuestEngineService } from './services/quest-engine.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderBarComponent, SettingsModalComponent, QuestViewComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private questEngine = inject(QuestEngineService);

  showSettings = signal(false);

  ngOnInit(): void {
    this.connectionSvc.startPolling(this.gameState.irisConfig());
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
    this.connectionSvc.startPolling(this.gameState.irisConfig());
  }

  onReset(): void {
    this.showSettings.set(false);
    this.connectionSvc.startPolling(this.gameState.irisConfig());
    this.questEngine.triggerReset();
    // Quest-state reset (output clear + quest reload) is handled reactively
    // in QuestViewComponent via the resetEpoch effect.
  }
}
