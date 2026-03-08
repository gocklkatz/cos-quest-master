import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Base game state seeded into localStorage before each test. */
const BASE_STATE = {
  playerName: 'Tester',
  xp: 0,
  level: 1,
  completedQuests: [] as string[],
  currentQuestId: null as string | null,
  questLog: [] as unknown[],
  coveredConcepts: [] as string[],
  unlockedBranches: ['setup'] as string[],
  irisConfig: {
    baseUrl: 'http://localhost:52773',
    namespace: 'USER',
    username: '_SYSTEM',
    password: 'password',
  },
  anthropicApiKey: '',
  questBank: [],
};

/** Seed localStorage and load the app. */
async function loadApp(page: Page, stateOverride: Partial<typeof BASE_STATE> = {}) {
  const state = { ...BASE_STATE, ...stateOverride };
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.setItem('questmaster', JSON.stringify(s));
  }, state);
  await page.reload();
  // Wait for the Angular app to bootstrap and the quest panel to render.
  await page.waitForSelector('app-quest-panel', { timeout: 15_000 });
}

/**
 * Set the Monaco editor content via the Monaco JS API (reliable across all OS/keyboard layouts).
 */
async function setEditorCode(page: Page, code: string) {
  await page.waitForFunction(() => {
    const w = window as unknown as { monaco?: { editor?: { getEditors?: () => unknown[] } } };
    return w.monaco?.editor?.getEditors?.()?.length ?? 0 > 0;
  }, { timeout: 15_000 });

  await page.evaluate((code: string) => {
    const w = window as unknown as { monaco: { editor: { getEditors: () => { setValue: (v: string) => void }[] } } };
    w.monaco.editor.getEditors()[0].setValue(code);
  }, code);
}

/** Click "Run on IRIS" and wait for the output panel to show a result. */
async function runCode(page: Page) {
  await page.getByRole('button', { name: /Run on IRIS/i }).click();
  // Wait until the running spinner disappears and output content appears.
  await page.waitForFunction(
    () => !document.querySelector('.running-badge'),
    { timeout: 20_000 },
  );
}

/** Click Submit and wait for the evaluation block to appear in the quest panel. */
async function submitCode(page: Page) {
  await page.getByRole('button', { name: /Submit/i }).click();
  await page.waitForSelector('.evaluation-section', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Checklist item 1: IRIS connection from browser
// ---------------------------------------------------------------------------

test('Connection: IRIS Docker reachable via proxy — indicator shows connected', async ({ page }) => {
  await loadApp(page);

  // The connection-indicator element should reach the "connected" class within 15 s.
  const indicator = page.locator('.connection-indicator.connected');
  await expect(indicator).toBeVisible({ timeout: 15_000 });
  await expect(indicator).toContainText('IRIS Connected');
});

// ---------------------------------------------------------------------------
// Quest 0 — "Forge the Anvil"
// ---------------------------------------------------------------------------

test('Quest 0: Forge the Anvil — starter code runs and quest completes', async ({ page }) => {
  await loadApp(page);

  // Quest Zero should be auto-selected on a fresh state.
  await expect(page.locator('.quest-title')).toHaveText('Forge the Anvil');

  // The starter code is pre-loaded — just run it.
  await runCode(page);

  // Output panel must contain "Anvil ready!" with no error.
  const outputBody = page.locator('.output-body');
  await expect(outputBody).toContainText('Anvil ready!');
  await expect(outputBody.locator('.error')).toHaveCount(0);

  // Submit and verify the quest passes.
  await submitCode(page);
  const evalSection = page.locator('.evaluation-section');
  await expect(evalSection).toHaveClass(/passed/);
  await expect(evalSection).toContainText('Quest Complete');
  await expect(evalSection).toContainText('XP earned');

  // XP bar in the header must have increased.
  await expect(page.locator('.xp-label')).toContainText('XP:');
  const xpText = await page.locator('.xp-label').textContent();
  const xp = parseInt(xpText?.match(/XP:\s*(\d+)/)?.[1] ?? '0');
  expect(xp).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Quest 1 — "Hello, Guildmate"
// ---------------------------------------------------------------------------

test('Quest 1: Hello, Guildmate — SET + WRITE with name and "level 1" passes', async ({ page }) => {
  // Seed state with Quest Zero already completed.
  await loadApp(page, {
    xp: 100,
    level: 1,
    completedQuests: ['quest-zero'],
    currentQuestId: 'commands-01',
    coveredConcepts: ['WRITE', 'IRIS execution', 'REST endpoint'],
    unlockedBranches: ['setup', 'commands'],
  });

  await expect(page.locator('.quest-title')).toHaveText('Hello, Guildmate');

  const code = [
    'SET name = "Aldric"',
    'SET lvl = 1',
    'WRITE "Greetings from the Guild! My name is " _ name _ ". I am level " _ lvl _ ".", !',
  ].join('\n');

  await setEditorCode(page, code);
  await runCode(page);

  // Output must contain the name and "level 1".
  const outputBody = page.locator('.output-body');
  await expect(outputBody).toContainText('Aldric');
  await expect(outputBody).toContainText('level 1');
  await expect(outputBody.locator('.error')).toHaveCount(0);

  await submitCode(page);
  const evalSection = page.locator('.evaluation-section');
  await expect(evalSection).toHaveClass(/passed/);
  await expect(evalSection).toContainText('Quest Complete');
});

// ---------------------------------------------------------------------------
// Quest 2 — "The Adventurer's Ledger"
// ---------------------------------------------------------------------------

test("Quest 2: The Adventurer's Ledger — globals + $ORDER FOR loop passes", async ({ page }) => {
  await loadApp(page, {
    xp: 130,
    level: 2,
    completedQuests: ['quest-zero', 'commands-01'],
    currentQuestId: 'globals-01',
    coveredConcepts: ['WRITE', 'SET', 'string concatenation', 'local variables'],
    unlockedBranches: ['setup', 'commands', 'globals'],
  });

  await expect(page.locator('.quest-title')).toHaveText("The Adventurer's Ledger");

  // Three members + block-style FOR (now supported via temp-class compilation).
  const code = [
    'SET ^Guild("members", 1) = "Aldric"',
    'SET ^Guild("members", 2) = "Bram"',
    'SET ^Guild("members", 3) = "Cara"',
    'SET key = ""',
    'FOR {',
    '  SET key = $ORDER(^Guild("members", key))',
    '  QUIT:key=""',
    '  WRITE ^Guild("members", key), !',
    '}',
  ].join('\n');

  await setEditorCode(page, code);
  await runCode(page);

  // Output must list all three names without errors.
  const outputBody = page.locator('.output-body');
  await expect(outputBody).toContainText('Aldric');
  await expect(outputBody).toContainText('Bram');
  await expect(outputBody).toContainText('Cara');
  await expect(outputBody.locator('.error')).toHaveCount(0);

  await submitCode(page);
  const evalSection = page.locator('.evaluation-section');
  await expect(evalSection).toHaveClass(/passed/);
  await expect(evalSection).toContainText('Quest Complete');
});

// ---------------------------------------------------------------------------
// Checklist item 5: Code evaluation via Claude API
// ---------------------------------------------------------------------------

test('Claude API: evaluation uses Claude when API key is set (intercepted)', async ({ page }) => {
  // Intercept the Anthropic API call and return a mock evaluation response.
  const mockEvaluation = {
    passed: true,
    score: 95,
    bonusAchieved: [],
    feedback: 'Excellent work! Your WRITE command executed perfectly.',
    codeReview: 'Clean and idiomatic ObjectScript.',
    xpEarned: 100,
  };

  await page.route('https://api.anthropic.com/v1/messages', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(mockEvaluation) }],
      }),
    });
  });

  // Load the app with a (fake) API key — this switches submitCode() to the Claude path.
  await loadApp(page, { anthropicApiKey: 'sk-ant-test-key' });

  await expect(page.locator('.quest-title')).toHaveText('Forge the Anvil');

  // Run the starter code so there is output to evaluate.
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Anvil ready!');

  // Submit — should hit our intercepted Claude route, not evaluateSimple.
  await submitCode(page);

  const evalSection = page.locator('.evaluation-section');
  await expect(evalSection).toHaveClass(/passed/);
  // The mock feedback text proves the Claude path was used, not the simple fallback.
  await expect(evalSection).toContainText('Excellent work!');
  await expect(evalSection).toContainText('XP earned');
});

// ---------------------------------------------------------------------------
// Checklist item 6: Quest generation produces valid quests
// ---------------------------------------------------------------------------

test('Quest generation: generated quest appears in quest list and is selectable', async ({ page }) => {
  /** Mock quest returned by the generation API call. */
  const mockGeneratedQuest = {
    id: 'commands-02',
    title: 'The Counting Sentinel',
    branch: 'commands',
    tier: 'apprentice',
    xpReward: 40,
    bonusXP: 15,
    narrative: 'A sentinel counts guild members as they pass through the gate...',
    objective: 'Use a FOR loop to WRITE the numbers 1 through 5, one per line.',
    hints: [
      'FOR i=1:1:5 loops from 1 to 5 inclusive.',
      'WRITE i, ! prints each number on its own line.',
      'The loop variable i increments automatically.',
    ],
    bonusObjectives: ['Count backwards from 5 to 1 using FOR i=5:-1:1'],
    expectedOutput: null,
    evaluationCriteria: 'Must use a FOR loop. Output must include the numbers 1 through 5.',
    prerequisites: ['commands-01'],
    starterCode: 'FOR i=1:1:5 {\n  WRITE i, !\n}',
    conceptsIntroduced: ['FOR loop', 'iteration', 'loop variable'],
  };

  const mockEvaluation = {
    passed: true,
    score: 90,
    bonusAchieved: [],
    feedback: 'Well done! SET and WRITE used correctly.',
    codeReview: 'Clean, idiomatic ObjectScript.',
    xpEarned: 30,
  };

  // Intercept all Anthropic API calls and route by purpose.
  await page.route('https://api.anthropic.com/v1/messages', async route => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    const isGeneration = typeof body.system === 'string' && body.system.includes('Generate quests');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(isGeneration ? mockGeneratedQuest : mockEvaluation) }],
      }),
    });
  });

  // commands-01 is the only active quest (quest-zero and globals-01 already done),
  // so completing it will push activeQuests.length to 0 < 2, triggering generation.
  await loadApp(page, {
    anthropicApiKey: 'sk-ant-test-key',
    xp: 150,
    level: 2,
    completedQuests: ['quest-zero', 'globals-01'],
    currentQuestId: 'commands-01',
    coveredConcepts: ['WRITE', 'IRIS execution', 'globals', 'SET ^global', '$ORDER'],
    unlockedBranches: ['setup', 'commands', 'globals'],
  });

  await expect(page.locator('.quest-title')).toHaveText('Hello, Guildmate');

  // Run valid code for commands-01.
  const code = [
    'SET name = "Aldric"',
    'SET lvl = 1',
    'WRITE "Greetings from the Guild! My name is " _ name _ ". I am level " _ lvl _ ".", !',
  ].join('\n');

  await setEditorCode(page, code);
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Aldric');

  // Submit — evaluation mock returns passed, then generation is triggered automatically.
  await submitCode(page);
  await expect(page.locator('.evaluation-section')).toHaveClass(/passed/);

  // The generated quest must appear in the quest list within a reasonable timeout.
  const generatedItem = page.locator('.quest-list-title', { hasText: 'The Counting Sentinel' });
  await expect(generatedItem).toBeVisible({ timeout: 15_000 });

  // Click the generated quest and verify its details load correctly.
  await generatedItem.click();
  await expect(page.locator('.quest-title')).toHaveText('The Counting Sentinel');
  await expect(page.locator('.tier-badge')).toBeVisible();
  await expect(page.locator('.objective-text')).toContainText('FOR loop');
});

// ---------------------------------------------------------------------------
// Checklist item 7: XP and level persist across page reloads
// ---------------------------------------------------------------------------

test('State: XP and level persist across a page reload', async ({ page }) => {
  // Fresh state, no API key — simple evaluation is used, no network mocking needed.
  await loadApp(page);

  await expect(page.locator('.quest-title')).toHaveText('Forge the Anvil');

  // Run and submit the starter code to earn XP (quest-zero awards 100 XP).
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Anvil ready!');
  await submitCode(page);
  await expect(page.locator('.evaluation-section')).toHaveClass(/passed/);

  // Capture the XP and level shown in the header after completing the quest.
  const xpLabelText = await page.locator('.xp-label').textContent();
  const xp = parseInt(xpLabelText?.match(/XP:\s*(\d+)/)?.[1] ?? '0');
  expect(xp).toBeGreaterThan(0);
  const levelText = await page.locator('.level-badge').textContent();
  expect(levelText).toMatch(/Level \d+/);

  // Reload — this clears in-memory state and forces the app to read from localStorage.
  await page.reload();
  await page.waitForSelector('app-quest-panel', { timeout: 15_000 });

  // XP and level must be restored from localStorage.
  await expect(page.locator('.xp-label')).toContainText(`XP: ${xp}`);
  await expect(page.locator('.level-badge')).toContainText(levelText!);
});

// ---------------------------------------------------------------------------
// Checklist item 8: App is usable without Claude API key (fallback mode)
// ---------------------------------------------------------------------------

test('Fallback mode: AI-disabled banner is shown when no API key is set', async ({ page }) => {
  await loadApp(page); // no anthropicApiKey

  // The banner must be visible and explain that AI features are disabled.
  const banner = page.locator('.ai-disabled-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('AI features disabled');
  await expect(banner).toContainText('Settings');
});

test('Fallback mode: AI-disabled banner is hidden when API key is configured', async ({ page }) => {
  await loadApp(page, { anthropicApiKey: 'sk-ant-test-key' });

  await expect(page.locator('.ai-disabled-banner')).not.toBeVisible();
});

test('Fallback mode: quests are completable and award XP without an API key', async ({ page }) => {
  // Intercept Anthropic to fail loudly if the fallback accidentally calls it.
  await page.route('https://api.anthropic.com/v1/messages', route =>
    route.abort('failed'),
  );

  await loadApp(page); // no API key

  await expect(page.locator('.quest-title')).toHaveText('Forge the Anvil');

  // Run and submit — must use simple evaluation, not Claude.
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Anvil ready!');
  await submitCode(page);

  const evalSection = page.locator('.evaluation-section');
  await expect(evalSection).toHaveClass(/passed/);
  await expect(evalSection).toContainText('XP earned');

  // XP bar should reflect the reward.
  const xpText = await page.locator('.xp-label').textContent();
  const xp = parseInt(xpText?.match(/XP:\s*(\d+)/)?.[1] ?? '0');
  expect(xp).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Checklist item 9: CORS / proxy errors are handled gracefully with helpful messages
// ---------------------------------------------------------------------------

test('Error handling: network failure on execute shows helpful IRIS-unreachable message', async ({ page }) => {
  // Abort the execute endpoint to simulate a CORS / proxy / Docker-down scenario.
  await page.route('**/api/quest/execute', route => route.abort('failed'));

  await loadApp(page);
  await expect(page.locator('.quest-title')).toHaveText('Forge the Anvil');

  // Attempt to run code — the network call will fail.
  await page.getByRole('button', { name: /Run on IRIS/i }).click();
  // Wait for the running spinner to disappear.
  await page.waitForFunction(() => !document.querySelector('.running-badge'), { timeout: 15_000 });

  // The output panel must show the friendly error, not a raw Angular error string.
  const outputBody = page.locator('.output-body');
  await expect(outputBody.locator('.error')).toBeVisible();
  await expect(outputBody).toContainText('Could not reach IRIS');
  await expect(outputBody).toContainText('Docker');
});

test('Error handling: 401 response shows authentication hint', async ({ page }) => {
  await page.route('**/api/quest/execute', route =>
    route.fulfill({ status: 401, body: 'Unauthorized' }),
  );

  await loadApp(page);
  await page.getByRole('button', { name: /Run on IRIS/i }).click();
  await page.waitForFunction(() => !document.querySelector('.running-badge'), { timeout: 15_000 });

  await expect(page.locator('.output-body')).toContainText('authentication failed');
  await expect(page.locator('.output-body')).toContainText('Settings');
});

// ---------------------------------------------------------------------------
// Checklist item 10: Skill tree shows correct unlock state
// ---------------------------------------------------------------------------

test('Skill tree: fresh state — setup branch available, row-2 branches locked', async ({ page }) => {
  await loadApp(page); // completedQuests: []

  // Setup (row 1) has no prerequisites — must be available and clickable.
  const setupNode = page.locator('.branch-node', { hasText: 'Quest Zero' });
  await expect(setupNode).toBeVisible();
  await expect(setupNode).not.toBeDisabled();
  await expect(setupNode).toHaveClass(/status-available/);

  // Row 2 branches require setup to have a completed quest — must be locked.
  for (const label of ['Commands & Flow', 'Globals & Data', 'Strings & Functions']) {
    const node = page.locator('.branch-node', { hasText: label });
    await expect(node).toBeDisabled();
    await expect(node).toHaveClass(/status-locked/);
  }
});

test('Skill tree: after quest-zero — setup completed, row-2 unlocked, row-3 locked', async ({ page }) => {
  await loadApp(page, {
    completedQuests: ['quest-zero'],
    xp: 100,
    level: 2,
    unlockedBranches: ['setup', 'commands', 'globals', 'strings'],
  });

  // Setup must now show as completed (1/1 quests done).
  const setupNode = page.locator('.branch-node', { hasText: 'Quest Zero' });
  await expect(setupNode).toHaveClass(/status-completed/);
  await expect(setupNode).not.toBeDisabled();
  await expect(setupNode.locator('.node-progress')).toContainText('1/1');

  // Row 2 branches now have their prerequisite met — must be available.
  for (const label of ['Commands & Flow', 'Globals & Data', 'Strings & Functions']) {
    const node = page.locator('.branch-node', { hasText: label });
    await expect(node).not.toBeDisabled();
    await expect(node).toHaveClass(/status-available/);
  }

  // Row 3 branches require a row-2 quest completed — still locked.
  for (const label of ['Classes & OOP', 'SQL & Queries']) {
    const node = page.locator('.branch-node', { hasText: label });
    await expect(node).toBeDisabled();
    await expect(node).toHaveClass(/status-locked/);
  }

  // Capstone (row 4) also locked.
  await expect(page.locator('.branch-node', { hasText: 'Capstone Project' })).toBeDisabled();
});

test('Skill tree: clicking an available branch filters the quest list', async ({ page }) => {
  await loadApp(page, {
    completedQuests: ['quest-zero'],
    xp: 100,
    level: 2,
    unlockedBranches: ['setup', 'commands', 'globals', 'strings'],
  });

  // Click the "Commands & Flow" branch node to filter.
  await page.locator('.branch-node', { hasText: 'Commands & Flow' }).click();

  // The quest list should now show only commands-branch quests.
  await expect(page.locator('.quest-list-title', { hasText: 'Hello, Guildmate' })).toBeVisible();
  // The globals quest must not appear (filtered out).
  await expect(page.locator('.quest-list-title', { hasText: "The Adventurer's Ledger" })).not.toBeVisible();

  // A filter tag should appear in the quest section header.
  await expect(page.locator('.branch-filter-tag')).toContainText('commands');
});

// ---------------------------------------------------------------------------
// Checklist item 11: Quest log displays completed quests and earned XP correctly
// ---------------------------------------------------------------------------

test('Quest log: empty state — count shows 0 and placeholder text appears', async ({ page }) => {
  await loadApp(page); // fresh state

  // Toggle shows 0.
  await expect(page.locator('.log-count')).toHaveText('0');

  // Expand the log.
  await page.locator('.log-toggle').click();
  await expect(page.locator('.log-empty')).toContainText('No quests completed yet');
});

test('Quest log: seeded entries — shows count, titles, XP, scores in reverse order', async ({ page }) => {
  const questLog = [
    {
      questId: 'quest-zero',
      title: 'Forge the Anvil',
      completedAt: '2024-03-01T10:00:00.000Z',
      score: 80,
      xpEarned: 100,
      codeSubmitted: 'WRITE "Anvil ready!", !',
      feedback: 'Well done on forging the anvil!',
    },
    {
      questId: 'commands-01',
      title: 'Hello, Guildmate',
      completedAt: '2024-03-01T11:00:00.000Z',
      score: 95,
      xpEarned: 30,
      codeSubmitted: 'SET name = "Aldric"\nWRITE name, !',
      feedback: 'Excellent greeting, adventurer!',
    },
  ];

  await loadApp(page, {
    xp: 130,
    level: 2,
    completedQuests: ['quest-zero', 'commands-01'],
    questLog,
    currentQuestId: 'globals-01',
    unlockedBranches: ['setup', 'commands', 'globals'],
  });

  // Count badge shows 2.
  await expect(page.locator('.log-count')).toHaveText('2');

  // Expand the log.
  await page.locator('.log-toggle').click();
  const logEntries = page.locator('.log-entry');
  await expect(logEntries).toHaveCount(2);

  // Reverse order: most recent (commands-01) is first.
  const first = logEntries.nth(0);
  await expect(first.locator('.entry-title')).toHaveText('Hello, Guildmate');
  await expect(first.locator('.entry-xp')).toContainText('+30 XP');
  await expect(first.locator('.entry-score')).toHaveText('95');
  await expect(first.locator('.entry-score')).toHaveClass(/score-high/);
  await expect(first.locator('.entry-feedback')).toContainText('Excellent greeting');

  // Older entry (quest-zero) is second.
  const second = logEntries.nth(1);
  await expect(second.locator('.entry-title')).toHaveText('Forge the Anvil');
  await expect(second.locator('.entry-xp')).toContainText('+100 XP');
  await expect(second.locator('.entry-score')).toHaveText('80');
  await expect(second.locator('.entry-score')).toHaveClass(/score-high/);
});

test('Quest log: completing a quest via UI adds an entry to the log', async ({ page }) => {
  await loadApp(page);

  // Log starts empty.
  await expect(page.locator('.log-count')).toHaveText('0');

  // Complete quest-zero.
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Anvil ready!');
  await submitCode(page);
  await expect(page.locator('.evaluation-section')).toHaveClass(/passed/);

  // Log count must now be 1.
  await expect(page.locator('.log-count')).toHaveText('1');

  // Expand and verify the entry.
  await page.locator('.log-toggle').click();
  const entry = page.locator('.log-entry').nth(0);
  await expect(entry.locator('.entry-title')).toHaveText('Forge the Anvil');
  await expect(entry.locator('.entry-xp')).toContainText('+100 XP');
});

// ---------------------------------------------------------------------------
// Checklist item 12: XP gain animation plays on quest completion
// ---------------------------------------------------------------------------

test('XP animation: +XP toast appears immediately after quest completion', async ({ page }) => {
  // Seed at xp:51 (already Level 2, threshold 50) so 30 XP from commands-01 stays at Level 2.
  await loadApp(page, {
    xp: 51,
    level: 2,
    completedQuests: ['quest-zero'],
    currentQuestId: 'commands-01',
    unlockedBranches: ['setup', 'commands'],
  });

  const code = [
    'SET name = "Aldric"',
    'SET lvl = 1',
    'WRITE "Greetings from the Guild! My name is " _ name _ ". I am level " _ lvl _ ".", !',
  ].join('\n');

  await setEditorCode(page, code);
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Aldric');
  await submitCode(page);
  await expect(page.locator('.evaluation-section')).toHaveClass(/passed/);

  // XP overlay must appear with the correct amount.
  const overlay = page.locator('.xp-overlay');
  await expect(overlay).toBeVisible({ timeout: 3_000 });
  await expect(overlay.locator('.xp-gained')).toContainText('+30 XP');

  // No level-up elements — this was a plain XP gain.
  await expect(page.locator('.level-up-title')).not.toBeVisible();
});

test('XP animation: LEVEL UP variant shown when XP crosses a level threshold', async ({ page }) => {
  // Fresh state: quest-zero gives 100 XP, crossing Level 2 (threshold 50 XP).
  await loadApp(page);

  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Anvil ready!');
  await submitCode(page);
  await expect(page.locator('.evaluation-section')).toHaveClass(/passed/);

  // Level-up overlay variant must appear.
  const overlay = page.locator('.xp-overlay.level-up-overlay');
  await expect(overlay).toBeVisible({ timeout: 3_000 });
  await expect(overlay.locator('.level-up-title')).toContainText('LEVEL UP!');
  await expect(overlay.locator('.level-up-sub')).toContainText('Level 2');
  await expect(overlay.locator('.xp-gained')).toContainText('+100 XP');
});

// ---------------------------------------------------------------------------
// Checklist item 13: IRIS setup scripts run cleanly
// Verifies that docker compose + setup.sh produced a working IRIS instance.
// (Shell-level verification: npm run test:verify  →  iris/verify.sh)
// ---------------------------------------------------------------------------

test('IRIS setup: health endpoint returns {status:"ok", namespace:"USER"}', async ({ request }) => {
  const response = await request.get('http://localhost:52773/api/quest/health', {
    headers: { Authorization: 'Basic ' + btoa('_SYSTEM:password') },
  });

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.namespace).toBe('USER');
});

test('IRIS setup: execute endpoint runs ObjectScript and returns output', async ({ request }) => {
  const response = await request.post('http://localhost:52773/api/quest/execute', {
    headers: {
      Authorization: 'Basic ' + btoa('_SYSTEM:password'),
      'Content-Type': 'application/json',
    },
    data: { code: 'WRITE "setup-ok", !' },
  });

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.success).toBe(1);
  expect(body.output).toContain('setup-ok');
});

// ---------------------------------------------------------------------------
// Live Claude API integration test (skipped when ANTHROPIC_API_KEY is not set)
// ---------------------------------------------------------------------------

test('Claude API: live evaluation call returns a valid EvaluationResult', async ({ page }) => {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  test.skip(!apiKey, 'Set ANTHROPIC_API_KEY in quest-master/.env to run this test');

  await loadApp(page, { anthropicApiKey: apiKey! });

  await expect(page.locator('.quest-title')).toHaveText('Forge the Anvil');

  // Run the starter code.
  await runCode(page);
  await expect(page.locator('.output-body')).toContainText('Anvil ready!');

  // Submit — real Claude API call, allow up to 30 s for the response.
  await page.getByRole('button', { name: /Submit/i }).click();
  await page.waitForSelector('.evaluation-section', { timeout: 30_000 });

  const evalSection = page.locator('.evaluation-section');
  // Claude must return passed=true for the correct starter code.
  await expect(evalSection).toHaveClass(/passed/);
  await expect(evalSection).toContainText('XP earned');
});
