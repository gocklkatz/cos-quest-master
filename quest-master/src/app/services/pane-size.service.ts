import { Injectable } from '@angular/core';

const KEYS = {
  sidebar: 'qm.pane.sidebar',
  editorOutput: 'qm.pane.editorOutput',
  outputChat: 'qm.pane.outputChat',
} as const;

const DEFAULTS: Record<keyof typeof KEYS, number> = {
  sidebar: 300,
  editorOutput: 200,
  outputChat: 280,
};

const MINS: Record<keyof typeof KEYS, number> = {
  sidebar: 180,
  editorOutput: 80,
  outputChat: 60,
};

@Injectable({ providedIn: 'root' })
export class PaneSizeService {
  get(key: keyof typeof KEYS): number {
    const raw = localStorage.getItem(KEYS[key]);
    if (raw === null) return DEFAULTS[key];
    const val = parseInt(raw, 10);
    if (isNaN(val)) return DEFAULTS[key];
    return Math.max(MINS[key], val);
  }

  set(key: keyof typeof KEYS, value: number): void {
    localStorage.setItem(KEYS[key], String(value));
  }
}
