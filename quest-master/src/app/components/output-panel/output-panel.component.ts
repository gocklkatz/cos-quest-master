import { Component, input } from '@angular/core';

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
}
