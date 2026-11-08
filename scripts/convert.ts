import { normalizePinyin, numericToMarks } from '../src/lib/pinyin.ts';
import type { HskWord } from '../src/lib/types.ts';

export type RawHsk = {
  s: string;
  l: string[];
  q: number;
  f: { t: string; i: { y: string; n: string }; m: string[]; c?: string[] }[];
};

const NUMERIC_OK = /^([a-zA-Zü:]+[1-5])( [a-zA-Zü:]+[1-5])*$/;

/** Upstream tone-marked pinyin has bugs ("lu:è", "Aò"); rebuild from numeric when it is well-formed. */
function cleanPinyin(y: string, n: string): { p: string; n: string } {
  if (NUMERIC_OK.test(n)) return { p: numericToMarks(n), n };
  return { p: y.replace(/u:/g, 'ü').replace(/˙/g, '').replace(/r5\b/g, 'r'), n: '' };
}

const VARIANT_ONLY = /^(?:\S+ ){0,2}variant of /i;
const isVariant = (m: string) => VARIANT_ONLY.test(m);
/** Glosses that only point elsewhere ("used in 自个儿", "see 干嘛", "(equivalent to 的 …)"). */
const POINTER = /^(see( also)?|used in|abbr\.? for|surname|CL:)\b|^\([^)]*[\u3400-\u9fff]/i;
const isJunk = (m: string) => isVariant(m) || POINTER.test(m);

/** CEDICT shorthand → plain English for learners. */
export const expandAbbrev = (m: string) => m.replace(/\bsth\b/g, 'something').replace(/\bsb\b/g, 'someone');

export function convertHsk(raw: RawHsk[]): HskWord[] {
  const seen = new Set<string>();
  const out: HskWord[] = [];
  for (const r of raw) {
    const levels = r.l.filter((l) => /^n\d$/.test(l)).map((l) => Number(l.slice(1)));
    if (!levels.length || !r.f.length || seen.has(r.s)) continue;
    seen.add(r.s);
    // Capitalised readings are surnames/proper nouns (查 Zhā); prefer the first common reading.
    const common = r.f.filter((x) => /^[a-zü]/.test(x.i.n));
    const f =
      common.find((x) => x.m.some((m) => !isJunk(m))) ??
      common.find((x) => x.m.some((m) => !isVariant(m))) ??
      common[0] ?? r.f[0];
    const meanings = f.m.filter((m) => !isVariant(m) && !/^\(Note:/i.test(m));
    out.push({
      s: r.s, t: f.t, ...cleanPinyin(f.i.y, f.i.n), m: (meanings.length ? meanings : f.m).map(expandAbbrev),
      l: Math.min(...levels), q: r.q, c: f.c ?? [], poly: r.f.length > 1,
    });
  }
  return out;
}

const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/;

/** Output TSV columns: simplified, traditional, marked pinyin, plain pinyin, meanings joined by "/". */
export function convertCedict(text: string): string {
  const rows: string[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) continue;
    const m = LINE.exec(line);
    if (!m) continue;
    const [, trad, simp, numeric, defs] = m;
    const meanings = defs.split('/').filter(Boolean);
    if (meanings.every(isVariant)) continue;
    rows.push([simp, trad, numericToMarks(numeric), normalizePinyin(numeric), meanings.map(expandAbbrev).join('/')].join('\t'));
  }
  return rows.join('\n');
}

/** Words whose upstream meanings are only a truncated pointer that no rule can resolve. */
export const MANUAL_MEANINGS: Record<string, string[]> = {
  无可厚非: ['understandable; not deserving of criticism'],
  得意扬扬: ['pleased with oneself; complacent', 'immensely proud'],
  火暴: ['fiery; hot-tempered', 'popular; booming; lively'],
  下功夫: ['to put in time and effort; to work hard at something'],
};

/** HSK words whose meanings are still only "variant of …" get real meanings from CEDICT (same reading first). */
export function fillMeaningsFromCedict(hsk: HskWord[], cedictTsv: string): HskWord[] {
  const bySimp = new Map<string, { p: string; m: string[] }[]>();
  for (const line of cedictTsv.split('\n')) {
    const [s, , p, , m] = line.split('\t');
    if (!m) continue;
    const list = bySimp.get(s) ?? [];
    list.push({ p, m: m.split('/').filter((x) => !isJunk(x)) });
    bySimp.set(s, list);
  }
  const pick = (s: string, p: string) => {
    const cands = (bySimp.get(s) ?? []).filter((c) => c.m.length);
    return cands.find((c) => c.p.toLowerCase() === p.toLowerCase()) ?? cands[0];
  };
  return hsk.map((w) => {
    if (MANUAL_MEANINGS[w.s]) return { ...w, m: MANUAL_MEANINGS[w.s] };
    if (!w.m.every(isJunk)) return w;
    let best = pick(w.s, w.p);
    const ref = /(variant of|see|abbr\.? for) ([\u3400-\u9fff]+)/.exec(w.m[0]);
    // Follow pointers only to real words (≥ 2 chars); single-char targets are truncated upstream junk.
    if (!best && ref && ref[2].length >= Math.min(2, w.s.length)) best = pick(ref[2], w.p);
    return best ? { ...w, m: best.m } : w;
  });
}
