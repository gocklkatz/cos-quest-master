import { Injectable } from '@angular/core';
import { Quest, EvaluationResult, QuestTier, normalizeQuest } from '../models/quest.models';

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
    questType: 'standard' | 'prediction' = 'standard',
  ): Promise<Quest> {
    const isEarlyStage = completedQuests.length === 0 || (completedQuests.length === 1 && completedQuests[0] === 'quest-zero');
    const earlyStageGuidance = isEarlyStage
      ? `\nIMPORTANT — EARLY LEARNER: The player is at Level 1 / apprentice tier. This quest MUST:
- Target absolute beginners with zero prior ObjectScript knowledge
- Introduce only the most fundamental concept (e.g. WRITE, SET, or a single built-in function)
- Set "prerequisites": ["quest-zero"] (the player has only completed the connection test)
- Keep the objective narrow and achievable in under 10 lines of code
- Use "tier": "apprentice" and award modest XP (20–50 base)`
      : '';

    const isPrediction = questType === 'prediction';

    const predictionGuidance = isPrediction ? `

QUEST TYPE — PREDICTION (Code Reading):
This is a "predict the output" quest. The player reads a completed routine and selects the correct output from multiple-choice options. Rules:
- starterCode MUST be a complete, self-contained ObjectScript routine (no blanks to fill in).
- The routine MUST be deterministic and SHORT (≤ 10 lines). No user input, no random values.
- Focus on concepts that have a non-obvious output: string functions ($PIECE, $EXTRACT, $LENGTH), loop constructs, global reads, or type coercion.
- Include 3–4 plausible choices. Add realistic distractors: off-by-one results, wrong delimiter splits, empty-string edge cases.
- correctAnswer MUST exactly match one entry in choices.
- evaluationCriteria: write a 1-2 sentence plain-English explanation of WHY the correct answer is right (shown to the player after answering).
- hints: provide 1-2 hints that guide the player to trace the code mentally without revealing the answer.
- bonusObjectives: leave as an empty array [].` : '';

    const schemaExtra = isPrediction ? `
  "questType": "prediction",
  "choices": ["string", "string", "string", "string"],
  "correctAnswer": "string (must match one entry in choices exactly)",` : `
  "questType": "standard",`;

    const system = `You are the Quest Master for an ObjectScript learning game. Generate quests that teach InterSystems ObjectScript (COS) concepts progressively.

The player has completed these quests: ${completedQuests.join(', ') || 'none'}
They have covered these concepts: ${coveredConcepts.join(', ') || 'none'}
Their current tier is: ${tier}
Their current skill branch is: ${currentBranch}
${earlyStageGuidance}${predictionGuidance}
Generate the NEXT quest in this branch. It should:
1. Introduce 1-2 new concepts while reinforcing previously learned ones
2. Have a clear, testable objective
3. Include narrative flavor text (fantasy/guild theme)
4. Include 2-3 progressive hints
5. Include 1-2 bonus objectives for extra XP
6. Specify evaluation criteria for code review

CRITICAL CONSTRAINT — file execution model:
- Each quest defines a "files" array. Generated quests for command/globals/snippet branches use a single script file.
- Script files (fileType: "script") run as plain ObjectScript commands via XECUTE — NOT inside a class or method.
- DO NOT use ClassMethod, Method, Class, or class-definition syntax in script files.
- Valid in script files: SET, WRITE, FOR, IF, DO, XECUTE, $ORDER, globals, etc.
- Invalid in script files: ClassMethod Foo() { ... } — this causes a compile error

Respond with a JSON object with exactly these fields — no markdown fences, no extra commentary:
{
  "id": "branch-NN (e.g. commands-02)",
  "title": "string",
  "branch": "same as current branch",${schemaExtra}
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
  "files": [
    {
      "id": "main",
      "filename": "solution.script",
      "fileType": "script",
      "label": "Solution",
      "starterCode": "string (valid ObjectScript commands)",
      "starterCodeHint": "string (one-line comment orienting the player without revealing logic)"
    }
  ],
  "conceptsIntroduced": ["string"],
  "docLinks": [{"label": "string", "url": "https://docs.intersystems.com/..."}]
}

For starterCodeHint, write a single-line comment that orients the player without giving away logic. Omit if the concept is too open-ended for a directional hint.
For docLinks, include 1-3 links to relevant docs.intersystems.com pages for the concepts introduced. Use deep links to the specific page when known (e.g. $ORDER → KEY=RCOS_forder, WRITE → KEY=RCOS_cwrite, globals → KEY=GGBL_intro). Omit docLinks entirely if you are not confident in the URL.`;

    const user = `Generate the next quest for the "${currentBranch}" branch.`;
    const resp = await this.callClaude(system, user, apiKey);
    const text: string = resp.content?.[0]?.text ?? '';
    return normalizeQuest(JSON.parse(stripJsonFences(text)));
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
  "xpEarned": number (up to ${quest.xpReward} base XP plus up to ${quest.bonusXP} bonus XP),
  "followUpQuestion": "if passed=true, a single question that asks the player to explain WHY they made a specific design choice visible in their submitted code (e.g. 'You used $PIECE with a comma delimiter — why would $EXTRACT be a poor substitute here?'). The question MUST reference a specific line or construct from the player's actual code. If passed=false, omit this field or set it to null."
}`;

    const user = `Player's code:\n${playerCode}\n\nIRIS execution output:\n${executionOutput || '(none)'}\n\nIRIS errors:\n${errors || '(none)'}`;

    const resp = await this.callClaude(system, user, apiKey);
    const text: string = resp.content?.[0]?.text ?? '';
    return JSON.parse(stripJsonFences(text)) as EvaluationResult;
  }

  async evaluateReflection(
    question: string,
    answer: string,
    apiKey: string,
  ): Promise<string> {
    const system = `You are a mentor evaluating a learner's written reflection on an ObjectScript design choice.
The learner was asked: "${question}"
Their answer: "${answer}"

Respond in 2-4 plain-text sentences. Confirm what they got right, gently correct any misconceptions, and optionally deepen their understanding with one additional insight. Do not use JSON or markdown.`;

    const resp = await this.callClaude(system, 'Evaluate my reflection.', apiKey);
    return resp.content?.[0]?.text?.trim() ?? '';
  }
}
