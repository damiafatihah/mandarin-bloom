import type { AppState, Settings } from '../lib/types';

export const DEFAULT_SETTINGS: Settings = {
  wordsPerDay: 5,
  levels: [4, 5],
  toneColors: true,
  speechRate: 0.9,
};

export const initialState: AppState = {
  version: 1,
  onboarded: false,
  settings: DEFAULT_SETTINGS,
  known: [],
  cards: {},
  days: {},
};
