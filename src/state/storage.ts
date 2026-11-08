import type { AppState } from '../lib/types';
import { DEFAULT_SETTINGS, initialState } from './defaults';

export const STORAGE_KEY = 'xuehai.v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed?.version !== 1) return initialState;
    return { ...initialState, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } } as AppState;
  } catch {
    return initialState;
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private mode / quota exceeded: keep working in memory rather than crashing the app.
  }
}
