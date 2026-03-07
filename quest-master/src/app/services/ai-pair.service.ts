import { Injectable, signal, computed } from '@angular/core';
import { Quest } from '../models/quest.models';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_PREFIX = 'qm-chat-';
const MAX_MESSAGES = 12;

@Injectable({ providedIn: 'root' })
export class AiPairService {
  private readonly _history = signal<ChatMessage[]>([]);
  private readonly _isThinking = signal(false);
  private _currentQuestId: string | null = null;

  readonly history = this._history.asReadonly();
  readonly isThinking = this._isThinking.asReadonly();
  readonly messageCount = computed(() => this._history().length);

  /** Load chat history for a quest from localStorage. */
  loadForQuest(questId: string): void {
    if (this._currentQuestId === questId) return;
    this._currentQuestId = questId;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + questId);
      this._history.set(raw ? (JSON.parse(raw) as ChatMessage[]) : []);
    } catch {
      this._history.set([]);
    }
  }

  clearChat(): void {
    this._history.set([]);
    if (this._currentQuestId) {
      localStorage.removeItem(STORAGE_PREFIX + this._currentQuestId);
    }
  }

  async sendMessage(
    userText: string,
    quest: Quest,
    currentCode: string,
    lastOutput: string,
    apiKey: string,
  ): Promise<void> {
    const userMsg: ChatMessage = { role: 'user', content: userText };
    this._history.update(h => [...h, userMsg]);
    this._persist();
    this._isThinking.set(true);

    try {
      const system = this._buildSystemPrompt(quest, currentCode, lastOutput);
      const messages = this._rollingWindow([...this._history()]);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system,
          messages,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Claude API error ${response.status}: ${body}`);
      }

      const data = await response.json();
      const reply: string = data.content?.[0]?.text ?? '(no response)';
      this._history.update(h => [...h, { role: 'assistant', content: reply }]);
      this._persist();
    } catch (e: any) {
      this._history.update(h => [
        ...h,
        { role: 'assistant', content: `Error: ${e?.message ?? 'Request failed'}` },
      ]);
      this._persist();
    } finally {
      this._isThinking.set(false);
    }
  }

  private _buildSystemPrompt(quest: Quest, currentCode: string, lastOutput: string): string {
    return `You are an ObjectScript programming mentor inside the Quest Master learning game.

Quest: ${quest.title}
Objective: ${quest.objective}
Concepts introduced: ${quest.conceptsIntroduced.join(', ')}

The player's current code:
\`\`\`
${currentCode || '(empty)'}
\`\`\`

Last IRIS output:
${lastOutput || '(no output yet)'}

Guide them toward the solution with questions and hints. Do NOT write the full solution unless they explicitly ask for it. Focus on ObjectScript idioms and IRIS-specific behaviour. Keep responses concise — 3 sentences maximum unless asked for more detail.`;
  }

  /**
   * Return at most MAX_MESSAGES entries from the history, dropping the oldest
   * user/assistant pair when the window is exceeded.
   * The most recent user message is always the last entry.
   */
  private _rollingWindow(messages: ChatMessage[]): ChatMessage[] {
    while (messages.length > MAX_MESSAGES) {
      // Drop the oldest pair (indexes 0 and 1).
      messages.splice(0, 2);
    }
    return messages;
  }

  private _persist(): void {
    if (!this._currentQuestId) return;
    try {
      localStorage.setItem(
        STORAGE_PREFIX + this._currentQuestId,
        JSON.stringify(this._history()),
      );
    } catch {
      // ignore quota errors
    }
  }
}
