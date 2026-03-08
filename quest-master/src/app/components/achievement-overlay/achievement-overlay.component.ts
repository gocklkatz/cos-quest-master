import { Component, input, OnChanges, signal } from '@angular/core';
import { Achievement } from '../../models/achievement.models';

@Component({
  selector: 'app-achievement-overlay',
  standalone: true,
  imports: [],
  templateUrl: './achievement-overlay.component.html',
  styleUrl: './achievement-overlay.component.scss',
})
export class AchievementOverlayComponent implements OnChanges {
  /** Increment to trigger a new animation. */
  trigger = input(0);
  achievement = input<Achievement | null>(null);

  visible = signal(false);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(): void {
    if (this.trigger() === 0 || !this.achievement()) return;

    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
    }

    this.visible.set(true);
    this.hideTimer = setTimeout(() => {
      this.visible.set(false);
      this.hideTimer = null;
    }, 3500);
  }
}
