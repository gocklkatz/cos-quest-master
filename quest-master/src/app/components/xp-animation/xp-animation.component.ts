import { Component, input, OnChanges, signal } from '@angular/core';

@Component({
  selector: 'app-xp-animation',
  standalone: true,
  imports: [],
  templateUrl: './xp-animation.component.html',
  styleUrl: './xp-animation.component.scss',
})
export class XpAnimationComponent implements OnChanges {
  /** Trigger a new animation by incrementing this counter. */
  trigger = input(0);
  xpEarned = input(0);
  leveledUp = input(false);
  newLevel = input(1);

  visible = signal(false);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(): void {
    if (this.trigger() === 0) return;

    // Cancel any in-progress hide timer.
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
    }

    this.visible.set(true);
    this.hideTimer = setTimeout(() => {
      this.visible.set(false);
      this.hideTimer = null;
    }, 2800);
  }
}
