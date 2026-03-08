import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IrisApiService } from './iris-api.service';
import { IRISConfig } from '../models/iris.models';
import { CompileResult } from '../models/quest.models';

@Injectable({ providedIn: 'root' })
export class ClassQuestService {
  private irisApi = inject(IrisApiService);

  /** Previously compiled class name — tracked so it can be deleted on quest switch. */
  private lastClassName: string | null = null;

  /**
   * Full class-mode run:
   * 1. Compile source via /api/quest/compile (uses %SYSTEM.OBJ.LoadStream)
   * 2. If compile succeeded, execute the testHarness snippet
   * Returns a CompileResult with errors + runtime output.
   */
  async runClassQuest(
    config: IRISConfig,
    className: string,
    source: string,
    testHarness?: string,
  ): Promise<CompileResult> {
    // 1. Compile the class.
    const compileResp = await firstValueFrom(this.irisApi.compileClass(config, className, source));
    if (!compileResp.success) {
      const text = compileResp.error ?? 'Compilation failed';
      return { hasErrors: true, errors: [{ line: 0, col: 0, text, severity: 3 }], output: '' };
    }

    this.lastClassName = className;

    // 2. Execute test harness if provided.
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
    if (!this.lastClassName) return;
    const className = this.lastClassName;
    this.lastClassName = null;
    await firstValueFrom(
      this.irisApi.executeCode(config, `Do ##class(%SYSTEM.OBJ).Delete("${className}", "-d")`)
    ).catch(() => {});
  }
}
