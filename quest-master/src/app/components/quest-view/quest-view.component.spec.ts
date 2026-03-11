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
    toggleChallengeMode: vi.fn(),
    setCurrentQuest: vi.fn(),
    updateNoHintsStreak: vi.fn(),
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
});
