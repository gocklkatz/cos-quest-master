export interface BranchStage {
  branch: string;
  /** Number of completed quests required in this branch before advancing. null = terminal. */
  minQuestsToAdvance: number | null;
}

export const BRANCH_PROGRESSION: BranchStage[] = [
  { branch: 'setup',                  minQuestsToAdvance: 3 },
  { branch: 'commands',               minQuestsToAdvance: 5 },
  { branch: 'globals',                minQuestsToAdvance: 5 },
  { branch: 'classes-properties',     minQuestsToAdvance: 4 },
  { branch: 'classes-methods',        minQuestsToAdvance: 4 },
  { branch: 'classes-inheritance',    minQuestsToAdvance: 4 },
  { branch: 'classes-relationships',  minQuestsToAdvance: 4 },
  { branch: 'sql-queries',            minQuestsToAdvance: 3 },
  { branch: 'sql-joins',              minQuestsToAdvance: 3 },
  { branch: 'sql-aggregation',        minQuestsToAdvance: 3 },
  { branch: 'sql-embedded',           minQuestsToAdvance: 3 },
  { branch: 'capstone',               minQuestsToAdvance: null },
];

/** Human-readable names for each branch, used in UI notifications. */
export const BRANCH_DISPLAY_NAMES: Record<string, string> = {
  setup:                  'Setup',
  commands:               'Commands',
  globals:                'Global Variables',
  'classes-properties':   'Classes: Properties',
  'classes-methods':      'Classes: Methods',
  'classes-inheritance':  'Classes: Inheritance',
  'classes-relationships':'Classes: Relationships',
  'sql-queries':          'SQL: Queries',
  'sql-joins':            'SQL: Joins',
  'sql-aggregation':      'SQL: Aggregation',
  'sql-embedded':         'SQL: Embedded',
  capstone:               'Capstone',
};

/** Claude-facing topic descriptions used in quest generation prompts. */
export const BRANCH_TOPIC_DESCRIPTIONS: Record<string, string> = {
  setup:
    'IRIS setup, namespace configuration, and writing first ObjectScript programs',
  commands:
    'ObjectScript commands: Set, Write, If/Else, For, While, Quit, Kill, ZWrite',
  globals:
    'global variables: subscripted storage, $ORDER traversal, $DATA existence checks, $KILL patterns',
  'classes-properties':
    'class definitions, property declarations, %Persistent vs %RegisteredObject, scalar data types (String, Integer, Date), instance vs class-level (%%) properties, %New() and basic %Save()',
  'classes-methods':
    'instance methods vs class methods (##class / %%), parameter passing by value and reference (.param), return values, %Open() by ID, method chaining, %Save() / %Delete() object lifecycle',
  'classes-inheritance':
    '%Extends keyword, method overriding with %Super calls, property inheritance, defining and extending abstract superclasses, runtime polymorphism',
  'classes-relationships':
    'Relationship properties, one-to-many and parent-child %Relationship declarations, cascade save and delete behaviour, traversing relationships in ObjectScript',
  'sql-queries':
    'basic SELECT queries, WHERE clauses, ORDER BY, TOP/LIMIT, column aliases, and the &sql() macro for embedding SQL inside ObjectScript scripts',
  'sql-joins':
    'SQL INNER JOIN and LEFT JOIN, multi-table queries, table aliasing, joining %Persistent class-mapped tables',
  'sql-aggregation':
    'aggregate functions COUNT, SUM, AVG, MAX, MIN, GROUP BY, HAVING — applied to ObjectScript-mapped tables',
  'sql-embedded':
    'dynamic SQL with %SQL.Statement, %Prepare(), %Execute(), %sqlcode / %ROWCOUNT error handling, cursor-based result iteration with %SQL.StatementResult',
  capstone:
    'comprehensive ObjectScript — combining globals, classes, and SQL in a single integrated solution',
};
