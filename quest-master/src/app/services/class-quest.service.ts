import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IrisApiService } from './iris-api.service';
import { IRISConfig } from '../models/iris.models';
import { CompileResult, QuestFile } from '../models/quest.models';

@Injectable({ providedIn: 'root' })
export class ClassQuestService {
  private irisApi = inject(IrisApiService);

  /** Class names compiled in the last run — tracked for cleanup on quest switch. */
  private lastClassNames: string[] = [];
  /** Class names marked persistent — excluded from cleanup on quest switch. */
  private persistentClassNames = new Set<string>();

  /**
   * Run all quest files in dependency order:
   * - .cls files: compile via /api/quest/compile
   * - .script files: execute via /api/quest/execute (XECUTE)
   * - testHarness (if any): run after all files succeed
   */
  async runQuestFiles(
    config: IRISConfig,
    files: QuestFile[],
    fileCodeMap: Map<string, string>,
    testHarness?: string,
  ): Promise<CompileResult> {
    const ordered = this.topoSort(files);
    if (ordered === null) {
      return {
        hasErrors: true,
        errors: [{ line: 0, col: 0, text: 'Circular dependency detected in quest files.', severity: 3 }],
        output: '',
        errorKind: 'execution',
      };
    }

    const outputParts: string[] = [];
    const newClassNames: string[] = [];

    for (const file of ordered) {
      const code = fileCodeMap.get(file.id) ?? '';
      if (!code.trim()) continue;

      if (file.fileType === 'cls') {
        const className = file.filename.replace(/\.cls$/i, '');
        const compileResp = await firstValueFrom(this.irisApi.compileClass(config, className, code));
        if (!compileResp.success) {
          const text = compileResp.error ?? 'Compilation failed';
          return {
            hasErrors: true,
            errors: [{ line: 0, col: 0, text: `[${file.label}] ${text}`, severity: 3 }],
            output: '',
            errorKind: 'compile',
          };
        }
        newClassNames.push(className);
        if (file.persistent) this.persistentClassNames.add(className);
        if (compileResp.output?.trim()) {
          outputParts.push(`[${file.label}] ${compileResp.output.trim()}`);
        }
      } else {
        const execResp = await firstValueFrom(this.irisApi.executeCode(config, code));
        if (!execResp.success) {
          return {
            hasErrors: true,
            errors: [{ line: 0, col: 0, text: execResp.error ?? 'Execution failed', severity: 3 }],
            output: '',
            errorKind: 'execution',
          };
        }
        if (execResp.output?.trim()) {
          outputParts.push(execResp.output.trim());
        }
      }
    }

    this.lastClassNames = newClassNames;

    if (testHarness?.trim()) {
      const harnessResp = await firstValueFrom(this.irisApi.executeCode(config, testHarness));
      if (!harnessResp.success) {
        return {
          hasErrors: true,
          errors: [{ line: 0, col: 0, text: harnessResp.error ?? 'Test harness failed', severity: 3 }],
          output: '',
          errorKind: 'execution',
        };
      }
      if (harnessResp.output?.trim()) {
        outputParts.push(harnessResp.output.trim());
      }
    }

    return { hasErrors: false, errors: [], output: outputParts.join('\n') };
  }

  /**
   * Delete all classes compiled in the last run (called on quest switch).
   * Silently ignores failures — namespace cleanup is best-effort.
   */
  async cleanupLastClass(config: IRISConfig): Promise<void> {
    const names = this.lastClassNames;
    this.lastClassNames = [];
    for (const className of names) {
      if (this.persistentClassNames.has(className)) continue;
      await firstValueFrom(
        this.irisApi.executeCode(config, `Do ##class(%SYSTEM.OBJ).Delete("${className}", "-d")`)
      ).catch(() => {});
    }
  }

  /**
   * Topological sort of files based on dependsOn edges.
   * Returns null if a cycle is detected.
   */
  private topoSort(files: QuestFile[]): QuestFile[] | null {
    const idToFile = new Map(files.map(f => [f.id, f]));
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: QuestFile[] = [];

    const visit = (id: string): boolean => {
      if (temp.has(id)) return false; // cycle
      if (visited.has(id)) return true;
      temp.add(id);
      const file = idToFile.get(id);
      for (const dep of file?.dependsOn ?? []) {
        if (!visit(dep)) return false;
      }
      temp.delete(id);
      visited.add(id);
      result.push(idToFile.get(id)!);
      return true;
    };

    for (const file of files) {
      if (!visited.has(file.id)) {
        if (!visit(file.id)) return null;
      }
    }
    return result;
  }
}
