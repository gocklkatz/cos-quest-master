import { Component, ElementRef, afterRenderEffect, input, viewChild } from '@angular/core';
import { CompileError } from '../../models/quest.models';

@Component({
  selector: 'app-output-panel',
  standalone: true,
  templateUrl: './output-panel.component.html',
  styleUrl: './output-panel.component.scss',
})
export class OutputPanelComponent {
  output = input<string | null>(null);
  error = input<string | null>(null);
  isRunning = input(false);
  /** Compile errors from class-mode runs — rendered in red above runtime output. */
  compileErrors = input<CompileError[]>([]);

  private outputBody = viewChild<ElementRef<HTMLElement>>('outputBody');

  constructor() {
    afterRenderEffect(() => {
      // Track all output signals so the effect re-runs on any change.
      this.output();
      this.error();
      this.compileErrors();
      const el = this.outputBody()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
