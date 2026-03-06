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
  questLog: [],
  coveredConcepts: [],
  unlockedBranches: ['setup'],
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
