import { IRISConfig } from './iris.models';
import { Quest } from './quest.models';

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
};
