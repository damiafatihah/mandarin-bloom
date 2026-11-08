const MARKS: Record<string, string> = {
  a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ',
};

/** "hao3" → "hǎo", "lu:4"/"lv4"/"lü4" → "lǜ", "zi5" → "zi". Anything else is returned unchanged. */
export function syllableToMarks(syllable: string): string {
  const m = /^([a-zA-ZüÜ:]+)([1-5])$/.exec(syllable);
  if (!m) return syllable;
  const tone = Number(m[2]);
  const base = m[1].replace(/u:/g, 'ü').replace(/U:/g, 'Ü').replace(/v/g, 'ü').replace(/V/g, 'Ü');
  if (tone === 5) return base;
  const lower = base.toLowerCase();
  let idx = lower.search(/[ae]/);
  if (idx === -1) idx = lower.indexOf('ou');
  if (idx === -1) {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('iouü'.includes(lower[i])) { idx = i; break; }
    }
  }
  if (idx === -1) return base;
  const vowel = lower[idx];
  const marked = MARKS[vowel][tone - 1];
  const out = base[idx] === vowel ? marked : marked.toUpperCase();
  return base.slice(0, idx) + out + base.slice(idx + 1);
}

export const numericToMarks = (numeric: string) => numeric.split(' ').map(syllableToMarks).join(' ');

/** Lowercase, toneless, spaceless; ü/v/u: all become "u". Used for search and comparisons. */
export function normalizePinyin(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/u:/g, 'u')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '');
}

export type Tone = 1 | 2 | 3 | 4 | 5;

export function toneOfSyllable(marked: string): Tone {
  const d = marked.normalize('NFD');
  if (d.includes('\u0304')) return 1;
  if (d.includes('\u0301')) return 2;
  if (d.includes('\u030c')) return 3;
  if (d.includes('\u0300')) return 4;
  return 5;
}

export const isCJK = (s: string) => /[\u3400-\u9fff\uf900-\ufaff]/.test(s);

/** Same syllables, different tones, never equal to the correct reading. Returns tone-marked strings. */
export function toneVariants(numeric: string, count: number, rng: () => number): string[] {
  const syllables = numeric.trim().split(/\s+/).map((s) => {
    const m = /^(.*?)([1-5])$/.exec(s);
    return m ? { base: m[1], tone: Number(m[2]) } : { base: s, tone: 0 };
  });
  const correct = numericToMarks(numeric.trim());
  const out = new Set<string>();
  for (let attempt = 0; attempt < 300 && out.size < count; attempt++) {
    const candidate = syllables
      .map(({ base, tone }) => {
        if (tone === 0) return base;
        const t = rng() < 0.5 ? tone : 1 + Math.floor(rng() * 4);
        return `${base}${t}`;
      })
      .join(' ');
    const marked = numericToMarks(candidate);
    if (marked !== correct) out.add(marked);
  }
  return [...out];
}
