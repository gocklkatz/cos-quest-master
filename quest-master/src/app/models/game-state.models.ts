import { IRISConfig } from './iris.models';
import { Quest } from './quest.models';

export type DifficultyPreference = 'beginner' | 'intermediate' | 'advanced';
export type AdvancedFocus = 'oop' | 'sql';

export interface QuestLogEntry {
  questId: string;
  title: string;
  completedAt: string;
  score: number;
  xpEarned: number;
  codeSubmitted: string;
  feedback: string;
}

export interface GameState {
  playerName: string;
  xp: number;
  level: number;
  completedQuests: string[];
  currentQuestId: string | null;
  questLog: QuestLogEntry[];
  coveredConcepts: string[];
  unlockedBranches: string[];
  irisConfig: IRISConfig;
  anthropicApiKey: string;
  questBank: Quest[];
  /** When true, new quests load with starterCodeHint (or empty) instead of starterCode. Default: false. */
  challengeMode: boolean;
  /** IDs of achievements the player has unlocked. */
  unlockedAchievements: string[];
  /** Number of consecutive quests completed without revealing any hints. */
  noHintsStreak: number;
  /** The branch currently being used for quest generation. Persisted across sessions. */
  currentBranch: string;
  /** Player's daily active-time goal in minutes. 0 = no goal / progress bar hidden. Default: 20. */
  dailyGoalMinutes: number;
  /** Accumulated active seconds per calendar day. Key = ISO date YYYY-MM-DD. */
  timeLog: Record<string, number>;
  /** Lifetime XP across all prestige runs. Never resets. */
  totalXpAllTime: number;
  /** Number of times the player has completed the full curriculum. Increments on prestige. */
  prestigeLevel: number;
  /** Explicit difficulty preference set by the player. null = not yet set (triggers first-run prompt). */
  difficultyPreference: DifficultyPreference | null;
  /** Advanced sub-track focus. Non-null only when difficultyPreference === 'advanced'. */
  advancedFocus: AdvancedFocus | null;
}

export const DEFAULT_IRIS_CONFIG: IRISConfig = {
  baseUrl: 'http://localhost:52773',
  namespace: 'USER',
  username: '_SYSTEM',
  password: 'SYS',
};

export const DEFAULT_GAME_STATE: GameState = {
  playerName: '',
  xp: 0,
  level: 1,
  completedQuests: [],
  currentQuestId: null,
  questLog: [],
  coveredConcepts: [],
  unlockedBranches: ['setup'],
  irisConfig: DEFAULT_IRIS_CONFIG,
  anthropicApiKey: '',
  questBank: [],
  challengeMode: false,
  unlockedAchievements: [],
  noHintsStreak: 0,
  currentBranch: 'setup',
  dailyGoalMinutes: 20,
  timeLog: {},
  totalXpAllTime: 0,
  prestigeLevel: 0,
  difficultyPreference: null,
  advancedFocus: null,
};
