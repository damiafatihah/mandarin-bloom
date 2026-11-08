export const LEVEL_OPTIONS = [
  { levels: [1, 2, 3], label: 'HSK 1–3', note: 'Everyday basics, a quick refresh' },
  { levels: [4], label: 'HSK 4', note: 'Comfortable conversation' },
  { levels: [5], label: 'HSK 5', note: 'News, work and opinions' },
  { levels: [6], label: 'HSK 6', note: 'Advanced reading' },
  { levels: [7], label: 'HSK 7–9', note: 'Near-native: idioms, formal writing' },
];

export function toggleLevels(current: number[], option: number[]): number[] {
  const on = option.every((l) => current.includes(l));
  const next = on ? current.filter((l) => !option.includes(l)) : [...new Set([...current, ...option])];
  return next.length ? next.sort((a, b) => a - b) : current;
}

export const levelLabel = (l: number) => (l === 7 ? 'HSK 7–9' : `HSK ${l}`);
