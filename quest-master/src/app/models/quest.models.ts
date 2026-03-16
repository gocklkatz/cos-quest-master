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
  /** Omitted / 'standard' for normal quests; 'prediction' for read-only multiple-choice quests. */
  questType?: 'standard' | 'prediction';
  /** For prediction quests: 3–4 possible output strings to choose from. */
  choices?: string[];
  /** For prediction quests: the entry in choices that is correct. */
  correctAnswer?: string;
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
    const quest = raw as Quest;
    // Defensive: ensure fileType matches the filename extension.
    // Guards against AI returning fileType:"script" for .cls files and stale localStorage quests.
    for (const file of quest.files) {
      if (file.filename.endsWith('.cls')) file.fileType = 'cls';
      else if (file.filename.endsWith('.script')) file.fileType = 'script';
    }
    // Defensive: ensure all file IDs are unique. Duplicate IDs prevent tab switching
    // because the selectFile() guard (fileId !== activeFileId) is always false for
    // every file that shares the active file's ID. This happens when the AI generates
    // extra files for a prediction quest without following the schema's unique-ID convention.
    const seenIds = new Set<string>();
    for (const file of quest.files) {
      if (!file.id || seenIds.has(file.id)) {
        // Generate a unique ID based on the filename (without extension).
        const base = file.filename?.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'file';
        let candidate = base;
        let n = 2;
        while (seenIds.has(candidate)) candidate = `${base}-${n++}`;
        file.id = candidate;
      }
      seenIds.add(file.id);
    }
    return quest;
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
