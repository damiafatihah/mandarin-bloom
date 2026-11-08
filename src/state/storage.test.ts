import { describe, expect, it } from 'vitest';
import { loadState, saveState, STORAGE_KEY } from './storage';
import { initialState } from './defaults';
import { makeState } from '../test/fixtures';

describe('storage', () => {
  it('returns initial state for missing, corrupt or wrong-version data', () => {
    expect(loadState()).toEqual(initialState);
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState()).toEqual(initialState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadState()).toEqual(initialState);
  });
  it('round-trips and fills new setting defaults', () => {
    const s = makeState({ known: ['书'] });
    saveState(s);
    expect(loadState()).toEqual(s);
    const partial: Partial<typeof s.settings> = { ...s.settings };
    delete partial.speechRate;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, settings: partial }));
    expect(loadState().settings.speechRate).toBe(0.9);
  });
});

it('survives localStorage being unavailable or full', () => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = () => { throw new DOMException('QuotaExceededError'); };
  try {
    expect(() => saveState(makeState())).not.toThrow();
  } finally {
    Storage.prototype.setItem = orig;
  }
});
