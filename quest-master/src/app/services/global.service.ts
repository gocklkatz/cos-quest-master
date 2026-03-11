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

  refresh(): void {
    this.irisApi
      .getGlobals(this.gameState.irisConfig())
      .pipe(take(1))
      .subscribe(response => this.globals.set(response.globals));
  }
}
