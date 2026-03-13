/**
 * Tree Visualizer filter tests — verifies that typing in the filter input
 * updates the filterTerm signal and causes the count label and filteredGlobals
 * to reflect only matching globals.
 *
 * Three layers tested:
 *  1. globalMatchesFilter() pure helper
 *  2. filteredGlobals computed (signal logic)
 *  3. Template DOM binding: input → signal → count text
 */
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { vi } from 'vitest';
import { TreeVisualizerComponent } from './tree-visualizer.component';
import { GlobalService } from '../../services/global.service';
import { globalMatchesFilter } from '../../utils/global-filter';
import { GlobalEntry } from '../../models/iris.models';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONFIG_GLOBAL: GlobalEntry = {
  name: '^Ens.Config.SearchTablePropC',
  children: [{ key: '1', value: 'some value', children: [] }],
};

const OTHER_GLOBAL: GlobalEntry = {
  name: '^MyCounter',
  children: [{ key: '1', value: '42', children: [] }],
};

const ALBERT_GLOBAL: GlobalEntry = {
  name: '^Learning.AdventurerD',
  children: [{ key: '1', value: 'Albert', children: [] }],
};

function buildMockGlobalService() {
  const globalsSignal = signal<GlobalEntry[]>([CONFIG_GLOBAL, OTHER_GLOBAL, ALBERT_GLOBAL]);
  const filterTermSignal = signal<string>('');
  return {
    globals: globalsSignal,
    filterTerm: filterTermSignal,
    loading: signal(false),
    error: signal<string | null>(null),
    lastRefreshed: signal<Date | null>(null),
    refresh: vi.fn(),
  } as unknown as GlobalService;
}

// ── 1. Pure helper ─────────────────────────────────────────────────────────────

describe('globalMatchesFilter()', () => {
  it('returns true when no filter term', () => {
    expect(globalMatchesFilter(CONFIG_GLOBAL, '')).toBe(true);
  });

  it('matches on global name (case-insensitive)', () => {
    expect(globalMatchesFilter(CONFIG_GLOBAL, 'config')).toBe(true);
    expect(globalMatchesFilter(CONFIG_GLOBAL, 'CONFIG')).toBe(true);
    expect(globalMatchesFilter(OTHER_GLOBAL, 'config')).toBe(false);
  });

  it('matches on child value (Albert in ^Learning.AdventurerD)', () => {
    expect(globalMatchesFilter(ALBERT_GLOBAL, 'albert')).toBe(true);
    expect(globalMatchesFilter(OTHER_GLOBAL, 'albert')).toBe(false);
  });

  it('does not match unrelated globals', () => {
    expect(globalMatchesFilter(OTHER_GLOBAL, 'config')).toBe(false);
    expect(globalMatchesFilter(OTHER_GLOBAL, 'albert')).toBe(false);
  });
});

// ── 2. filteredGlobals computed ────────────────────────────────────────────────

describe('TreeVisualizerComponent — filteredGlobals computed', () => {
  let mockService: GlobalService;
  let fixture: ComponentFixture<TreeVisualizerComponent>;
  let component: TreeVisualizerComponent;

  beforeEach(async () => {
    mockService = buildMockGlobalService();

    await TestBed.configureTestingModule({
      imports: [TreeVisualizerComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: GlobalService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeVisualizerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('returns all globals when filterTerm is empty', () => {
    mockService.filterTerm.set('');
    expect(component.filteredGlobals()).toHaveLength(3);
  });

  it('filters to only Config globals when filterTerm is "Config"', () => {
    mockService.filterTerm.set('Config');
    const result = component.filteredGlobals();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('^Ens.Config.SearchTablePropC');
  });

  it('surfaces ^Learning.AdventurerD when filterTerm is "Albert" (value match)', () => {
    mockService.filterTerm.set('Albert');
    const result = component.filteredGlobals();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('^Learning.AdventurerD');
  });

  it('returns empty array when nothing matches', () => {
    mockService.filterTerm.set('zzznomatch');
    expect(component.filteredGlobals()).toHaveLength(0);
  });
});

// ── 3. DOM binding: input → signal → count text ────────────────────────────────

describe('TreeVisualizerComponent — DOM filter binding', () => {
  let mockService: GlobalService;
  let fixture: ComponentFixture<TreeVisualizerComponent>;

  beforeEach(async () => {
    mockService = buildMockGlobalService();

    await TestBed.configureTestingModule({
      imports: [TreeVisualizerComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: GlobalService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeVisualizerComponent);
    await fixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('shows "X globals — type to filter" when filter is empty', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('globals — type to filter');
  });

  it('updates filterTerm signal when user types in the input', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.filter-input');
    input.value = 'Config';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(mockService.filterTerm()).toBe('Config');
  });

  it('shows filtered count after typing "Config"', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.filter-input');
    input.value = 'Config';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Showing 1 of 3 globals');
  });

  it('clears the filter and shows all globals when clearFilter() is called', async () => {
    mockService.filterTerm.set('Config');
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.clearFilter();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockService.filterTerm()).toBe('');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('globals — type to filter');
  });
});
