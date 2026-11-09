/**
 * Picks example sentences for HSK words from Tatoeba Chinese–English pairs.
 * Simplified only: any sentence with a character that only exists as a traditional form is dropped.
 */

const CJK = /[\u3400-\u9fff]/;
const MAX_WORD = 8;
const COMMON_NAMES = /汤姆|玛丽|约翰/;

/** Characters that appear in CC-CEDICT only as the traditional form of something (never in simplified writing). */
export function tradOnlyChars(cedictTsv: string): Set<string> {
  const trad = new Set<string>();
  const simp = new Set<string>();
  for (const line of cedictTsv.split('\n')) {
    const [s, t] = line.split('\t');
    if (!s || !t) continue;
    for (const ch of s) simp.add(ch);
    const sc = [...s], tc = [...t];
    if (sc.length !== tc.length) continue;
    tc.forEach((ch, i) => { if (ch !== sc[i]) trad.add(ch); });
  }
  for (const ch of simp) trad.delete(ch);
  return trad;
}

const cjkLength = (s: string) => [...s].filter((c) => CJK.test(c)).length;

/** Short, simplified, no Latin letters, with a reasonably short English translation. */
export function usable(zh: string, en: string, tradOnly: Set<string>): boolean {
  if (/[A-Za-z!-/:-@[-`{-~]/.test(zh.replace(/[0-9]/g, ''))) return false; // Latin letters or English punctuation
  const n = cjkLength(zh);
  if (n < 4 || n > 24 || en.length > 120) return false;
  return ![...zh].some((c) => tradOnly.has(c));
}

/** Forward and backward longest-match segmentation against a word list. */
export function segmentations(text: string, dict: Set<string>): [string[], string[]] {
  const chars = [...text];
  const fwd: string[] = [];
  for (let i = 0; i < chars.length;) {
    let len = Math.min(MAX_WORD, chars.length - i);
    while (len > 1 && !dict.has(chars.slice(i, i + len).join(''))) len--;
    fwd.push(chars.slice(i, i + len).join(''));
    i += len;
  }
  const bwd: string[] = [];
  for (let j = chars.length; j > 0;) {
    let len = Math.min(MAX_WORD, j);
    while (len > 1 && !dict.has(chars.slice(j - len, j).join(''))) len--;
    bwd.unshift(chars.slice(j - len, j).join(''));
    j -= len;
  }
  return [fwd, bwd];
}

export type Examples = { s: [string, string][]; w: Record<string, number[]> };

/**
 * For each HSK word, up to `perWord` sentences in which it is a whole word, ranked easiest first:
 * fewest words above the learner's level (or outside HSK), then shortest.
 */
export function buildExamples(
  pairs: [string, string][], hsk: { s: string; l: number }[], cedictTsv: string, perWord = 3,
): Examples {
  const tradOnly = tradOnlyChars(cedictTsv);
  const level = new Map(hsk.map((w) => [w.s, w.l]));
  const dict = new Set(level.keys());
  for (const line of cedictTsv.split('\n')) {
    const s = line.slice(0, line.indexOf('\t'));
    if (s && [...s].length <= MAX_WORD) dict.add(s);
  }

  const seen = new Set<string>();
  const sentences: { zh: string; en: string; levels: number[]; len: number; names: boolean }[] = [];
  const candidates = new Map<string, Set<number>>();
  for (const [zh, en] of pairs) {
    if (seen.has(zh) || !usable(zh, en, tradOnly)) continue;
    seen.add(zh);
    const [fwd, bwd] = segmentations(zh, dict);
    const idx = sentences.length;
    sentences.push({
      zh, en, len: cjkLength(zh), names: COMMON_NAMES.test(zh),
      levels: fwd.filter((w) => CJK.test(w)).map((w) => level.get(w) ?? 99),
    });
    for (const w of new Set([...fwd, ...bwd])) {
      if (!level.has(w)) continue;
      let set = candidates.get(w);
      if (!set) candidates.set(w, (set = new Set()));
      set.add(idx);
    }
  }

  const out: Examples = { s: [], w: {} };
  const remap = new Map<number, number>();
  for (const { s: word } of hsk) {
    const idxs = candidates.get(word);
    if (!idxs) continue;
    const ceiling = Math.max(level.get(word)!, 2) + 1;
    const score = (i: number) => {
      const x = sentences[i];
      // the word itself is allowed to be hard; count the other hard words
      const hard = x.levels.filter((l) => l > ceiling).length - ((level.get(word)! > ceiling) ? 1 : 0);
      return hard * 3 + x.len * 0.3 + (x.names ? 2 : 0);
    };
    const best = [...idxs]
      .map((i) => ({ i, sc: score(i) }))
      .sort((a, b) => a.sc - b.sc || sentences[a.i].zh.localeCompare(sentences[b.i].zh))
      .filter(({ i }, k, all) => all.findIndex((x) => sentences[x.i].en === sentences[i].en) === k) // one per translation
      .slice(0, perWord);
    out.w[word] = best.map(({ i }) => {
      let j = remap.get(i);
      if (j === undefined) {
        j = out.s.length;
        remap.set(i, j);
        out.s.push([sentences[i].zh, sentences[i].en]);
      }
      return j;
    });
  }
  return out;
}
