import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IRISConfig, ExecuteResult } from '../models/iris.models';

@Injectable({ providedIn: 'root' })
export class IrisApiService {
  private http = inject(HttpClient);

  // Paths are relative so Angular's dev-server proxy (proxy.conf.json) forwards them to IRIS.
  // In production, configure CORS on IRIS and set baseUrl; relative paths will still work
  // when served from the same origin as IRIS, or swap to absolute URLs if needed.

  healthCheck(config: IRISConfig): Observable<boolean> {
    return this.http
      .get(`/api/quest/health`, { headers: this.getHeaders(config) })
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  executeCode(config: IRISConfig, code: string): Observable<ExecuteResult> {
    return this.http
      .post<ExecuteResult>(`/api/quest/execute`, { code }, { headers: this.getHeaders(config) })
      .pipe(
        catchError(err => of({ success: false, error: err.message ?? 'Request failed' }))
      );
  }

  compileClass(config: IRISConfig, className: string, source: string): Observable<ExecuteResult> {
    return this.http
      .post<ExecuteResult>(`/api/quest/compile`, { className, source }, { headers: this.getHeaders(config) })
      .pipe(
        catchError(err => of({ success: false, error: err.message ?? 'Request failed' }))
      );
  }

  saveDocument(config: IRISConfig, docName: string, content: string): Observable<ExecuteResult> {
    return this.http
      .put<ExecuteResult>(
        `/api/atelier/v1/${config.namespace}/doc/${docName}`,
        { content },
        { headers: this.getHeaders(config) }
      )
      .pipe(
        catchError(err => of({ success: false, error: err.message ?? 'Request failed' }))
      );
  }

  private getHeaders(config: IRISConfig): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${config.username}:${config.password}`),
    });
  }
}
