import { Component, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EvaluationResult } from '../../models/quest.models';
import { ClaudeApiError, ClaudeApiService } from '../../services/claude-api.service';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './review-modal.component.html',
  styleUrl: './review-modal.component.scss',
})
export class ReviewModalComponent {
  private claudeApi = inject(ClaudeApiService);

  readonly evaluation = input.required<EvaluationResult>();
  readonly apiKey = input<string | null>(null);
  readonly confirmed = output<void>();

  readonly reflectionAnswer = signal('');
  readonly isEvaluatingReflection = signal(false);
  readonly reflectionFeedback = signal<string | null>(null);
  readonly reflectionError = signal<string | null>(null);

  confirm(): void {
    this.confirmed.emit();
  }

  async submitReflection(): Promise<void> {
    const question = this.evaluation().followUpQuestion;
    const answer = this.reflectionAnswer().trim();
    const key = this.apiKey();
    if (!question || !answer || !key || this.isEvaluatingReflection()) return;

    this.isEvaluatingReflection.set(true);
    this.reflectionFeedback.set(null);
    this.reflectionError.set(null);
    try {
      const feedback = await this.claudeApi.evaluateReflection(question, answer, key);
      this.reflectionFeedback.set(feedback);
    } catch (e) {
      this.reflectionError.set(e instanceof ClaudeApiError ? e.message : 'Could not evaluate reflection. Check your API key and try again.');
    } finally {
      this.isEvaluatingReflection.set(false);
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event): void {
    // Only confirm on Enter when the textarea is not focused
    if ((event.target as HTMLElement).tagName !== 'TEXTAREA') {
      this.confirmed.emit();
    }
  }
}
