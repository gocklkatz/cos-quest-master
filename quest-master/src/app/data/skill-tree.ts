import { QuestTier } from '../models/quest.models';

export interface SkillBranch {
  id: string;
  label: string;
  description: string;
  /** IDs of branches that must have at least one completed quest to unlock this branch. */
  prerequisites: string[];
  tier: QuestTier;
  /** Grid row (1-based). Used to position the node in the tree layout. */
  row: number;
  /** Grid column (1-3). Used to position the node in the tree layout. */
  col: number;
}

export const SKILL_BRANCHES: SkillBranch[] = [
  {
    id: 'setup',
    label: 'Quest Zero',
    description: 'REST Setup & Execution',
    prerequisites: [],
    tier: 'apprentice',
    row: 1,
    col: 2,
  },
  {
    id: 'commands',
    label: 'Commands & Flow',
    description: 'WRITE, SET, IF/ELSE, FOR loops',
    prerequisites: ['setup'],
    tier: 'apprentice',
    row: 2,
    col: 1,
  },
  {
    id: 'globals',
    label: 'Globals & Data',
    description: '$ORDER, subscripts, persistence',
    prerequisites: ['setup'],
    tier: 'apprentice',
    row: 2,
    col: 2,
  },
  {
    id: 'strings',
    label: 'Strings & Functions',
    description: '$PIECE, $LENGTH, $EXTRACT, string ops',
    prerequisites: ['setup'],
    tier: 'apprentice',
    row: 2,
    col: 3,
  },
  {
    id: 'classes',
    label: 'Classes & OOP',
    description: '%Persistent, methods, properties',
    prerequisites: ['commands'],
    tier: 'journeyman',
    row: 3,
    col: 1,
  },
  {
    id: 'sql',
    label: 'SQL & Queries',
    description: 'Embedded SQL, %ResultSet, indices',
    prerequisites: ['globals'],
    tier: 'journeyman',
    row: 3,
    col: 2,
  },
  {
    id: 'json-rest',
    label: '%JSON & REST',
    description: '%JSON.Adaptor, REST dispatch, CSP',
    prerequisites: ['strings'],
    tier: 'journeyman',
    row: 3,
    col: 3,
  },
  {
    id: 'capstone',
    label: 'Capstone Project',
    description: 'Build a full ObjectScript application',
    prerequisites: ['classes', 'sql', 'json-rest'],
    tier: 'master',
    row: 4,
    col: 2,
  },
];
