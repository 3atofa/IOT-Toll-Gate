import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tollgate.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _dark = signal<boolean>(this._loadPreference());

  /** Read-only signal: true when dark mode is active */
  readonly isDark = this._dark.asReadonly();

  constructor() {
    // Apply immediately and on every future change
    effect(() => {
      const dark = this._dark();
      document.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
      } catch { /* ignore */ }
    });
  }

  toggle(): void {
    this._dark.update(d => !d);
  }

  private _loadPreference(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark')  return true;
      if (saved === 'light') return false;
    } catch { /* ignore */ }
    // Fall back to OS-level preference
    return typeof window !== 'undefined'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
      : false;
  }
}
