/** One HSK 3.0 word. `s` (simplified) is the stable id. */
export type HskWord = {
  s: string; // simplified, e.g. "爱好"
  t: string; // traditional, e.g. "愛好" (kept only so a pasted traditional word resolves; never displayed)
  p: string; // pinyin with tone marks, e.g. "ài hào"
  n: string; // numeric pinyin, e.g. "ai4 hao4"
  m: string[]; // meanings
  l: number; // HSK 3.0 level 1–7 (7 means 7–9)
  q: number; // frequency rank, lower = more common
  c: string[]; // classifiers / measure words
  poly: boolean; // has more than one reading
  fn: boolean; // single-character grammar/function word (而, 却, 呀): kept out of daily picks
};

export type DictEntry = {
  s: string;
  t: string;
  p: string; // tone-marked pinyin
  plain: string; // toneless, spaceless, lowercase pinyin for search: "nihao"
  m: string[];
  ml: string; // meanings joined by "/" and lowercased, for search
};

export type Card = { box: number; due: string; seen: number; correct: number };

export type Settings = {
  wordsPerDay: number;
  levels: number[];
  toneColors: boolean;
  speechRate: number;
  voiceName: string; // '' = automatic (browser default Chinese voice)
};

export type DayRecord = {
  words: string[];
  skipped?: number;
  challengeWords?: string[];
  challenge?: { score: number; total: number };
};

export type AppState = {
  version: 1;
  onboarded: boolean;
  settings: Settings;
  known: string[];
  cards: Record<string, Card>;
  days: Record<string, DayRecord>;
};
