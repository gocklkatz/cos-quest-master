import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IrisApiService } from './iris-api.service';
import { IRISConfig } from '../models/iris.models';
import { CompileResult, CompileError } from '../models/quest.models';

@Injectable({ providedIn: 'root' })
export class ClassQuestService {
  private irisApi = inject(IrisApiService);

  /** Previously compiled class doc name — tracked so it can be deleted on quest switch. */
  private lastDocName: string | null = null;

  /**
   * Full class-mode run:
   * 1. Save source to Atelier
   * 2. Compile
   * 3. If compile succeeded, execute the testHarness snippet
   * Returns a CompileResult with errors + runtime output.
   */
  async runClassQuest(
    config: IRISConfig,
    className: string,
    source: string,
    testHarness?: string,
  ): Promise<CompileResult> {
    const docName = `${className}.cls`;

    // 1. Save the class source — split into lines as Atelier expects.
    const lines = source.split('\n');
    const saveResp = await firstValueFrom(this.irisApi.atelierSave(config, docName, lines));
    if (saveResp?.error) {
      return { hasErrors: true, errors: [{ line: 0, col: 0, text: saveResp.error, severity: 3 }], output: '' };
    }

    this.lastDocName = docName;

    // 2. Compile.
    const compileResp = await firstValueFrom(this.irisApi.atelierCompile(config, [docName]));
    if (compileResp?.error) {
      return { hasErrors: true, errors: [{ line: 0, col: 0, text: compileResp.error, severity: 3 }], output: '' };
    }

    const errors = this.parseCompileErrors(compileResp);
    if (errors.length > 0) {
      return { hasErrors: true, errors, output: '' };
    }

    // 3. Execute test harness if provided.
    if (!testHarness?.trim()) {
      return { hasErrors: false, errors: [], output: '' };
    }

    const execResp = await firstValueFrom(this.irisApi.executeCode(config, testHarness));
    if (!execResp.success) {
      return {
        hasErrors: true,
        errors: [{ line: 0, col: 0, text: execResp.error ?? 'Test harness failed', severity: 3 }],
        output: '',
      };
    }

    return { hasErrors: false, errors: [], output: execResp.output ?? '' };
  }

  /**
   * Delete the previously compiled class from IRIS (called on quest switch).
   * Silently ignores failures — namespace cleanup is best-effort.
   */
  async cleanupLastClass(config: IRISConfig): Promise<void> {
    if (!this.lastDocName) return;
    const docName = this.lastDocName;
    this.lastDocName = null;
    await firstValueFrom(this.irisApi.atelierDelete(config, docName)).catch(() => {});
  }

  private parseCompileErrors(compileResp: any): CompileError[] {
    const errors: CompileError[] = [];
    try {
      const content: any[] = compileResp?.result?.content ?? [];
      for (const file of content) {
        const statuses: any[] = file?.status ?? [];
        for (const s of statuses) {
          if (s.severity >= 3) {
            errors.push({ line: s.line ?? 0, col: s.col ?? 0, text: s.text ?? 'Unknown error', severity: s.severity });
          }
        }
      }
      // Also check top-level status errors
      const topErrors: any[] = compileResp?.status?.errors ?? [];
      for (const e of topErrors) {
        errors.push({ line: 0, col: 0, text: e.text ?? JSON.stringify(e), severity: 3 });
      }
    } catch {
      // parse failure — not a compile error
    }
    return errors;
  }
}
