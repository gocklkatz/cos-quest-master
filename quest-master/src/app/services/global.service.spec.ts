import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { GlobalService } from './global.service';
import { IrisApiService } from './iris-api.service';
import { GameStateService } from './game-state.service';
import { GlobalsResponse, IRISConfig } from '../models/iris.models';

const MOCK_CONFIG: IRISConfig = {
  baseUrl: 'http://localhost:52773',
  namespace: 'USER',
  username: '_SYSTEM',
  password: 'password',
};

const MOCK_RESPONSE: GlobalsResponse = {
  globals: [
    {
      name: '^Test',
      children: [
        { key: '1', value: 'Hello', children: [] },
        { key: '2', children: [{ key: 'data', value: 'World', children: [] }] },
      ],
    },
  ],
};

function buildMockIrisApi(response: GlobalsResponse = MOCK_RESPONSE) {
  return { getGlobals: vi.fn().mockReturnValue(of(response)) } as unknown as IrisApiService;
}

function buildMockGameState(config: IRISConfig = MOCK_CONFIG) {
  return { irisConfig: signal(config) } as unknown as GameStateService;
}

describe('GlobalService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('initialises with an empty globals signal', () => {
    TestBed.configureTestingModule({
      providers: [
        GlobalService,
        { provide: IrisApiService, useValue: buildMockIrisApi() },
        { provide: GameStateService, useValue: buildMockGameState() },
      ],
    });
    const service = TestBed.inject(GlobalService);
    expect(service.globals()).toEqual([]);
  });

  it('updates the globals signal after refresh()', () => {
    const mockApi = buildMockIrisApi();
    TestBed.configureTestingModule({
      providers: [
        GlobalService,
        { provide: IrisApiService, useValue: mockApi },
        { provide: GameStateService, useValue: buildMockGameState() },
      ],
    });
    const service = TestBed.inject(GlobalService);
    service.refresh();
    expect(service.globals()).toEqual(MOCK_RESPONSE.globals);
  });

  it('passes the current irisConfig to getGlobals', () => {
    const customConfig: IRISConfig = { ...MOCK_CONFIG, namespace: 'MYNS' };
    const mockApi = buildMockIrisApi({ globals: [] });
    TestBed.configureTestingModule({
      providers: [
        GlobalService,
        { provide: IrisApiService, useValue: mockApi },
        { provide: GameStateService, useValue: buildMockGameState(customConfig) },
      ],
    });
    const service = TestBed.inject(GlobalService);
    service.refresh();
    expect(mockApi.getGlobals).toHaveBeenCalledWith(customConfig);
  });

  it('falls back to empty globals on API error', () => {
    const errorApi = {
      getGlobals: vi.fn().mockReturnValue(of({ globals: [] })),
    } as unknown as IrisApiService;
    TestBed.configureTestingModule({
      providers: [
        GlobalService,
        { provide: IrisApiService, useValue: errorApi },
        { provide: GameStateService, useValue: buildMockGameState() },
      ],
    });
    const service = TestBed.inject(GlobalService);
    service.refresh();
    expect(service.globals()).toEqual([]);
  });
});
