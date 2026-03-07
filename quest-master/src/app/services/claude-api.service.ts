import { Injectable } from '@angular/core';
import { Quest, EvaluationResult, QuestTier } from '../models/quest.models';

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
}

@Injectable({ providedIn: 'root' })
export class ClaudeApiService {

  private async callClaude(systemPrompt: string, userMessage: string, apiKey: string): Promise<any> {
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
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Claude API error ${response.status}: ${body}`);
    }
    return response.json();
  }

  async generateQuest(
    completedQuests: string[],
    coveredConcepts: string[],
    currentBranch: string,
    tier: QuestTier,
    apiKey: string,
  ): Promise<Quest> {
    const system = `You are the Quest Master for an ObjectScript learning game. Generate quests that teach InterSystems ObjectScript (COS) concepts progressively.

The player has completed these quests: ${completedQuests.join(', ') || 'none'}
They have covered these concepts: ${coveredConcepts.join(', ') || 'none'}
Their current tier is: ${tier}
Their current skill branch is: ${currentBranch}

Generate the NEXT quest in this branch. It should:
1. Introduce 1-2 new concepts while reinforcing previously learned ones
2. Have a clear, testable objective
3. Include narrative flavor text (fantasy/guild theme)
4. Include 2-3 progressive hints
5. Include 1-2 bonus objectives for extra XP
6. Specify evaluation criteria for code review

CRITICAL CONSTRAINT — starterCode execution model:
- Code is sent directly to IRIS via XECUTE (line by line)
- It runs as plain ObjectScript commands, NOT inside a class or method
- DO NOT use ClassMethod, Method, Class, or any class-definition syntax
- DO NOT use curly-brace method bodies { ... }
- Valid: SET, WRITE, FOR, IF, DO, XECUTE, $ORDER, globals, etc.
- Invalid: ClassMethod Foo() { ... } — this causes a compile error

Respond with a JSON object with exactly these fields — no markdown fences, no extra commentary:
{
  "id": "branch-NN (e.g. commands-02)",
  "title": "string",
  "branch": "same as current branch",
  "tier": "apprentice | journeyman | master",
  "xpReward": number,
  "bonusXP": number,
  "narrative": "string",
  "objective": "string",
  "hints": ["string", "string", "string"],
  "bonusObjectives": ["string"],
  "expectedOutput": null,
  "evaluationCriteria": "string",
  "prerequisites": ["completed quest IDs"],
  "starterCode": "string (valid ObjectScript)",
  "conceptsIntroduced": ["string"]
}`;

    const user = `Generate the next quest for the "${currentBranch}" branch.`;
    const resp = await this.callClaude(system, user, apiKey);
    const text: string = resp.content?.[0]?.text ?? '';
    return JSON.parse(stripJsonFences(text)) as Quest;
  }

  async evaluateSubmission(
    quest: Quest,
    playerCode: string,
    executionOutput: string,
    errors: string,
    apiKey: string,
  ): Promise<EvaluationResult> {
    const system = `You are evaluating an ObjectScript code submission for a learning quest.

Quest: ${quest.title}
Objective: ${quest.objective}
Evaluation Criteria: ${quest.evaluationCriteria}
Expected Output (if any): ${quest.expectedOutput ?? 'none'}
Bonus Objectives: ${quest.bonusObjectives.join('; ') || 'none'}

Evaluate the submission. Respond with JSON only — no markdown fences, no extra text:
{
  "passed": boolean,
  "score": number (0-100),
  "bonusAchieved": ["bonus objective text for each bonus met"],
  "feedback": "encouraging, specific feedback in 1-3 sentences",
  "codeReview": "idiomatic ObjectScript suggestions, 1-3 sentences",
  "xpEarned": number (up to ${quest.xpReward} base XP plus up to ${quest.bonusXP} bonus XP)
}`;

    const user = `Player's code:\n${playerCode}\n\nIRIS execution output:\n${executionOutput || '(none)'}\n\nIRIS errors:\n${errors || '(none)'}`;

    const resp = await this.callClaude(system, user, apiKey);
    const text: string = resp.content?.[0]?.text ?? '';
    return JSON.parse(stripJsonFences(text)) as EvaluationResult;
  }
}
