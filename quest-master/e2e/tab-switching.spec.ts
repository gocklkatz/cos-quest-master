import { test, expect, Page } from '@playwright/test';

/** Seed localStorage with the given state and reload the app. */
async function loadApp(page: Page, stateOverride: Record<string, unknown> = {}) {
  const state = {
    playerName: 'Tester',
    xp: 2893,
    level: 11,
    completedQuests: ['quest-zero'],
    currentQuestId: null as string | null,
    questLog: [],
    coveredConcepts: [],
    unlockedBranches: ['setup', 'commands', 'globals', 'classes'],
    irisConfig: { baseUrl: 'http://localhost:52773', namespace: 'USER', username: '_SYSTEM', password: 'password' },
    anthropicApiKey: '',
    questBank: [],
    ...stateOverride,
  };
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('questmaster', JSON.stringify(s)), state);
  await page.reload();
  await page.waitForSelector('app-quest-panel', { timeout: 15_000 });
}

/** Wait for Monaco to initialise and return the first editor's current value. */
async function getEditorCode(page: Page): Promise<string> {
  await page.waitForFunction(
    () => (window as any).monaco?.editor?.getEditors?.()?.length > 0,
    { timeout: 15_000 },
  );
  return page.evaluate(
    () => (window as any).monaco.editor.getEditors()[0].getValue() as string,
  );
}

// ---------------------------------------------------------------------------
// Fixture: 3-file prediction quest with UNIQUE IDs (the "good" case)
// ---------------------------------------------------------------------------
const QUEST_UNIQUE_IDS = {
  id: 'classes-pred-01',
  title: 'The Inheritance Scroll',
  branch: 'classes',
  questType: 'prediction',
  tier: 'journeyman',
  xpReward: 80,
  bonusXP: 40,
  narrative: 'Deep in the Scriptorium...',
  objective: 'Predict the output of the inheritance example.',
  evaluationCriteria: 'The player must select the correct output.',
  hints: [],
  bonusObjectives: [],
  prerequisites: ['quest-zero'],
  conceptsIntroduced: ['inheritance', '##super'],
  choices: ['Name: Sword\nDamage: 10', 'Name: Sword\nDamage: 15', 'Name: Sword\nDamage: 20'],
  correctAnswer: 'Name: Sword\nDamage: 10',
  files: [
    {
      id: 'cls-base',
      filename: 'Quest.Weapon.cls',
      fileType: 'cls',
      label: 'Base Weapon Class',
      starterCode: 'Class Quest.Weapon Extends %RegisteredObject {\nProperty Name As %String;\nProperty BaseDamage As %Integer;\nMethod Describe() {\nWRITE "Name: ", i..Name, !\nWRITE "Damage: ", i..BaseDamage, !\n}\n}',
    },
    {
      id: 'cls-sub',
      filename: 'Quest.EnchantedWeapon.cls',
      fileType: 'cls',
      label: 'EnchantedWeapon Subclass',
      starterCode: 'Class Quest.EnchantedWeapon Extends Quest.Weapon {\nProperty Enchantment As %String;\nMethod Enchant() {\nSET i..BaseDamage = i..BaseDamage + 5\n}\n}',
    },
    {
      id: 'main',
      filename: 'solution.script',
      fileType: 'script',
      label: 'Solution Script',
      starterCode: 'SET w = ##class(Quest.EnchantedWeapon).%New()\nSET w.Name = "Sword"\nSET w.BaseDamage = 10\nDO w.Describe()',
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture: same quest but with DUPLICATE file IDs — reproduces the AI bug
// ---------------------------------------------------------------------------
const QUEST_DUPLICATE_IDS = {
  ...QUEST_UNIQUE_IDS,
  id: 'classes-pred-02',
  title: 'The Inheritance Scroll (duplicate IDs)',
  files: QUEST_UNIQUE_IDS.files.map(f => ({ ...f, id: 'cls-main' })), // all three → "cls-main"
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('File tab switching', () => {
  test('tabs with unique IDs: clicking tab 2 activates it and shows its code', async ({ page }) => {
    await loadApp(page, {
      currentQuestId: QUEST_UNIQUE_IDS.id,
      questBank: [QUEST_UNIQUE_IDS],
    });

    await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.()?.length > 0, { timeout: 15_000 });

    const tabs = page.locator('.file-tab');
    await expect(tabs).toHaveCount(3);

    // Tab 1 is active, tabs 2+3 are not.
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
    await expect(tabs.nth(2)).not.toHaveClass(/active/);

    const code1 = await getEditorCode(page);
    console.log('Tab 1 code:', code1.slice(0, 60));

    // Click tab 2.
    await tabs.nth(1).click();
    await page.waitForTimeout(300); // allow change detection to flush

    const activeAfterClick2 = await tabs.nth(1).getAttribute('class');
    console.log('Tab 2 class after click:', activeAfterClick2);

    await expect(tabs.nth(1)).toHaveClass(/active/, { timeout: 3_000 });
    await expect(tabs.nth(0)).not.toHaveClass(/active/);

    const code2 = await getEditorCode(page);
    console.log('Tab 2 code:', code2.slice(0, 60));
    expect(code2).not.toBe(code1); // content should have changed

    // Click tab 3.
    await tabs.nth(2).click();
    await page.waitForTimeout(300);

    await expect(tabs.nth(2)).toHaveClass(/active/, { timeout: 3_000 });
    await expect(tabs.nth(1)).not.toHaveClass(/active/);

    const code3 = await getEditorCode(page);
    console.log('Tab 3 code:', code3.slice(0, 60));
    expect(code3).not.toBe(code2);
  });

  test('tabs with duplicate IDs (AI bug): normalizeQuest should fix them so tabs work', async ({ page }) => {
    await loadApp(page, {
      currentQuestId: QUEST_DUPLICATE_IDS.id,
      questBank: [QUEST_DUPLICATE_IDS],
    });

    await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.()?.length > 0, { timeout: 15_000 });

    // Dump the actual file IDs after normalization so we can see what happened.
    const fileIds = await page.evaluate(() => {
      const raw = localStorage.getItem('questmaster');
      if (!raw) return [];
      const state = JSON.parse(raw);
      const q = state.questBank?.find((q: any) => q.id === 'classes-pred-02');
      return q?.files?.map((f: any) => f.id) ?? [];
    });
    console.log('File IDs after normalizeQuest (should be unique):', fileIds);

    const tabs = page.locator('.file-tab');
    await expect(tabs).toHaveCount(3);

    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);

    const code1 = await getEditorCode(page);

    // Click tab 2 — this should work now that IDs are unique.
    await tabs.nth(1).click();
    await page.waitForTimeout(300);

    const tab2Class = await tabs.nth(1).getAttribute('class');
    console.log('Tab 2 class after click (duplicate-IDs quest):', tab2Class);

    await expect(tabs.nth(1)).toHaveClass(/active/, { timeout: 3_000 });

    const code2 = await getEditorCode(page);
    console.log('Code changed after tab 2 click:', code1 !== code2);
  });

  test('diagnostic: log what the click event does on a 3-file prediction quest', async ({ page }) => {
    // Capture console logs and errors from Angular.
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => consoleLogs.push(`[pageerror] ${err.message}`));

    await loadApp(page, {
      currentQuestId: QUEST_UNIQUE_IDS.id,
      questBank: [QUEST_UNIQUE_IDS],
    });

    await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.()?.length > 0, { timeout: 15_000 });

    const tabs = page.locator('.file-tab');
    await expect(tabs).toHaveCount(3);

    // Capture the bounding boxes to verify tabs are visible and not covered.
    for (let i = 0; i < 3; i++) {
      const box = await tabs.nth(i).boundingBox();
      const label = await tabs.nth(i).textContent();
      console.log(`Tab ${i + 1} "${label?.trim()}" bounding box:`, JSON.stringify(box));
    }

    // Use elementFromPoint to detect if another element is covering tab 2.
    const tab2Box = await tabs.nth(1).boundingBox();
    if (tab2Box) {
      const cx = tab2Box.x + tab2Box.width / 2;
      const cy = tab2Box.y + tab2Box.height / 2;
      const topElement = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? `${el.tagName}.${[...el.classList].join('.')}` : 'null';
      }, [cx, cy]);
      console.log(`Element at tab 2 center (${cx.toFixed(0)}, ${cy.toFixed(0)}):`, topElement);
    }

    // Now click tab 2 and wait.
    await tabs.nth(1).click();
    await page.waitForTimeout(500);

    const activeTabText = await page.locator('.file-tab.active').textContent();
    console.log('Active tab after click:', activeTabText);

    if (consoleLogs.length) {
      console.log('Console output:\n' + consoleLogs.join('\n'));
    }

    // Report the actual state.
    const tab1Active = await tabs.nth(0).evaluate(el => el.classList.contains('active'));
    const tab2Active = await tabs.nth(1).evaluate(el => el.classList.contains('active'));
    const tab3Active = await tabs.nth(2).evaluate(el => el.classList.contains('active'));
    console.log(`Tab active states after clicking tab 2: [${tab1Active}, ${tab2Active}, ${tab3Active}]`);

    const editorCode = await getEditorCode(page);
    console.log('Editor content after clicking tab 2:', editorCode.slice(0, 80));
  });
});
