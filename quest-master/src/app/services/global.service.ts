import { Injectable, inject, signal } from '@angular/core';
import { take } from 'rxjs/operators';
import { IrisApiService } from './iris-api.service';
import { GameStateService } from './game-state.service';
import { GlobalEntry } from '../models/iris.models';

@Injectable({ providedIn: 'root' })
export class GlobalService {
  private irisApi = inject(IrisApiService);
  private gameState = inject(GameStateService);

  readonly globals = signal<GlobalEntry[]>([]);
  readonly filterTerm = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly lastRefreshed = signal<Date | null>(null);

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.irisApi
      .getGlobals(this.gameState.irisConfig())
      .pipe(take(1))
      .subscribe({
        next: response => {
          this.globals.set(response.globals.filter(g => !g.name.replace(/^\^/, '').startsWith('%')));
          this.lastRefreshed.set(new Date());
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err?.message ?? 'Failed to load globals');
          this.loading.set(false);
        },
      });
  }
}
