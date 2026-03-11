import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiEventService {
  readonly settingsRequested = new Subject<void>();

  requestSettings(): void {
    this.settingsRequested.next();
  }
}
