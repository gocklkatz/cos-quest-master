export type QuestTier = 'apprentice' | 'journeyman' | 'master';

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
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  bonusAchieved: string[];
  feedback: string;
  codeReview: string;
  xpEarned: number;
}
