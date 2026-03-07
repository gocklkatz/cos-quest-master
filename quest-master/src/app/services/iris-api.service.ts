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
        catchError(err => of({ success: false, error: this.friendlyError(err) }))
      );
  }

  compileClass(config: IRISConfig, className: string, source: string): Observable<ExecuteResult> {
    return this.http
      .post<ExecuteResult>(`/api/quest/compile`, { className, source }, { headers: this.getHeaders(config) })
      .pipe(
        catchError(err => of({ success: false, error: this.friendlyError(err) }))
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
        catchError(err => of({ success: false, error: this.friendlyError(err) }))
      );
  }

  /** Save a .cls document via Atelier and return the raw Atelier response. */
  atelierSave(config: IRISConfig, docName: string, lines: string[]): Observable<any> {
    const body = { enc: false, content: lines };
    return this.http
      .put<any>(
        `/api/atelier/v1/${config.namespace}/doc/${docName}`,
        body,
        { headers: this.getHeaders(config) }
      )
      .pipe(catchError(err => of({ error: this.friendlyError(err) })));
  }

  /** Compile one or more documents via Atelier and return the raw compile response. */
  atelierCompile(config: IRISConfig, docNames: string[]): Observable<any> {
    return this.http
      .post<any>(
        `/api/atelier/v1/${config.namespace}/action/compile`,
        docNames,
        { headers: this.getHeaders(config) }
      )
      .pipe(catchError(err => of({ error: this.friendlyError(err) })));
  }

  /** Delete a document from IRIS via Atelier. */
  atelierDelete(config: IRISConfig, docName: string): Observable<any> {
    return this.http
      .delete<any>(
        `/api/atelier/v1/${config.namespace}/doc/${docName}`,
        { headers: this.getHeaders(config) }
      )
      .pipe(catchError(err => of({ error: err.message })));
  }

  private friendlyError(err: { status?: number; message?: string }): string {
    if (err.status === 0) {
      return 'Could not reach IRIS. Check that Docker is running and the dev-server proxy is configured correctly.';
    }
    if (err.status === 401 || err.status === 403) {
      return `IRIS authentication failed (${err.status}). Check your username and password in Settings.`;
    }
    if (err.status != null && err.status >= 500) {
      return `IRIS returned an error (${err.status}). The server may be starting up — try again in a moment.`;
    }
    return err.message ?? 'Request failed';
  }

  private getHeaders(config: IRISConfig): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${config.username}:${config.password}`),
    });
  }
}
