import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { IrisConnectionService } from './services/iris-connection.service';
import { UiEventService } from './services/ui-event.service';
import { Subject } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: IrisConnectionService,
          useValue: {
            startPolling: vi.fn(),
            stopPolling: vi.fn(),
            connectionStatus: signal('disconnected' as const),
          },
        },
        {
          provide: UiEventService,
          useValue: { settingsRequested: new Subject<void>(), requestSettings: vi.fn() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(App, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })
    .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // triggers ngOnInit so settingsSub is initialised before ngOnDestroy
    expect(fixture.componentInstance).toBeTruthy();
  });
});
