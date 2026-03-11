export type QuestTier = 'apprentice' | 'journeyman' | 'master';

export interface QuestFile {
  id: string;
  filename: string;        // e.g. "Library.Book.cls" or "solution.script"
  fileType: 'cls' | 'script';
  label: string;           // shown in the file tab
  starterCode?: string;
  starterCodeHint?: string;
  readOnly?: boolean;
  dependsOn?: string[];    // file IDs that must be compiled before this one
}

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
  conceptsIntroduced: string[];
  docLinks?: { label: string; url: string }[];
  /** Ordered list of files; always at least one. Replaces top-level starterCode/mode/className. */
  files: QuestFile[];
  /** ObjectScript snippet auto-run after all files execute/compile successfully. */
  testHarness?: string;
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
  /** Runtime output from execution / test harness. */
  output: string;
  /**
   * 'compile' — errors came from .cls compilation (shown in the COMPILE ERRORS section).
   * 'execution' — errors came from script execution or network failure (shown in the error section).
   * Undefined when hasErrors is false.
   */
  errorKind?: 'compile' | 'execution';
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  bonusAchieved: string[];
  feedback: string;
  codeReview: string;
  xpEarned: number;
  followUpQuestion?: string;
}

/**
 * Upgrade a quest from the pre-Feature-6 shape (top-level starterCode/mode/className)
 * to the unified files[] shape. Safe to call on already-migrated quests.
 */
export function normalizeQuest(raw: any): Quest {
  if (Array.isArray(raw.files) && raw.files.length > 0) {
    return raw as Quest;
  }
  const isCls = raw.mode === 'class';
  const filename = isCls
    ? `${raw.className ?? 'Solution'}.cls`
    : 'solution.script';
  const file: QuestFile = {
    id: 'main',
    filename,
    fileType: isCls ? 'cls' : 'script',
    label: isCls ? (raw.className ?? 'Class') : 'Solution',
    starterCode: raw.starterCode,
    starterCodeHint: raw.starterCodeHint,
  };
  const { mode: _m, className: _c, starterCode: _s, starterCodeHint: _sh, ...rest } = raw;
  return { ...rest, files: [file] } as Quest;
}
