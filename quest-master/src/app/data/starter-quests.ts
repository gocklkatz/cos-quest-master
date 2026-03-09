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
    files: [
      {
        id: 'main',
        filename: 'solution.script',
        fileType: 'script',
        label: 'Solution',
        starterCode: 'WRITE "Anvil ready!", !',
        starterCodeHint: '// Write something to IRIS and check the output panel',
      },
    ],
    conceptsIntroduced: ['WRITE', 'IRIS execution', 'REST endpoint'],
    docLinks: [
      { label: 'WRITE command', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RCOS_cwrite' },
      { label: 'ObjectScript overview', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCOS_intro' },
    ],
  },
];
