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
    files: [
      {
        id: 'main',
        filename: 'solution.script',
        fileType: 'script',
        label: 'Solution',
        starterCode:
          '// Store your name in a variable\n' +
          'SET name = "Adventurer"\n\n' +
          '// Write a greeting that includes your name and "level 1"\n' +
          'WRITE "Greetings from the Guild! My name is " _ name _ ".", !',
        starterCodeHint: '// SET a variable, then WRITE a greeting that includes your name and "level 1"',
      },
    ],
    conceptsIntroduced: ['WRITE', 'SET', 'string concatenation', 'local variables'],
    docLinks: [
      { label: 'SET command', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RCOS_cset' },
      { label: 'WRITE command', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RCOS_cwrite' },
      { label: 'Local variables', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCOS_variables' },
    ],
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
      'Loop pattern: SET key="" FOR { SET key=$ORDER(^Guild("members",key)) QUIT:key="" WRITE ^Guild("members",key), ! }',
    ],
    bonusObjectives: [
      'Add a second level: store each member\'s class, e.g. SET ^Guild("members", 1, "class") = "Mage"',
      'Use $DATA to check whether a subscript exists before reading it',
    ],
    evaluationCriteria:
      'Must use SET to create ^Guild global with numeric subscripts. ' +
      'Must use $ORDER in a FOR loop to traverse. Output should list all 3 names.',
    prerequisites: ['quest-zero'],
    files: [
      {
        id: 'main',
        filename: 'solution.script',
        fileType: 'script',
        label: 'Solution',
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
        starterCodeHint: '// SET 3 subscripts in ^Guild("members", n), then iterate with $ORDER in a FOR loop',
      },
    ],
    conceptsIntroduced: ['globals', 'SET ^global', '$ORDER', 'FOR loop', 'subscripts', 'QUIT:postcondition'],
    docLinks: [
      { label: 'Globals overview', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GGBL_intro' },
      { label: '$ORDER function', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RCOS_forder' },
      { label: 'FOR command', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RCOS_cfor' },
    ],
  },

  // ─── Class-mode quests ───────────────────────────────────────────────────

  {
    id: 'classes-01',
    title: 'Craft the First Blueprint',
    branch: 'classes-extended',
    tier: 'apprentice',
    xpReward: 120,
    bonusXP: 40,
    narrative:
      'A master craftsman does not merely issue commands — he designs tools that endure. ' +
      'In IRIS, a Class is a blueprint: properties hold state, methods define behaviour, ' +
      'and compilation forges the design into executable form. ' +
      'Forge your first class and let the Guild greet every newcomer by name.',
    objective:
      'Define a class Guild.Greeter with a class method Greet(name As %String) that ' +
      'returns the string "Welcome to the Guild, " followed by the name. ' +
      'The test harness will call ##class(Guild.Greeter).Greet("Hero") — your output must ' +
      'contain "Welcome to the Guild, Hero".',
    hints: [
      'Start your file with: Class Guild.Greeter { }',
      'Inside the class body, declare: ClassMethod Greet(name As %String) As %String { }',
      'Return a value with: Quit "Welcome to the Guild, " _ name',
      'The test harness calls WRITE ##class(Guild.Greeter).Greet("Hero"), ! — make sure you return the string, not WRITE it.',
    ],
    bonusObjectives: [
      'Add a second method FormalGreet(name As %String) that returns "Hail and well met, " _ name _ "!"',
    ],
    evaluationCriteria:
      'Class must compile without errors. Test harness output must contain "Welcome to the Guild, Hero".',
    prerequisites: ['quest-zero'],
    testHarness: 'WRITE ##class(Guild.Greeter).Greet("Hero"), !',
    files: [
      {
        id: 'main',
        filename: 'Guild.Greeter.cls',
        fileType: 'cls',
        label: 'Guild.Greeter',
        starterCode:
          'Class Guild.Greeter\n' +
          '{\n\n' +
          'ClassMethod Greet(name As %String) As %String\n' +
          '{\n' +
          '  // Return a greeting string\n' +
          '  Quit ""\n' +
          '}\n\n' +
          '}',
        starterCodeHint: '// Class Guild.Greeter — define a ClassMethod Greet(name As %String) that returns a greeting string',
      },
    ],
    conceptsIntroduced: ['Class definition', 'ClassMethod', 'As %String', 'Quit (return)', '##class()'],
    docLinks: [
      { label: 'Defining classes', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_classes' },
      { label: 'Class methods', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_methods' },
      { label: '%String data type', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=ROBJ_datatype_string' },
    ],
  },

  {
    id: 'classes-02',
    title: 'The Persistent Ledger',
    branch: 'classes-extended',
    tier: 'journeyman',
    xpReward: 200,
    bonusXP: 60,
    narrative:
      'Commands vanish when the session ends; globals persist but lack structure. ' +
      'A %Persistent class gives you both — structured objects that survive across sessions, ' +
      'stored in the IRIS database with automatic SQL projection. ' +
      'Define the Guild\'s Member ledger so recruits can be saved and retrieved by ID.',
    objective:
      'Define a %Persistent class Guild.Member with properties Name (%String) and ' +
      'Rank (%String, default "Apprentice"). ' +
      'The test harness will create a member, save it, and re-open it by ID — ' +
      'your class must save and load without errors.',
    hints: [
      'Extend %Persistent: Class Guild.Member Extends %Persistent',
      'Declare a property: Property Name As %String;',
      'Set a default: Property Rank As %String [ InitialExpression = "Apprentice" ];',
      'The test harness calls %Save() and checks $$$ISOK(sc) — make sure it returns success.',
      '%OpenId(id) retrieves a saved instance — no extra code needed, it comes from %Persistent.',
    ],
    bonusObjectives: [
      'Add a Title property computed as Name _ " the " _ Rank using [ Calculated, SqlComputeCode, SqlComputed ]',
    ],
    evaluationCriteria:
      'Class must compile. Test harness must save a member and retrieve it by ID with matching Name.',
    prerequisites: ['classes-01'],
    testHarness:
      'SET m = ##class(Guild.Member).%New()\n' +
      'SET m.Name = "Aldric"\n' +
      'SET sc = m.%Save()\n' +
      'IF $$$ISOK(sc) {\n' +
      '  SET id = m.%Id()\n' +
      '  SET m2 = ##class(Guild.Member).%OpenId(id)\n' +
      '  WRITE "Saved: ", m2.Name, " (", m2.Rank, ")", !\n' +
      '} ELSE {\n' +
      '  WRITE "Save failed: ", $SYSTEM.Status.GetErrorText(sc), !\n' +
      '}',
    files: [
      {
        id: 'main',
        filename: 'Guild.Member.cls',
        fileType: 'cls',
        label: 'Guild.Member',
        starterCode:
          'Class Guild.Member Extends %Persistent\n' +
          '{\n\n' +
          'Property Name As %String;\n\n' +
          '// Add Rank property with default "Apprentice"\n\n' +
          '}',
        starterCodeHint: '// Class Guild.Member Extends %Persistent — add Name (%String) and Rank (%String) properties',
      },
    ],
    conceptsIntroduced: ['%Persistent', 'Property', '%Save', '%OpenId', '%Id', '$$$ISOK', 'InitialExpression'],
    docLinks: [
      { label: '%Persistent class', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_persobj' },
      { label: 'Defining properties', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_propers' },
      { label: 'Object persistence', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_persobj_saving' },
    ],
  },
];
