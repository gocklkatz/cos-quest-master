import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { vi } from 'vitest';
import { QuestEngineService } from './quest-engine.service';
import { GameStateService } from './game-state.service';
import { ClaudeApiService } from './claude-api.service';
import { Quest } from '../models/quest.models';
import { BRANCH_PROGRESSION } from '../data/branch-progression';
import { STARTER_QUESTS } from '../data/starter-quests';

describe('QuestEngineService — F9: questGenerating / questGenerationError signals', () => {
  const MOCK_QUEST: Quest = {
    id: 'test-quest',
    title: 'Test Quest',
    branch: 'globals',
    tier: 'apprentice',
    narrative: 'Narrative',
    objective: 'Objective',
    evaluationCriteria: '',
    hints: [],
    bonusObjectives: [],
    bonusXP: 0,
    xpReward: 100,
    prerequisites: [],
    conceptsIntroduced: [],
    files: [{ id: 'f1', filename: 'solution.script', fileType: 'script', label: 'solution.script' }],
  };

  function buildMockGameState(overrides: Partial<{
    completedQuests: string[];
    questBank: Quest[];
  }> = {}) {
    const completedQuests = signal<string[]>(overrides.completedQuests ?? []);
    const questBank = signal<Quest[]>(overrides.questBank ?? []);
    return {
      completedQuests,
      coveredConcepts: signal<string[]>([]),
      xp: signal(0),
      questBank,
      currentQuestId: signal<string | null>(null),
      currentBranch: signal('setup'),
      allQuests: computed(() => []),
      addToQuestBank: vi.fn(),
      setCurrentQuest: vi.fn(),
      setCurrentBranch: vi.fn(),
      completeQuest: vi.fn(),
    } as unknown as GameStateService;
  }

  function buildMockClaude(resolveWith: Quest | 'error') {
    return {
      generateQuest: resolveWith === 'error'
        ? vi.fn().mockRejectedValue(new Error('Network error'))
        : vi.fn().mockResolvedValue(resolveWith),
      evaluateSubmission: vi.fn(),
    } as unknown as ClaudeApiService;
  }

  async function setup(claudeResult: Quest | 'error') {
    const mockGameState = buildMockGameState();
    const mockClaude = buildMockClaude(claudeResult);

    await TestBed.configureTestingModule({
      providers: [
        QuestEngineService,
        { provide: GameStateService, useValue: mockGameState },
        { provide: ClaudeApiService, useValue: mockClaude },
      ],
    }).compileComponents();

    const service = TestBed.inject(QuestEngineService);
    return { service, mockGameState, mockClaude };
  }

  it('starts with questGenerating=false and questGenerationError=false', async () => {
    const { service } = await setup(MOCK_QUEST);
    expect(service.questGenerating()).toBe(false);
    expect(service.questGenerationError()).toBe(false);
  });

  it('sets questGenerating=true while generation is in flight', async () => {
    let resolveGenerate!: (q: Quest) => void;
    const pending = new Promise<Quest>(res => { resolveGenerate = res; });

    const mockGameState = buildMockGameState();
    const mockClaude = {
      generateQuest: vi.fn().mockReturnValue(pending),
      evaluateSubmission: vi.fn(),
    } as unknown as ClaudeApiService;

    await TestBed.configureTestingModule({
      providers: [
        QuestEngineService,
        { provide: GameStateService, useValue: mockGameState },
        { provide: ClaudeApiService, useValue: mockClaude },
      ],
    }).compileComponents();

    const service = TestBed.inject(QuestEngineService);

    const genPromise = service.generateNextQuest('globals', 'key-123');
    expect(service.questGenerating()).toBe(true);
    expect(service.questGenerationError()).toBe(false);

    resolveGenerate(MOCK_QUEST);
    await genPromise;

    expect(service.questGenerating()).toBe(false);
  });

  it('clears questGenerating and returns the quest on success', async () => {
    const { service, mockGameState } = await setup(MOCK_QUEST);

    const result = await service.generateNextQuest('globals', 'key-123');

    expect(result).toEqual(MOCK_QUEST);
    expect(service.questGenerating()).toBe(false);
    expect(service.questGenerationError()).toBe(false);
    expect(mockGameState.addToQuestBank).toHaveBeenCalledWith(MOCK_QUEST);
  });

  it('sets questGenerationError=true and clears questGenerating on failure', async () => {
    const { service } = await setup('error');

    const result = await service.generateNextQuest('globals', 'key-123');

    expect(result).toBeNull();
    expect(service.questGenerating()).toBe(false);
    expect(service.questGenerationError()).toBe(true);
  });

  it('retryGenerate() clears error and retries with cached args', async () => {
    const { service, mockClaude } = await setup('error');

    await service.generateNextQuest('globals', 'key-123');
    expect(service.questGenerationError()).toBe(true);

    // Fix the mock so the retry succeeds.
    (mockClaude.generateQuest as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_QUEST);

    service.retryGenerate();
    // Give the async call a tick to start.
    await new Promise(r => setTimeout(r, 0));

    expect(mockClaude.generateQuest).toHaveBeenCalledTimes(2);
    expect(mockClaude.generateQuest).toHaveBeenLastCalledWith(
      expect.any(Array), expect.any(Array), 'globals', expect.any(String), 'key-123', expect.any(String)
    );
  });

  it('triggerReset() increments resetEpoch on each call', async () => {
    const { service } = await setup(MOCK_QUEST);

    expect(service.resetEpoch()).toBe(0);

    service.triggerReset();
    expect(service.resetEpoch()).toBe(1);

    service.triggerReset();
    expect(service.resetEpoch()).toBe(2);
  });

  it('retryGenerate() clears questGenerationError at the start of retry', async () => {
    let secondCallResolve!: (q: Quest) => void;
    const secondCallPending = new Promise<Quest>(res => { secondCallResolve = res; });

    const mockGameState = buildMockGameState();
    const mockClaude = {
      generateQuest: vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockReturnValueOnce(secondCallPending),
      evaluateSubmission: vi.fn(),
    } as unknown as ClaudeApiService;

    await TestBed.configureTestingModule({
      providers: [
        QuestEngineService,
        { provide: GameStateService, useValue: mockGameState },
        { provide: ClaudeApiService, useValue: mockClaude },
      ],
    }).compileComponents();

    const service = TestBed.inject(QuestEngineService);

    await service.generateNextQuest('globals', 'key-123');
    expect(service.questGenerationError()).toBe(true);

    service.retryGenerate();
    await new Promise(r => setTimeout(r, 0));

    // Error should be cleared while retry is in flight.
    expect(service.questGenerationError()).toBe(false);
    expect(service.questGenerating()).toBe(true);

    secondCallResolve(MOCK_QUEST);
  });
});

// ── F13: Skip Quest ───────────────────────────────────────────────────────────

describe('QuestEngineService — F13: skipQuest()', () => {
  const SKIP_QUEST: Quest = {
    id: 'skip-target',
    title: 'Skip Target',
    branch: 'globals',
    tier: 'apprentice',
    narrative: '',
    objective: '',
    evaluationCriteria: '',
    hints: [],
    bonusObjectives: [],
    bonusXP: 0,
    xpReward: 100,
    prerequisites: [],
    conceptsIntroduced: [],
    files: [{ id: 'f1', filename: 'solution.script', fileType: 'script', label: 'solution.script' }],
  };

  async function buildSkipService(currentBranch = 'globals', apiKey = 'test-key') {
    const mockGameState = {
      completedQuests: signal<string[]>([]),
      coveredConcepts: signal<string[]>([]),
      xp: signal(0),
      questBank: signal<Quest[]>([]),
      currentQuestId: signal<string | null>('some-quest'),
      currentBranch: signal(currentBranch),
      anthropicApiKey: signal(apiKey),
      addToQuestBank: vi.fn(),
      setCurrentQuest: vi.fn(),
      setCurrentBranch: vi.fn(),
      completeQuest: vi.fn(),
      incrementSkips: vi.fn(),
    } as unknown as GameStateService;

    const mockClaude = {
      generateQuest: vi.fn().mockResolvedValue(SKIP_QUEST),
      evaluateSubmission: vi.fn(),
    } as unknown as ClaudeApiService;

    await TestBed.configureTestingModule({
      providers: [
        QuestEngineService,
        { provide: GameStateService, useValue: mockGameState },
        { provide: ClaudeApiService, useValue: mockClaude },
      ],
    }).compileComponents();

    return {
      service: TestBed.inject(QuestEngineService),
      mockGameState,
      mockClaude,
    };
  }

  it('increments skipsThisSession via GameStateService', async () => {
    const { service, mockGameState } = await buildSkipService();
    await service.skipQuest();
    expect(mockGameState.incrementSkips).toHaveBeenCalledOnce();
  });

  it('calls generateNextQuest with branch and apiKey from GameStateService', async () => {
    const { service, mockClaude } = await buildSkipService('globals', 'my-api-key');
    await service.skipQuest();
    expect(mockClaude.generateQuest).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 'globals', expect.any(String), 'my-api-key', expect.any(String)
    );
  });

  it('advances currentQuestId to the new quest on success', async () => {
    const { service, mockGameState } = await buildSkipService();
    await service.skipQuest();
    expect(mockGameState.setCurrentQuest).toHaveBeenCalledWith(SKIP_QUEST.id);
  });

  it('does not call setCurrentQuest when generation fails', async () => {
    const { service, mockGameState, mockClaude } = await buildSkipService();
    (mockClaude.generateQuest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    await service.skipQuest();
    expect(mockGameState.setCurrentQuest).not.toHaveBeenCalled();
  });

  it('does not call completeQuest', async () => {
    const { service, mockGameState } = await buildSkipService();
    await service.skipQuest();
    expect(mockGameState.completeQuest).not.toHaveBeenCalled();
  });
});

// ── Helper: build a Quest with a given branch and id ─────────────────────────
function makeQuest(id: string, branch: string): Quest {
  return {
    id,
    title: id,
    branch,
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
    files: [{ id: 'f1', filename: 'solution.script', fileType: 'script', label: 'solution.script' }],
  };
}

describe('QuestEngineService — F12: resolveBranch / branch progression', () => {
  const setup_threshold = BRANCH_PROGRESSION.find(s => s.branch === 'setup')!.minQuestsToAdvance!;

  async function buildService(completedIds: string[], bank: Quest[]) {
    const completedQuestsSignal = signal<string[]>(completedIds);
    const questBankSignal = signal<Quest[]>(bank);
    const mockGameState = {
      completedQuests: completedQuestsSignal,
      coveredConcepts: signal<string[]>([]),
      xp: signal(0),
      questBank: questBankSignal,
      currentQuestId: signal<string | null>(null),
      currentBranch: signal('setup'),
      addToQuestBank: vi.fn(),
      setCurrentQuest: vi.fn(),
      setCurrentBranch: vi.fn(),
      completeQuest: vi.fn(),
    } as unknown as GameStateService;

    const mockClaude = {
      generateQuest: vi.fn().mockResolvedValue(makeQuest('generated', 'commands')),
      evaluateSubmission: vi.fn(),
    } as unknown as ClaudeApiService;

    await TestBed.configureTestingModule({
      providers: [
        QuestEngineService,
        { provide: GameStateService, useValue: mockGameState },
        { provide: ClaudeApiService, useValue: mockClaude },
      ],
    }).compileComponents();

    return {
      service: TestBed.inject(QuestEngineService),
      mockGameState,
      mockClaude,
    };
  }

  it('stays in setup when fewer than threshold quests are completed', async () => {
    // 2 setup quests completed — below threshold of 3
    const setupQuests = [makeQuest('q0', 'setup'), makeQuest('q1', 'setup')];
    const { service, mockClaude } = await buildService(['q0', 'q1'], setupQuests);

    await service.generateNextQuest('setup', 'key');

    expect(mockClaude.generateQuest).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 'setup', expect.any(String), 'key', expect.any(String)
    );
    expect(service.branchUnlocked()).toBeNull();
  });

  it('advances to commands when setup threshold is reached', async () => {
    // quest-zero is in STARTER_QUESTS; we provide threshold setup quests in the bank
    const setupQuests = Array.from({ length: setup_threshold }, (_, i) => makeQuest(`sq${i}`, 'setup'));
    const completedIds = setupQuests.map(q => q.id);
    const { service, mockClaude, mockGameState } = await buildService(completedIds, setupQuests);

    await service.generateNextQuest('setup', 'key');

    expect(mockClaude.generateQuest).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 'commands', expect.any(String), 'key', expect.any(String)
    );
    expect(mockGameState.setCurrentBranch).toHaveBeenCalledWith('commands');
    expect(service.branchUnlocked()).toBe('commands');
  });

  it('clearBranchUnlocked() sets branchUnlocked back to null', async () => {
    const setupQuests = Array.from({ length: setup_threshold }, (_, i) => makeQuest(`sq${i}`, 'setup'));
    const completedIds = setupQuests.map(q => q.id);
    const { service } = await buildService(completedIds, setupQuests);

    await service.generateNextQuest('setup', 'key');
    expect(service.branchUnlocked()).toBe('commands');

    service.clearBranchUnlocked();
    expect(service.branchUnlocked()).toBeNull();
  });

  it('does not advance from terminal capstone branch', async () => {
    const capstoneQuests = Array.from({ length: 10 }, (_, i) => makeQuest(`cq${i}`, 'capstone'));
    const completedIds = capstoneQuests.map(q => q.id);
    const { service, mockClaude } = await buildService(completedIds, capstoneQuests);

    await service.generateNextQuest('capstone', 'key');

    expect(mockClaude.generateQuest).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 'capstone', expect.any(String), 'key', expect.any(String)
    );
    expect(service.branchUnlocked()).toBeNull();
  });
});

// ── F5: Capstone quest prerequisite gating ────────────────────────────────────

describe('QuestEngineService — F5: capstone prerequisite gating', () => {
  const capstone01 = STARTER_QUESTS.find(q => q.id === 'capstone-01')!;
  const capstone02 = STARTER_QUESTS.find(q => q.id === 'capstone-02')!;
  const capstone03 = STARTER_QUESTS.find(q => q.id === 'capstone-03')!;

  async function buildService(completedIds: string[]) {
    const mockGameState = {
      completedQuests: signal<string[]>(completedIds),
      coveredConcepts: signal<string[]>([]),
      xp: signal(0),
      questBank: signal<Quest[]>([]),
      currentQuestId: signal<string | null>(null),
      currentBranch: signal('capstone'),
      allQuests: computed(() => []),
      addToQuestBank: vi.fn(),
      setCurrentQuest: vi.fn(),
      setCurrentBranch: vi.fn(),
      completeQuest: vi.fn(),
    } as unknown as GameStateService;

    const mockClaude = {
      generateQuest: vi.fn(),
      evaluateSubmission: vi.fn(),
    } as unknown as ClaudeApiService;

    await TestBed.configureTestingModule({
      providers: [
        QuestEngineService,
        { provide: GameStateService, useValue: mockGameState },
        { provide: ClaudeApiService, useValue: mockClaude },
      ],
    }).compileComponents();

    return TestBed.inject(QuestEngineService);
  }

  it('all three capstone quests exist in STARTER_QUESTS', () => {
    expect(capstone01).toBeDefined();
    expect(capstone02).toBeDefined();
    expect(capstone03).toBeDefined();
  });

  it('all three capstone quests have branch "capstone"', () => {
    expect(capstone01.branch).toBe('capstone');
    expect(capstone02.branch).toBe('capstone');
    expect(capstone03.branch).toBe('capstone');
  });

  it('capstone-01 has no prerequisites', () => {
    expect(capstone01.prerequisites).toEqual([]);
  });

  it('capstone-02 requires capstone-01', () => {
    expect(capstone02.prerequisites).toContain('capstone-01');
  });

  it('capstone-03 requires capstone-02', () => {
    expect(capstone03.prerequisites).toContain('capstone-02');
  });

  it('capstone-01 is available with no quests completed', async () => {
    const service = await buildService([]);
    expect(service.availableQuests().map(q => q.id)).toContain('capstone-01');
  });

  it('capstone-02 is locked with no quests completed', async () => {
    const service = await buildService([]);
    expect(service.availableQuests().map(q => q.id)).not.toContain('capstone-02');
  });

  it('capstone-02 unlocks after capstone-01 is completed', async () => {
    const service = await buildService(['capstone-01']);
    expect(service.availableQuests().map(q => q.id)).toContain('capstone-02');
  });

  it('capstone-03 is locked when only capstone-01 is completed', async () => {
    const service = await buildService(['capstone-01']);
    expect(service.availableQuests().map(q => q.id)).not.toContain('capstone-03');
  });

  it('capstone-03 unlocks after capstone-02 is completed', async () => {
    const service = await buildService(['capstone-01', 'capstone-02']);
    expect(service.availableQuests().map(q => q.id)).toContain('capstone-03');
  });
});
