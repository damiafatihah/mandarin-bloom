import type { DictEntry, HskWord } from './types';
import { isCJK, normalizePinyin, numericToMarks } from './pinyin';

const PINYIN_RE = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü:1-5\s']+$/;

export function parseDictTsv(text: string): DictEntry[] {
  const out: DictEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    const [s, t, p, plain, m] = line.split('\t');
    out.push({ s, t, p, plain, m: m.split('/'), ml: m.toLowerCase() });
  }
  return out;
}

export const hskToEntry = (w: HskWord): DictEntry => ({
  s: w.s, t: w.t, p: w.p, plain: normalizePinyin(w.p), m: w.m, ml: w.m.join('/').toLowerCase(),
});

const TONE_MARKS = /[\u0300\u0301\u0304\u030c]/;

/** Tone-aware key: "you2yu4", "yóu yù" → "yóuyù". Returns '' when the query carries no tones. */
export function tonedKey(raw: string): string {
  const q = raw.trim().toLowerCase().replace(/v/g, 'ü').replace(/u:/g, 'ü');
  const hasDigits = /[a-zü][1-5]/.test(q);
  if (!hasDigits && !TONE_MARKS.test(q.normalize('NFD'))) return '';
  const marked = hasDigits ? numericToMarks(q.replace(/([1-5])(?=[a-zü])/g, '$1 ')) : q;
  return marked.normalize('NFC').replace(/[\s']/g, '');
}

const entryToned = (e: DictEntry) => e.p.toLowerCase().normalize('NFC').replace(/[\s']/g, '');

const segments = (e: DictEntry) => e.ml.split(/[;/]/).map((x) => x.trim());

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function score(e: DictEntry, q: string, qPlain: string, qToned: string, cjk: boolean, wordRe: RegExp): number {
  if (cjk) {
    if (e.s === q || e.t === q) return 0;
    if (e.s.startsWith(q) || e.t.startsWith(q)) return 1;
    if (e.s.includes(q) || e.t.includes(q)) return 2;
    return Infinity;
  }
  if (qPlain && e.plain === qPlain) return qToned && entryToned(e) === qToned ? -1 : 0;
  const inMeaning = e.ml.includes(q);
  if (inMeaning && segments(e).some((v) => v === q || v === `to ${q}`)) return 1;
  if (inMeaning && wordRe.test(e.ml)) return 2;
  if (qPlain && e.plain.startsWith(qPlain)) return 3;
  if (inMeaning && q.length >= 3) return 4;
  return Infinity;
}

export function searchDict(entries: DictEntry[], raw: string, freq: Map<string, number> = new Map(), limit = 40): DictEntry[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const cjk = isCJK(q);
  const qPlain = !cjk && PINYIN_RE.test(q) ? normalizePinyin(q) : '';
  const qToned = qPlain ? tonedKey(q) : '';
  const wordRe = new RegExp(`(^|[^a-z])${escapeRe(q)}([^a-z]|$)`);
  const hits: { e: DictEntry; sc: number }[] = [];
  for (const e of entries) {
    const sc = score(e, q, qPlain, qToned, cjk, wordRe);
    if (sc !== Infinity) hits.push({ e, sc });
  }
  hits.sort((a, b) =>
    a.sc - b.sc || (freq.get(a.e.s) ?? 1e9) - (freq.get(b.e.s) ?? 1e9) || a.e.s.length - b.e.s.length);
  return hits.slice(0, limit).map((h) => h.e);
}
