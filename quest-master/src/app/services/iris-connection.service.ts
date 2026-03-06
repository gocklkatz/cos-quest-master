import { Injectable, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { IrisApiService } from './iris-api.service';
import { IRISConfig } from '../models/iris.models';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

@Injectable({ providedIn: 'root' })
export class IrisConnectionService {
  private irisApi = inject(IrisApiService);

  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  private subscription: Subscription | null = null;

  startPolling(config: IRISConfig): void {
    this.stopPolling();
    this.connectionStatus.set('connecting');

    this.subscription = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.connectionStatus.set('connecting');
          return this.irisApi.healthCheck(config);
        })
      )
      .subscribe(ok => {
        this.connectionStatus.set(ok ? 'connected' : 'disconnected');
      });
  }

  stopPolling(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  checkOnce(config: IRISConfig): void {
    this.connectionStatus.set('connecting');
    this.irisApi.healthCheck(config).subscribe(ok => {
      this.connectionStatus.set(ok ? 'connected' : 'disconnected');
    });
  }
}
