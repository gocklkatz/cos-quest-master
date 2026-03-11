export interface BranchStage {
  branch: string;
  /** Number of completed quests required in this branch before advancing. null = terminal. */
  minQuestsToAdvance: number | null;
}

export const BRANCH_PROGRESSION: BranchStage[] = [
  { branch: 'setup',    minQuestsToAdvance: 3 },   // quest-zero counts; 2 more generated quests needed
  { branch: 'commands', minQuestsToAdvance: 5 },
  { branch: 'globals',  minQuestsToAdvance: 5 },
  { branch: 'classes',  minQuestsToAdvance: 5 },
  { branch: 'sql',      minQuestsToAdvance: 3 },   // focused bridge before capstone
  { branch: 'capstone', minQuestsToAdvance: null }, // terminal — F5 Spiral Quests live here
];

/** Human-readable names for each branch, used in UI notifications. */
export const BRANCH_DISPLAY_NAMES: Record<string, string> = {
  setup:    'Setup',
  commands: 'Commands',
  globals:  'Global Variables',
  classes:  'Classes',
  sql:      'SQL',
  capstone: 'Capstone',
};
