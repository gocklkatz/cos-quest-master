import { Component, HostListener, input, output } from '@angular/core';
import { EvaluationResult } from '../../models/quest.models';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  templateUrl: './review-modal.component.html',
  styleUrl: './review-modal.component.scss',
})
export class ReviewModalComponent {
  readonly evaluation = input.required<EvaluationResult>();
  readonly confirmed = output<void>();

  confirm(): void {
    this.confirmed.emit();
  }

  @HostListener('document:keydown.enter')
  onEnter(): void {
    this.confirmed.emit();
  }
}
