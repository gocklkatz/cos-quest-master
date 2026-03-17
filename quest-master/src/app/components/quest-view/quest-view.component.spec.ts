import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { QuestViewComponent } from './quest-view.component';
import { GameStateService } from '../../services/game-state.service';
import { QuestEngineService } from '../../services/quest-engine.service';
import { ClassQuestService } from '../../services/class-quest.service';
import { AiPairService } from '../../services/ai-pair.service';
import { PaneSizeService } from '../../services/pane-size.service';
import { AchievementService } from '../../services/achievement.service';
import { Quest } from '../../models/quest.models';

const THREE_FILE_QUEST: Quest = {
  id: 'classes-prediction-01',
  title: 'The Inheritance Scroll',
  branch: 'classes',
  questType: 'prediction',
  tier: 'journeyman',
  narrative: '',
  objective: '',
  evaluationCriteria: '',
  hints: [],
  bonusObjectives: [],
  bonusXP: 0,
  xpReward: 80,
  prerequisites: [],
  conceptsIntroduced: [],
  choices: ['Name: Sword\nDamage: 10', 'Name: Sword\nDamage: 20', 'Name: Sword\nDamage: 15'],
  correctAnswer: 'Name: Sword\nDamage: 10',
  files: [
    { id: 'cls-main',      filename: 'Quest.Weapon.cls',          fileType: 'cls',    label: 'Base Weapon Class',        starterCode: 'Class Quest.Weapon Extends %RegisteredObject {\nProperty Name As %String;\nProperty BaseDamage As %Integer;\nMethod Describe() {\nWRITE "Name: ", i..Name, !\nWRITE "Damage: ", i..BaseDamage, !\n}\n}' },
    { id: 'cls-enchanted', filename: 'Quest.EnchantedWeapon.cls', fileType: 'cls',    label: 'EnchantedWeapon Subclass', starterCode: 'Class Quest.EnchantedWeapon Extends Quest.Weapon {\nProperty Enchantment As %String;\nMethod Enchant() {\nSET i..BaseDamage = i..BaseDamage + 5\n}\n}' },
    { id: 'main',          filename: 'solution.script',           fileType: 'script', label: 'Solution Script',          starterCode: 'SET w = ##class(Quest.EnchantedWeapon).%New()\nSET w.Name = "Sword"\nSET w.BaseDamage = 10\nDO w.Describe()', dependsOn: ['cls-main', 'cls-enchanted'] },
  ],
};

const STUB_QUEST: Quest = {
  id: 'quest-zero',
  title: 'Forge the Anvil',
  branch: 'setup',
  tier: 'apprentice',
  narrative: '',
  objective: '',
  evaluationCriteria: '',
  hints: [],
  bonusObjectives: [],
  bonusXP: 0,
  xpReward: 50,
  prerequisites: [],
  conceptsIntroduced: [],
  files: [{ id: 'f1', filename: 'solution.script', fileType: 'script', label: 'solution.script', starterCode: 'WRITE "hello"' }],
};

function buildMocks() {
  const resetEpoch = signal(0);
  const currentQuest = signal<Quest | null>(null);

  const mockQuestEngine = {
    resetEpoch,
    currentQuest,
    currentQuestCompleted: signal(false),
    questGenerating: signal(false),
    availableQuests: signal<Quest[]>([]),
    completedQuestIds: signal<string[]>([]),
    allQuests: signal<Quest[]>([]),
    activeQuests: signal<Quest[]>([]),
    initialize: vi.fn(),
    triggerReset: vi.fn(() => resetEpoch.update(n => n + 1)),
    evaluateWithClaude: vi.fn(),
    evaluateSimple: vi.fn(),
    completeQuest: vi.fn(),
    generateNextQuest: vi.fn(),
  } as unknown as QuestEngineService;

  const mockGameState = {
    anthropicApiKey: signal(''),
    challengeMode: signal(false),
    irisConfig: signal({ baseUrl: '', namespace: 'USER', username: '_SYSTEM', password: '' }),
    level: vi.fn(() => 1),
    prestigeLevel: signal(0),
    totalXpAllTime: signal(0),
    prestigeTitle: signal('Initiate'),
    toggleChallengeMode: vi.fn(),
    setCurrentQuest: vi.fn(),
    updateNoHintsStreak: vi.fn(),
    triggerPrestige: vi.fn(),
    playerName: signal(''),
    xp: signal(0),
  } as unknown as GameStateService;

  const mockClassQuest = {
    runQuestFiles: vi.fn(),
    cleanupLastClass: vi.fn(),
  } as unknown as ClassQuestService;

  const mockAiPair = {
    loadForQuest: vi.fn(),
  } as unknown as AiPairService;

  const mockPaneSizes = {
    get: vi.fn(() => 300),
    set: vi.fn(),
  } as unknown as PaneSizeService;

  const mockAchievements = {
    check: vi.fn(() => []),
  } as unknown as AchievementService;

  return { mockQuestEngine, mockGameState, mockClassQuest, mockAiPair, mockPaneSizes, mockAchievements, resetEpoch, currentQuest };
}

async function setup() {
  const mocks = buildMocks();

  await TestBed.configureTestingModule({
    imports: [QuestViewComponent],
    providers: [
      { provide: QuestEngineService, useValue: mocks.mockQuestEngine },
      { provide: GameStateService, useValue: mocks.mockGameState },
      { provide: ClassQuestService, useValue: mocks.mockClassQuest },
      { provide: AiPairService, useValue: mocks.mockAiPair },
      { provide: PaneSizeService, useValue: mocks.mockPaneSizes },
      { provide: AchievementService, useValue: mocks.mockAchievements },
    ],
    schemas: [NO_ERRORS_SCHEMA],
  })
  // Strip child component imports so Monaco/other heavy deps are not instantiated.
  .overrideComponent(QuestViewComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })
  .compileComponents();

  const fixture = TestBed.createComponent(QuestViewComponent);
  return { fixture, component: fixture.componentInstance, ...mocks };
}

describe('QuestViewComponent', () => {
  it('smoke: creates without error', async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
  });

  it('resetEpoch effect — triggerReset() clears state and reloads quest', async () => {
    const { fixture, component, mockQuestEngine, currentQuest, mockAiPair } = await setup();

    // Arrange: set non-null state and a current quest.
    component.output.set('some output');
    component.error.set('some error');
    component.evaluation.set({ passed: true, score: 100, bonusAchieved: [], feedback: '', codeReview: '', xpEarned: 50 });
    currentQuest.set(STUB_QUEST);

    // Act: trigger reset (increments resetEpoch from 0 → 1).
    mockQuestEngine.triggerReset();
    TestBed.flushEffects();

    // Assert: state cleared.
    expect(component.output()).toBeNull();
    expect(component.error()).toBeNull();
    expect(component.evaluation()).toBeNull();

    // Assert: quest code reloaded — questFiles reflects the stub quest's files.
    expect(component.questFiles()).toEqual(STUB_QUEST.files);

    // Assert: AI pair chat history reloaded.
    expect(mockAiPair.loadForQuest).toHaveBeenCalledWith(STUB_QUEST.id);
  });

  it('constructor effect — auto-loads quest when currentQuest changes to a new ID', async () => {
    const { fixture, component, currentQuest, mockAiPair } = await setup();

    // Simulate ngOnInit loading quest-zero (sets lastLoadedQuestId).
    fixture.detectChanges();

    // Arrange: change currentQuest to a different quest.
    const nextQuest: Quest = { ...STUB_QUEST, id: 'quest-one', title: 'Quest One' };
    currentQuest.set(nextQuest);
    TestBed.flushEffects();

    // Assert: new quest's files loaded into the editor.
    expect(component.questFiles()).toEqual(nextQuest.files);

    // Assert: output cleared and AI pair reloaded for the new quest.
    expect(component.output()).toBeNull();
    expect(mockAiPair.loadForQuest).toHaveBeenCalledWith('quest-one');
  });

  describe('onFileSelected — multi-tab prediction quest', () => {
    it('switches activeFileId when a non-active tab is selected', async () => {
      const { component, currentQuest } = await setup();

      // Load a 3-file prediction quest via the reactive effect.
      currentQuest.set(THREE_FILE_QUEST);
      TestBed.flushEffects();

      // Sanity check: should start on the first file.
      expect(component.activeFileId()).toBe('cls-main');
      expect(component.editorCode()).toContain('Quest.Weapon');

      // Act: switch to the second file (EnchantedWeapon Subclass).
      component.onFileSelected('cls-enchanted');

      // Assert: activeFileId updated.
      expect(component.activeFileId()).toBe('cls-enchanted');
      // Assert: editorCode updated to file 2's content.
      expect(component.editorCode()).toContain('EnchantedWeapon');
    });

    it('switches to the third file (Solution Script)', async () => {
      const { component, currentQuest } = await setup();

      currentQuest.set(THREE_FILE_QUEST);
      TestBed.flushEffects();

      component.onFileSelected('main');

      expect(component.activeFileId()).toBe('main');
      expect(component.editorCode()).toContain('w.Describe()');
    });

    it('preserves the previous tab\'s code in the buffer when switching', async () => {
      const { component, currentQuest } = await setup();

      currentQuest.set(THREE_FILE_QUEST);
      TestBed.flushEffects();

      // Edit the first file.
      component.editorCode.set('// edited code');

      // Switch to tab 2.
      component.onFileSelected('cls-enchanted');

      // Switch back to tab 1.
      component.onFileSelected('cls-main');

      // The edit should have been preserved in the buffer.
      expect(component.editorCode()).toBe('// edited code');
    });

    it('does not emit when clicking the already-active tab (guard in selectFile)', async () => {
      const { component, currentQuest } = await setup();

      currentQuest.set(THREE_FILE_QUEST);
      TestBed.flushEffects();

      // First file is already active — calling onFileSelected with same ID is a no-op
      // in practice (the guard in selectFile prevents emission), but we verify the
      // component handles it gracefully anyway.
      const codeBefore = component.editorCode();
      component.onFileSelected('cls-main'); // same as activeFileId
      expect(component.activeFileId()).toBe('cls-main');
      expect(component.editorCode()).toBe(codeBefore);
    });
  });
});
