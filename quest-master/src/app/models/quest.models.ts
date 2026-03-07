export type QuestTier = 'apprentice' | 'journeyman' | 'master';
export type QuestMode = 'snippet' | 'class' | 'project';

export interface Quest {
  id: string;
  title: string;
  branch: string;
  tier: QuestTier;
  xpReward: number;
  bonusXP: number;
  narrative: string;
  objective: string;
  hints: string[];
  bonusObjectives: string[];
  expectedOutput?: string | null;
  evaluationCriteria: string;
  prerequisites: string[];
  starterCode?: string;
  conceptsIntroduced: string[];
  docLinks?: { label: string; url: string }[];
  /** Defaults to 'snippet' for backwards compatibility. */
  mode?: QuestMode;
  /** ObjectScript snippet run after class compiles (class mode only). */
  testHarness?: string;
  /** e.g. "Guild.Member" — required when mode is 'class'. */
  className?: string;
  /** Shown instead of starterCode in challenge mode. A one-line orientation comment or skeleton. */
  starterCodeHint?: string;
}

export interface CompileError {
  line: number;
  col: number;
  text: string;
  severity: number;
}

export interface CompileResult {
  hasErrors: boolean;
  errors: CompileError[];
  /** Runtime output from the test harness; empty string if compile failed or no harness. */
  output: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  bonusAchieved: string[];
  feedback: string;
  codeReview: string;
  xpEarned: number;
}
