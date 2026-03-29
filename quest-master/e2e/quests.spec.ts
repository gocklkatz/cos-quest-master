import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Minimal quest fixtures for tests that need quests beyond quest-zero.
 * These are seeded into questBank in localStorage since they no longer exist
 * as hard-coded static quests (removed in F1 — Dynamic Quest Regeneration).
 */
const QUEST_COMMANDS_01 = {
  id: 'commands-01',
  title: 'Hello, Guildmate',
  branch: 'commands',
  tier: 'apprentice',
  xpReward: 30,
  bonusXP: 10,
  narrative: 'The Guild awaits your greeting.',
  objective: 'Use SET and WRITE to greet the Guild by name and level.',
  hints: [],
  bonusObjectives: [],
  evaluationCriteria: 'Must use SET and WRITE. Output must include a name and "level 1".',
  prerequisites: ['quest-zero'],
  files: [{ id: 'main', filename: 'solution.script', fileType: 'script', label: 'Solution', starterCode: '' }],
  conceptsIntroduced: ['SET', 'string concatenation'],
};

const QUEST_GLOBALS_01 = {
  id: 'globals-01',
  title: "The Adventurer's Ledger",
  branch: 'globals',
  tier: 'apprentice',
  xpReward: 40,
  bonusXP: 10,
  narrative: 'Record guild members in the global ledger.',
  objective: 'Use globals and $ORDER to list all members.',
  hints: [],
  bonusObjectives: [],
  evaluationCriteria: 'Must use globals and $ORDER FOR loop.',
  prerequisites: ['quest-zero'],
  files: [{ id: 'main', filename: 'solution.script', fileType: 'script', label: 'Solution', starterCode: '' }],
  conceptsIntroduced: ['globals', '$ORDER', 'FOR loop'],
};

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
    questBank: [QUEST_COMMANDS_01],
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
    questBank: [QUEST_COMMANDS_01, QUEST_GLOBALS_01],
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
    questBank: [QUEST_COMMANDS_01],
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
  // Note: F1 auto-advances immediately on generation completion, clearing the evaluation
  // panel before it can be observed. We skip the evaluation-section check here and instead
  // wait directly for the generated quest to appear in the list (which proves both that
  // evaluation passed and that generation succeeded).
  await page.getByRole('button', { name: /Submit/i }).click();

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
    questBank: [QUEST_COMMANDS_01],
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

// ---------------------------------------------------------------------------
// F18: Adaptive Difficulty
// ---------------------------------------------------------------------------

test.describe('F18 US1 — First-session difficulty prompt', () => {
  test('shows difficulty prompt on fresh session (no difficultyPreference in localStorage)', async ({ page }) => {
    await page.goto('/quest');
    // Clear any saved state so we start fresh
    await page.evaluate(() => localStorage.removeItem('questmaster'));
    await page.reload();

    await expect(page.locator('app-difficulty-prompt')).toBeVisible();
    await expect(page.getByText('Welcome, Adventurer!')).toBeVisible();
  });

  test('Beginner selection dismisses prompt and starts at setup branch', async ({ page }) => {
    await page.goto('/quest');
    await page.evaluate(() => localStorage.removeItem('questmaster'));
    await page.reload();

    await page.getByRole('button', { name: /Beginner/i }).first().click();
    await page.getByRole('button', { name: /Start My Quest/i }).click();

    await expect(page.locator('app-difficulty-prompt')).not.toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('questmaster') ?? '{}'));
    expect(stored.difficultyPreference).toBe('beginner');
    expect(stored.currentBranch).toBe('setup');
  });

  test('Advanced + OOP sets currentBranch to classes-methods', async ({ page }) => {
    await page.goto('/quest');
    await page.evaluate(() => localStorage.removeItem('questmaster'));
    await page.reload();

    await page.getByRole('button', { name: /Advanced/i }).first().click();
    await page.getByRole('button', { name: /OOP/i }).click();
    await page.getByRole('button', { name: /Start My Quest/i }).click();

    await expect(page.locator('app-difficulty-prompt')).not.toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('questmaster') ?? '{}'));
    expect(stored.difficultyPreference).toBe('advanced');
    expect(stored.advancedFocus).toBe('oop');
    expect(stored.currentBranch).toBe('classes-methods');
  });

  test('preference persists after page reload', async ({ page }) => {
    await page.goto('/quest');
    await page.evaluate(() => localStorage.removeItem('questmaster'));
    await page.reload();

    await page.getByRole('button', { name: /Intermediate/i }).first().click();
    await page.getByRole('button', { name: /Start My Quest/i }).click();
    await page.reload();

    await expect(page.locator('app-difficulty-prompt')).not.toBeVisible();
  });
});

test.describe('F18 US2 — Difficulty preference in Settings', () => {
  async function seedStateWithPreference(page: Page, pref: string) {
    const base = { playerName: 'Tester', xp: 0, level: 1, completedQuests: [], currentQuestId: null,
      questLog: [], coveredConcepts: [], unlockedBranches: ['setup'],
      irisConfig: { baseUrl: 'http://localhost:52773', namespace: 'USER', username: '_SYSTEM', password: 'SYS' },
      anthropicApiKey: '', questBank: [], challengeMode: false, unlockedAchievements: [],
      noHintsStreak: 0, currentBranch: 'setup', dailyGoalMinutes: 20, timeLog: {},
      totalXpAllTime: 0, prestigeLevel: 0, difficultyPreference: pref, advancedFocus: null };
    await page.evaluate((s) => localStorage.setItem('questmaster', JSON.stringify(s)), base);
  }

  test('Settings panel shows current difficulty preference', async ({ page }) => {
    await page.goto('/quest');
    await seedStateWithPreference(page, 'intermediate');
    await page.reload();

    await page.locator('app-header-bar').getByRole('button', { name: /Settings/i }).click();

    // The Intermediate button should have the "active" class in the segmented control
    const intermediateBtn = page.locator('.segmented-control .seg-btn.active');
    await expect(intermediateBtn).toContainText('Intermediate');
  });

  test('changing difficulty in Settings persists to localStorage', async ({ page }) => {
    await page.goto('/quest');
    await seedStateWithPreference(page, 'beginner');
    await page.reload();

    await page.locator('app-header-bar').getByRole('button', { name: /Settings/i }).click();
    await page.locator('.segmented-control .seg-btn', { hasText: 'Intermediate' }).click();
    await page.getByRole('button', { name: /Save Settings/i }).click();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('questmaster') ?? '{}'));
    expect(stored.difficultyPreference).toBe('intermediate');
  });
});
