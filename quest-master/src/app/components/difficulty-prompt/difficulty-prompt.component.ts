import { Component, output, signal } from '@angular/core';
import { DifficultyPreference, AdvancedFocus } from '../../models/game-state.models';

@Component({
  selector: 'app-difficulty-prompt',
  standalone: true,
  templateUrl: './difficulty-prompt.component.html',
  styleUrl: './difficulty-prompt.component.scss',
})
export class DifficultyPromptComponent {
  confirmed = output<{ preference: DifficultyPreference; focus: AdvancedFocus | null }>();

  selectedPreference = signal<DifficultyPreference | null>(null);
  selectedFocus = signal<AdvancedFocus | null>(null);

  readonly isConfirmDisabled = () => {
    const pref = this.selectedPreference();
    if (!pref) return true;
    if (pref === 'advanced' && !this.selectedFocus()) return true;
    return false;
  };

  selectPreference(pref: DifficultyPreference): void {
    this.selectedPreference.set(pref);
    if (pref !== 'advanced') {
      this.selectedFocus.set(null);
    }
  }

  selectFocus(focus: AdvancedFocus): void {
    this.selectedFocus.set(focus);
  }

  confirm(): void {
    const pref = this.selectedPreference();
    if (!pref) return;
    if (pref === 'advanced' && !this.selectedFocus()) return;
    this.confirmed.emit({ preference: pref, focus: this.selectedFocus() });
  }
}
