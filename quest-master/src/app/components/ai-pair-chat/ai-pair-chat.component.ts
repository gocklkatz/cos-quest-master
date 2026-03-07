import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiPairService } from '../../services/ai-pair.service';
import { Quest } from '../../models/quest.models';

const MAX_MESSAGES = 12;

@Component({
  selector: 'app-ai-pair-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-pair-chat.component.html',
  styleUrl: './ai-pair-chat.component.scss',
})
export class AiPairChatComponent {
  private aiPair = inject(AiPairService);

  quest = input<Quest | null>(null);
  currentCode = input('');
  lastOutput = input('');
  apiKey = input('');

  readonly history = this.aiPair.history;
  readonly isThinking = this.aiPair.isThinking;
  readonly messageCount = this.aiPair.messageCount;
  readonly maxMessages = MAX_MESSAGES;

  inputText = signal('');

  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  constructor() {
    // Scroll to bottom whenever history changes.
    effect(() => {
      this.aiPair.history(); // track
      setTimeout(() => this._scrollToBottom(), 50);
    });
  }

  async send(): Promise<void> {
    const text = this.inputText().trim();
    const quest = this.quest();
    const apiKey = this.apiKey();
    if (!text || !quest || !apiKey || this.isThinking()) return;

    this.inputText.set('');
    await this.aiPair.sendMessage(text, quest, this.currentCode(), this.lastOutput(), apiKey);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearChat(): void {
    this.aiPair.clearChat();
  }

  private _scrollToBottom(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
