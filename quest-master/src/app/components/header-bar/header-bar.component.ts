import { Component, inject, output } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';
import { xpForLevel, xpForNextLevel, levelProgress, MAX_LEVEL } from '../../data/xp-table';

@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [ConnectionIndicatorComponent],
  templateUrl: './header-bar.component.html',
  styleUrl: './header-bar.component.scss',
})
export class HeaderBarComponent {
  openSettings = output<void>();

  readonly gameState = inject(GameStateService);
  readonly maxLevel = MAX_LEVEL;

  get xpForCurrentLevel(): number {
    return xpForLevel(this.gameState.level());
  }

  get xpForNextLevelValue(): number {
    return xpForNextLevel(this.gameState.level());
  }

  get xpProgress(): number {
    return levelProgress(this.gameState.xp());
  }

  get isMaxLevel(): boolean {
    return this.gameState.level() >= MAX_LEVEL;
  }
}
