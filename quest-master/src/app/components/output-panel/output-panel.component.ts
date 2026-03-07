import { Component, input } from '@angular/core';
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
}
