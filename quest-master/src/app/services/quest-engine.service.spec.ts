import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { vi } from 'vitest';
import { QuestEngineService } from './quest-engine.service';
import { GameStateService } from './game-state.service';
import { ClaudeApiService } from './claude-api.service';
import { Quest } from '../models/quest.models';

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

  function buildMockGameState() {
    return {
      completedQuests: signal<string[]>([]),
      coveredConcepts: signal<string[]>([]),
      xp: signal(0),
      questBank: signal<Quest[]>([]),
      currentQuestId: signal<string | null>(null),
      allQuests: computed(() => []),
      addToQuestBank: vi.fn(),
      setCurrentQuest: vi.fn(),
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
      expect.any(Array), expect.any(Array), 'globals', expect.any(String), 'key-123'
    );
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
