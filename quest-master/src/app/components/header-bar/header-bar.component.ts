import { Component, inject, output } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';

const XP_TABLE = [0, 50, 120, 200, 350, 500, 750, 1200, 1500, 1900, 2400, 3000, 3700, 4500, 5000];

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

  get xpForCurrentLevel(): number {
    const level = this.gameState.level();
    return XP_TABLE[level - 1] ?? 0;
  }

  get xpForNextLevel(): number {
    const level = this.gameState.level();
    return XP_TABLE[level] ?? XP_TABLE[XP_TABLE.length - 1];
  }

  get xpProgress(): number {
    const current = this.gameState.xp() - this.xpForCurrentLevel;
    const total = this.xpForNextLevel - this.xpForCurrentLevel;
    return total > 0 ? Math.min(100, (current / total) * 100) : 100;
  }
}
