import { Quest } from '../models/quest.models';

export const STARTER_QUESTS: Quest[] = [
  {
    id: 'quest-zero',
    title: 'Forge the Anvil',
    branch: 'setup',
    tier: 'apprentice',
    xpReward: 100,
    bonusXP: 25,
    narrative:
      'Before your training can begin, the Guild needs a way to test your work. ' +
      'The Anvil — a REST endpoint that can receive code, execute it on IRIS, ' +
      'and return the results — must be verified and ready. ' +
      'Without it, no quest can be graded.',
    objective:
      'Verify that the QuestMaster REST endpoint is working. Run the starter ' +
      'code and confirm it executes on IRIS without errors. ' +
      'A successful execution proves the Anvil is forged and the Guild can receive your work.',
    hints: [
      'Run WRITE "Anvil ready!", ! and check the output panel for the text.',
      'If you see an error, check that Docker is running and the IRIS container is up.',
      'The endpoint is at /api/quest/execute, proxied from the Angular dev server.',
    ],
    bonusObjectives: [
      'Run WRITE $ZVersion, ! to see the IRIS version you are using',
    ],
    evaluationCriteria:
      'Code must execute without errors on IRIS. Any successful run proves the endpoint works.',
    prerequisites: [],
    starterCode: 'WRITE "Anvil ready!", !',
    conceptsIntroduced: ['WRITE', 'IRIS execution', 'REST endpoint'],
  },
  {
    id: 'commands-01',
    title: 'Hello, Guildmate',
    branch: 'commands',
    tier: 'apprentice',
    xpReward: 30,
    bonusXP: 10,
    narrative:
      'Every adventurer must learn to speak. In ObjectScript, WRITE is your voice ' +
      'and SET plants knowledge in memory. Let the Guild hear you for the first time.',
    objective:
      "Write code that outputs a greeting containing: your name (stored in a variable), " +
      "and the phrase 'level 1'. Use SET to store your name and WRITE to display the message.",
    hints: [
      'SET name = "Stefan" stores a value in a local variable.',
      'WRITE concatenates with the underscore: WRITE "Hello " _ name',
      'Use WRITE ! to print a newline between lines.',
    ],
    bonusObjectives: [
      'Store your level in a second variable and use it in the output instead of hardcoding "1"',
    ],
    expectedOutput: null,
    evaluationCriteria:
      'Code must use SET and WRITE. Output must include a greeting, a name stored in a variable, ' +
      'and "level 1". Bonus if level is also stored in a variable.',
    prerequisites: ['quest-zero'],
    starterCode:
      '// Store your name in a variable\n' +
      'SET name = "Adventurer"\n\n' +
      '// Write a greeting that includes your name and "level 1"\n' +
      'WRITE "Greetings from the Guild! My name is " _ name _ ".", !',
    conceptsIntroduced: ['WRITE', 'SET', 'string concatenation', 'local variables'],
  },
  {
    id: 'globals-01',
    title: "The Adventurer's Ledger",
    branch: 'globals',
    tier: 'apprentice',
    xpReward: 50,
    bonusXP: 20,
    narrative:
      'The Guild keeps its records not in dusty books, but in the Globals — ' +
      'a vast tree of knowledge that persists between sessions and across processes. ' +
      'Learn to read and write the Ledger, and you will command the memory of IRIS itself.',
    objective:
      'Create a global ^Guild("members") that stores 3 guild member names with ' +
      'numeric subscripts (1, 2, 3). Then write a FOR loop using $ORDER to iterate ' +
      'through all members and WRITE each name.',
    hints: [
      'SET ^Guild("members", 1) = "Aldric" stores a value at a subscript.',
      '$ORDER(^Guild("members", "")) returns the first subscript key.',
      'Loop pattern: SET key="" FOR { SET key=$ORDER(^Guild("members",key))  QUIT:key=""  WRITE ^Guild("members",key), ! }',
    ],
    bonusObjectives: [
      'Add a second level: store each member\'s class, e.g. SET ^Guild("members", 1, "class") = "Mage"',
      'Use $DATA to check whether a subscript exists before reading it',
    ],
    evaluationCriteria:
      'Must use SET to create ^Guild global with numeric subscripts. ' +
      'Must use $ORDER in a FOR loop to traverse. Output should list all 3 names.',
    prerequisites: ['quest-zero'],
    starterCode:
      '// Create guild member globals\n' +
      'SET ^Guild("members", 1) = "Aldric"\n' +
      '// Add two more members below...\n\n\n' +
      '// Iterate with $ORDER\n' +
      'SET key = ""\n' +
      'FOR {\n' +
      '  SET key = $ORDER(^Guild("members", key))\n' +
      '  QUIT:key=""\n' +
      '  WRITE ^Guild("members", key), !\n' +
      '}',
    conceptsIntroduced: ['globals', 'SET ^global', '$ORDER', 'FOR loop', 'subscripts', 'QUIT:postcondition'],
  },
];
