import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [ConnectionIndicatorComponent, RouterLink, RouterLinkActive],
  templateUrl: './header-bar.component.html',
  styleUrl: './header-bar.component.scss',
})
export class HeaderBarComponent {
  openSettings = output<void>();
  protected gameState = inject(GameStateService);
}
