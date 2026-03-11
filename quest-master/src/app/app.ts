import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { GameStateService } from './services/game-state.service';
import { IrisConnectionService } from './services/iris-connection.service';
import { QuestEngineService } from './services/quest-engine.service';
import { UiEventService } from './services/ui-event.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderBarComponent, SettingsModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private gameState = inject(GameStateService);
  private connectionSvc = inject(IrisConnectionService);
  private questEngine = inject(QuestEngineService);
  private uiEvents = inject(UiEventService);

  showSettings = signal(false);

  private settingsSub!: Subscription;

  ngOnInit(): void {
    this.connectionSvc.startPolling(this.gameState.irisConfig());
    this.settingsSub = this.uiEvents.settingsRequested.subscribe(() => {
      this.showSettings.set(true);
    });
  }

  ngOnDestroy(): void {
    this.settingsSub.unsubscribe();
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
