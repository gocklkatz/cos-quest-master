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

  // ── Capstone: Spiral Quests (F5) ─────────────────────────────────────────

  {
    id: 'capstone-01',
    title: 'The Living Record',
    branch: 'capstone',
    tier: 'master',
    xpReward: 300,
    bonusXP: 75,
    narrative:
      'Every Guild member is more than a name in a ledger — they are a living record, ' +
      'bound to the eternal archives by the magic of %Persistent. ' +
      'Define the GuildMember class and breathe life into the first entry. ' +
      'The scroll of SQL and the vault of Globals await what you create here.',
    objective:
      'Define a `User.GuildMember` class that extends `%Persistent` with at least three ' +
      'properties: `Name` (%String), `Rank` (%String), and `GuildXP` (%Integer). ' +
      'Then instantiate a member, set the properties, call `%Save()`, and write the assigned ID to the output.',
    hints: [
      'A %Persistent class stores its data automatically — you only need to define the properties and call %Save().',
      'Use ##class(User.GuildMember).%New() to create an instance, then set .Name, .Rank, .GuildXP.',
      'Check the return value of %Save(): SET sc = member.%Save() — if sc is 1, it succeeded.',
      'Write the ID with: WRITE "Saved ID: ", member.%Id(), !',
      'The class file must compile before the script can run — use the file tabs to compile first.',
    ],
    bonusObjectives: [
      'Check $System.Status.IsOK(sc) to verify the save was successful before writing the ID.',
    ],
    evaluationCriteria:
      'The User.GuildMember class must extend %Persistent and define Name, Rank, and GuildXP properties. ' +
      'The script must instantiate the class, set at least two properties, call %Save(), and write the resulting ID to output. ' +
      'The ID must be a positive integer. Accept any valid property values.',
    prerequisites: [],
    files: [
      {
        id: 'guild-member-cls',
        filename: 'User.GuildMember.cls',
        fileType: 'cls',
        label: 'GuildMember',
        starterCode:
          'Class User.GuildMember Extends %Persistent\n' +
          '{\n\n' +
          'Property Name As %String;\n\n' +
          'Property Rank As %String;\n\n' +
          'Property GuildXP As %Integer;\n\n' +
          '}',
      },
      {
        id: 'main',
        filename: 'solution.script',
        fileType: 'script',
        label: 'Solution',
        dependsOn: ['guild-member-cls'],
        starterCode:
          'SET member = ##class(User.GuildMember).%New()\n' +
          'SET member.Name = "Aldric"\n' +
          'SET member.Rank = "Apprentice"\n' +
          'SET member.GuildXP = 0\n' +
          'SET sc = member.%Save()\n' +
          'WRITE "Saved ID: ", member.%Id(), !',
      },
    ],
    conceptsIntroduced: ['%Persistent', '%New', '%Save', 'properties', 'object identity'],
    docLinks: [
      { label: '%Persistent class', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_persobj' },
      { label: 'Defining properties', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GOBJ_propmethods' },
    ],
  },

  {
    id: 'capstone-02',
    title: 'The Scroll of Records',
    branch: 'capstone',
    tier: 'master',
    xpReward: 300,
    bonusXP: 75,
    narrative:
      'The Guild archivist does not rummage through shelves one scroll at a time — ' +
      'she speaks a query and the vault answers. ' +
      'The same GuildMember you bound with %Save() in the last quest ' +
      'can be retrieved through a completely different door: SQL. ' +
      'Same data. Different lens.',
    objective:
      'Use embedded SQL (`&sql(...)`) to SELECT at least the ID and Name from `User.GuildMember` ' +
      'and write the result to output. Confirm that the row saved in capstone-01 is visible through the SQL layer.',
    hints: [
      'Embedded SQL syntax: &sql(SELECT ID, Name INTO :tID, :tName FROM User.GuildMember)',
      'SQLCODE is 0 on success and 100 when no rows are found — always check it.',
      'WRITE "SQLCODE: ", SQLCODE, ! to diagnose issues.',
      'The table name matches the class name: User.GuildMember → schema "User", table "GuildMember".',
      'If SQLCODE is 100 (no rows), make sure you completed capstone-01 first so a row exists.',
    ],
    bonusObjectives: [
      'Retrieve all columns (ID, Name, Rank, GuildXP) and format them as a readable report.',
    ],
    evaluationCriteria:
      'The code must use &sql() or %SQL.Statement to SELECT from User.GuildMember and retrieve at least one row. ' +
      'Accept any valid SQL query against the User.GuildMember table. ' +
      'The output must show at least one field value from the stored record. ' +
      'Do not require a specific ID — accept any row returned by the query.',
    prerequisites: ['capstone-01'],
    files: [
      {
        id: 'main',
        filename: 'solution.script',
        fileType: 'script',
        label: 'Solution',
        starterCode:
          '&sql(SELECT ID, Name, Rank INTO :tID, :tName, :tRank FROM User.GuildMember)\n' +
          'WRITE "SQLCODE: ", SQLCODE, !\n' +
          'WRITE "ID: ", tID, " | Name: ", tName, " | Rank: ", tRank, !',
      },
    ],
    conceptsIntroduced: ['embedded SQL', '&sql', 'SQLCODE', 'SQL table projection'],
    docLinks: [
      { label: 'Embedded SQL', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GSQL_esql' },
      { label: 'SQLCODE values', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RSQL_sqlcode' },
    ],
  },

  {
    id: 'capstone-03',
    title: 'The Eternal Archive',
    branch: 'capstone',
    tier: 'master',
    xpReward: 400,
    bonusXP: 100,
    narrative:
      'Beneath the polished surface of Objects and the elegant grammar of SQL ' +
      'lies something older: the Global. ' +
      'Every property you set, every row you queried — all of it lives in a raw subscripted node, ' +
      'exactly as IRIS wrote it. ' +
      'Today you reach past the abstractions and touch the stone itself.',
    objective:
      'Use `$ORDER` to walk the `^User.GuildMemberD` global and read the raw storage node ' +
      'for the GuildMember created in capstone-01. Write the first stored key and its raw data value to output.',
    hints: [
      'The default storage global for User.GuildMember is ^User.GuildMemberD.',
      'Use $ORDER(^User.GuildMemberD(""), "") to find the first stored ID.',
      'SET tKey = $ORDER(^User.GuildMemberD(""))',
      'The raw data for that key is in ^User.GuildMemberD(tKey) — write it to see the serialized properties.',
      'Open the Global Tree Visualizer (Tree tab in the navbar) to see ^User.GuildMemberD rendered as a live tree.',
    ],
    bonusObjectives: [
      'Use a FOR loop with $ORDER to iterate all stored IDs and print each raw node.',
    ],
    evaluationCriteria:
      'The code must use $ORDER on ^User.GuildMemberD to locate at least one stored key, ' +
      'and must write the raw global node value (^User.GuildMemberD(key)) to output. ' +
      'Accept any valid $ORDER traversal pattern. ' +
      'The output must contain a non-empty global node value, confirming the player accessed the underlying storage.',
    prerequisites: ['capstone-02'],
    files: [
      {
        id: 'main',
        filename: 'solution.script',
        fileType: 'script',
        label: 'Solution',
        starterCode:
          'SET tKey = $ORDER(^User.GuildMemberD(""))\n' +
          'WRITE "First stored key: ", tKey, !\n' +
          'WRITE "Raw data node: ", ^User.GuildMemberD(tKey), !',
      },
    ],
    conceptsIntroduced: ['$ORDER', 'global storage', '^GuildMemberD', 'IRIS unified data model'],
    docLinks: [
      { label: '$ORDER function', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=RCOS_forder' },
      { label: 'Global storage overview', url: 'https://docs.intersystems.com/irislatest/csp/docbook/DocBook.UI.Page.cls?KEY=GCOS_globals' },
    ],
  },
];
