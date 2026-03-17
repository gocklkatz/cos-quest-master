import { Injectable } from '@angular/core';
import { Quest, EvaluationResult, QuestTier, normalizeQuest } from '../models/quest.models';
import { BRANCH_TOPIC_DESCRIPTIONS } from '../data/branch-progression';

export class ClaudeApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ClaudeApiError';
  }
}

function mapClaudeStatus(status: number): string {
  if (status === 401) return 'Invalid API key — check Settings.';
  if (status === 402 || status === 429) return 'AI credits exhausted or rate-limit reached — evaluation used simplified scoring.';
  if (status === 529) return 'Anthropic API is overloaded — evaluation used simplified scoring.';
  return `Claude API error ${status} — evaluation used simplified scoring.`;
}

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
      throw new ClaudeApiError(response.status, mapClaudeStatus(response.status));
    }
    return response.json();
  }

  async generateQuest(
    completedQuests: string[],
    coveredConcepts: string[],
    currentBranch: string,
    effectiveTier: QuestTier,
    apiKey: string,
    questType: 'standard' | 'prediction' = 'standard',
    questCategory: 'write' | 'debug' | 'optimize' = 'write',
  ): Promise<Quest> {
    const isClassBranch = currentBranch.startsWith('classes') || currentBranch === 'capstone';
    const isSqlBranch = currentBranch.startsWith('sql');

    const isEarlyStage = completedQuests.length === 0 || (completedQuests.length === 1 && completedQuests[0] === 'quest-zero');
    const earlyStageGuidance = isEarlyStage
      ? `\nIMPORTANT — EARLY LEARNER: The player is at Level 1 / apprentice tier. This quest MUST:
- Target absolute beginners with zero prior ObjectScript knowledge
- Introduce only the most fundamental concept (e.g. WRITE, SET, or a single built-in function)
- Set "prerequisites": ["quest-zero"] (the player has only completed the connection test)
- Keep the objective narrow and achievable in under 10 lines of code
- Use "tier": "apprentice" and award modest XP (20–50 base)`
      : '';

    const topicDescription = BRANCH_TOPIC_DESCRIPTIONS[currentBranch] ?? currentBranch;

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

    const questCategoryBlock = `
## Quest Category

The quest category for this quest is: ${questCategory}

Apply the following rules strictly based on the category:

write
  The player must produce ObjectScript code from a written description.
  starterCode may be empty or may contain scaffolding (e.g. method signature, partial variable declarations).
  The solution must be writable from scratch by the player.

debug
  The player must locate and correct a bug in existing code.
  starterCode MUST be non-empty and MUST contain syntactically valid but semantically incorrect ObjectScript.
  The bug must be subtle: a wrong operator, an off-by-one index, an incorrect variable reference, or a missing edge-case guard.
  The objective describes the correct expected behaviour so the player knows what "fixed" means.
  Do not place the bug in a comment — it must be in executable code.

optimize
  The player must improve working ObjectScript code along a specific dimension.
  starterCode MUST be non-empty and MUST produce correct output but be suboptimal.
  Suboptimal examples: redundant SET statements, IF/ELSE chain replaceable with $SELECT, N+1 query pattern, unnecessary string concatenation in a loop.
  The objective names the specific optimisation dimension (e.g. "reduce the number of SET statements", "replace the IF/ELSE with $SELECT").
  The solution must still produce identical output to the original.
`;

    const system = `You are the Quest Master for an ObjectScript learning game. Generate quests that teach InterSystems ObjectScript (COS) concepts progressively.

The player has completed these quests: ${completedQuests.join(', ') || 'none'}
They have covered these concepts: ${coveredConcepts.join(', ') || 'none'}
Their current tier is: ${effectiveTier}
Their current skill branch is: ${currentBranch} (${topicDescription})
${earlyStageGuidance}${predictionGuidance}
Generate the NEXT quest in this branch. It should:
1. Introduce 1-2 new concepts while reinforcing previously learned ones
2. Have a clear, testable objective
3. Include narrative flavor text (fantasy/guild theme)
4. Include 2-3 progressive hints
5. Include 1-2 bonus objectives for extra XP
6. Specify evaluation criteria for code review

${isClassBranch ? `CRITICAL CONSTRAINT — file execution model (classes/capstone branch):
- Quests in the classes or capstone branch MUST use TWO files: a .cls file and a .script file.
- The .cls file (fileType: "cls") contains the full Class definition. It is compiled via /api/quest/compile.
- The .script file (fileType: "script") instantiates or uses the compiled class. It runs via XECUTE.
- The .script file MUST declare "dependsOn": ["<cls-file-id>"] so the class compiles before the script runs.
- Do NOT put Class/Property/Method syntax inside the script file — it will cause a compile error.
- If the concept requires demonstrating multiple classes (e.g. inheritance), use MORE than two files — one .cls file per class, each with a UNIQUE id (e.g. "cls-base", "cls-sub"), plus the .script file with id "main". Every file MUST have a distinct id; duplicate ids break tab navigation.` : isSqlBranch ? `CRITICAL CONSTRAINT — file execution model (sql branch):
- SQL quests that introduce a NEW %Persistent table/class (e.g. SQLUser.Adventurer → User.Adventurer) MUST use TWO files:
  1. A .cls file (fileType: "cls", id: "cls-main") defining the class that extends %Persistent with the needed properties.
  2. A .script file (fileType: "script", id: "main") with "dependsOn": ["cls-main"] containing the embedded SQL operations.
- The .cls file is compiled first via /api/quest/compile; the .script file runs after via XECUTE.
- If the quest uses a table that already exists from a prerequisite quest (check prerequisites), use a SINGLE script file only.
- In script files: use &sql(INSERT...), &sql(DECLARE/OPEN/FETCH/CLOSE), SQLCODE (NOT $SQLCODE — SQLCODE is a plain local variable set by &sql(), not a special variable), host variables (:tVar), WRITE, etc.
- DO NOT use ClassMethod, Method, or Class definition syntax in script files — this causes a compile error.
- IMPORTANT: SQLUser.Xyz maps to the ObjectScript class User.Xyz. Use "User.Xyz.cls" as the filename and "Class User.Xyz Extends %Persistent" in the class definition.` : `CRITICAL CONSTRAINT — file execution model:
- Each quest defines a "files" array. Generated quests for command/globals/snippet branches use a single script file.
- Script files (fileType: "script") run as plain ObjectScript commands via XECUTE — NOT inside a class or method.
- DO NOT use ClassMethod, Method, Class, or class-definition syntax in script files.
- Valid in script files: SET, WRITE, FOR, IF, DO, XECUTE, $ORDER, globals, etc.
- Invalid in script files: ClassMethod Foo() { ... } — this causes a compile error`}
${questCategoryBlock}
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
  ${isClassBranch ? `"files": [
    {
      "id": "cls-main",
      "filename": "Package.ClassName.cls",
      "fileType": "cls",
      "label": "Class Definition",
      "starterCode": "string (full Class ... Extends ... { ... } definition)",
      "starterCodeHint": "string (one-line comment orienting the player)"
    },
    {
      "id": "main",
      "filename": "solution.script",
      "fileType": "script",
      "label": "Solution Script",
      "dependsOn": ["cls-main"],
      "starterCode": "string (ObjectScript commands that use the compiled class)",
      "starterCodeHint": "string (one-line comment orienting the player)"
    }
  ],` : isSqlBranch ? `"files": [
    {
      "id": "cls-main",
      "filename": "User.TableName.cls",
      "fileType": "cls",
      "label": "Class Definition",
      "starterCode": "string (Class User.TableName Extends %Persistent { ... } — include all needed properties)",
      "starterCodeHint": "string (one-line comment orienting the player)"
    },
    {
      "id": "main",
      "filename": "solution.script",
      "fileType": "script",
      "label": "Solution",
      "dependsOn": ["cls-main"],
      "starterCode": "string (ObjectScript with &sql(...) embedded SQL — INSERT, DECLARE cursor, OPEN, FETCH, CLOSE)",
      "starterCodeHint": "string (one-line comment orienting the player without revealing logic)"
    }
  ],` : `"files": [
    {
      "id": "main",
      "filename": "solution.script",
      "fileType": "script",
      "label": "Solution",
      "starterCode": "string (valid ObjectScript commands)",
      "starterCodeHint": "string (one-line comment orienting the player without revealing logic)"
    }
  ],`}
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
