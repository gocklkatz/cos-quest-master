import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { SettingsModalComponent } from './settings-modal.component';
import { GameStateService } from '../../services/game-state.service';
import { IrisConnectionService } from '../../services/iris-connection.service';
import { QuestEngineService } from '../../services/quest-engine.service';
import { STARTER_QUESTS } from '../../data/starter-quests';

describe('SettingsModalComponent — Dynamic Quest Regeneration (F1)', () => {
  function buildMockGameState(apiKey = 'test-api-key') {
    return {
      irisConfig: signal({ baseUrl: '', namespace: 'USER', username: '_SYSTEM', password: '' }),
      anthropicApiKey: signal(apiKey),
      playerName: signal('Tester'),
      resetProgress: vi.fn(),
      updateSettings: vi.fn(),
      clearQuestBank: vi.fn(),
    } as unknown as GameStateService;
  }

  function buildMockQuestEngine() {
    return {
      initialize: vi.fn(),
      generateNextQuest: vi.fn().mockResolvedValue(null),
    } as unknown as QuestEngineService;
  }

  function buildMockConnectionSvc() {
    return { startPolling: vi.fn() } as unknown as IrisConnectionService;
  }

  it('STARTER_QUESTS contains only quest-zero', () => {
    expect(STARTER_QUESTS.length).toBe(1);
    expect(STARTER_QUESTS[0].id).toBe('quest-zero');
  });

  it('calls generateNextQuest fire-and-forget after resetProgress when apiKey is set', async () => {
    const mockGameState = buildMockGameState('test-api-key');
    const mockQuestEngine = buildMockQuestEngine();

    await TestBed.configureTestingModule({
      imports: [SettingsModalComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameState },
        { provide: QuestEngineService, useValue: mockQuestEngine },
        { provide: IrisConnectionService, useValue: buildMockConnectionSvc() },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.componentInstance.doReset();

    expect(mockGameState.resetProgress).toHaveBeenCalled();
    expect(mockQuestEngine.generateNextQuest).toHaveBeenCalledWith('setup', 'test-api-key');
  });

  it('does NOT call generateNextQuest when apiKey is empty', async () => {
    const mockGameState = buildMockGameState('');
    const mockQuestEngine = buildMockQuestEngine();

    await TestBed.configureTestingModule({
      imports: [SettingsModalComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameState },
        { provide: QuestEngineService, useValue: mockQuestEngine },
        { provide: IrisConnectionService, useValue: buildMockConnectionSvc() },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.componentInstance.doReset();

    expect(mockGameState.resetProgress).toHaveBeenCalled();
    expect(mockQuestEngine.generateNextQuest).not.toHaveBeenCalled();
  });
});
