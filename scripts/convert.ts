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

export function convertHsk(raw: RawHsk[]): HskWord[] {
  const seen = new Set<string>();
  const out: HskWord[] = [];
  for (const r of raw) {
    const levels = r.l.filter((l) => /^n\d$/.test(l)).map((l) => Number(l.slice(1)));
    if (!levels.length || !r.f.length || seen.has(r.s)) continue;
    seen.add(r.s);
    // Capitalised readings are surnames/proper nouns (查 Zhā); prefer the first common reading.
    const f = r.f.find((x) => /^[a-zü]/.test(x.i.n)) ?? r.f[0];
    out.push({
      s: r.s, t: f.t, ...cleanPinyin(f.i.y, f.i.n), m: f.m,
      l: Math.min(...levels), q: r.q, c: f.c ?? [], poly: r.f.length > 1,
    });
  }
  return out;
}

const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/;
const VARIANT_ONLY = /^(old |archaic |ancient |erroneous |Japanese |Korean |Taiwan )?variant of /i;

/** Output TSV columns: simplified, traditional, marked pinyin, plain pinyin, meanings joined by "/". */
export function convertCedict(text: string): string {
  const rows: string[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) continue;
    const m = LINE.exec(line);
    if (!m) continue;
    const [, trad, simp, numeric, defs] = m;
    const meanings = defs.split('/').filter(Boolean);
    if (meanings.every((d) => VARIANT_ONLY.test(d))) continue;
    rows.push([simp, trad, numericToMarks(numeric), normalizePinyin(numeric), meanings.join('/')].join('\t'));
  }
  return rows.join('\n');
}
