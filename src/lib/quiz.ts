import type { HskWord } from './types';
import { seededRng, shuffle } from './rng';
import { normalizePinyin, toneVariants } from './pinyin';

export type QuestionKind = 'meaning-to-hanzi' | 'hanzi-to-meaning' | 'hanzi-to-pinyin' | 'listen-to-hanzi' | 'measure-word';

export type Question = {
  kind: QuestionKind;
  word: string; // simplified hanzi being tested
  instruction: string;
  prompt: string; // big text; empty for listening
  hint?: string;
  speak?: string; // auto-played (listening)
  choices: string[];
  answer: number; // index into choices
  reveal: string; // shown after answering
};

export const INSTRUCTION: Record<QuestionKind, string> = {
  'meaning-to-hanzi': 'Which word means…',
  'hanzi-to-meaning': 'What does this mean?',
  'hanzi-to-pinyin': 'Which tones are right?',
  'listen-to-hanzi': 'Which word did you hear?',
  'measure-word': 'Pick the measure word',
};

export const COMMON_CLASSIFIERS = [
  '个', '本', '张', '条', '只', '件', '位', '辆', '把', '双', '座', '封', '棵', '支', '台',
  '头', '匹', '家', '所', '场', '次', '篇', '首', '部', '份', '片', '间', '块', '杯', '顶',
];

const JUNK_GLOSS = /^(see( also)?|used in|abbr\.? for|surname|(\S+ ){0,2}variant of|CL:|\(?note:)/i;

/** "(coll.) father" → "father"; "security check (abbr. for 安全检查)" → "security check". */
export function cleanGloss(seg: string): string {
  return seg
    .replace(/^\([^()]*\)\s*/, '')
    .replace(/\s*\([^()]*[\u3400-\u9fff][^()]*\)/g, '')
    .replace(/[\u3400-\u9fff|]+(\[[^\]]*\])?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** The first clean, self-explanatory English gloss (no hanzi, no "see X" / "variant of"); used as quiz prompt. */
export function shortMeaning(w: HskWord): string {
  for (const m of w.m) {
    for (const seg of m.split(';')) {
      const g = cleanGloss(seg);
      if (g && !JUNK_GLOSS.test(g)) return g;
    }
  }
  return w.m[0].split(';')[0].trim();
}

/** Every meaning segment of a word, lowercased ("two; both" → {"two", "both"}). */
const meaningCache = new WeakMap<HskWord, Set<string>>();
export function meaningSet(w: HskWord): Set<string> {
  let set = meaningCache.get(w);
  if (!set) {
    set = new Set(w.m.flatMap((m) => m.split(/[;/]/)).map((x) => cleanGloss(x).toLowerCase()).filter(Boolean));
    meaningCache.set(w, set);
  }
  return set;
}

export function availableKinds(w: HskWord, speech: boolean): QuestionKind[] {
  const kinds: QuestionKind[] = ['meaning-to-hanzi', 'hanzi-to-meaning'];
  if (!w.poly && /[1-4]/.test(w.n)) kinds.push('hanzi-to-pinyin');
  if (speech) kinds.push('listen-to-hanzi');
  if (w.c.some((c) => c !== '个')) kinds.push('measure-word');
  return kinds;
}

type Pred = (x: HskWord) => boolean;

/** Pick n distinct distractor keys, trying each tier of preference in order, then anything. */
function distractors(
  pool: HskWord[], w: HskWord, n: number, rng: () => number,
  key: (x: HskWord) => string, tiers: Pred[], reject: Pred = () => false,
): string[] {
  const seen = new Set([key(w)]);
  const out: string[] = [];
  for (const tier of [...tiers, () => true]) {
    for (const x of shuffle(pool.filter(tier), rng)) {
      if (out.length === n) return out;
      const k = key(x);
      if (x.s === w.s || seen.has(k) || reject(x)) continue;
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

function build(
  kind: QuestionKind, w: HskWord, prompt: string, correct: string, wrong: string[],
  rng: () => number, extra: Partial<Question> = {},
): Question {
  const choices = shuffle([correct, ...wrong], rng);
  return {
    kind, word: w.s, instruction: INSTRUCTION[kind], prompt, choices,
    answer: choices.indexOf(correct),
    reveal: `${w.s} · ${w.p} · ${shortMeaning(w)}`,
    ...extra,
  };
}

export function makeQuestion(kind: QuestionKind, w: HskWord, pool: HskWord[], rng: () => number): Question {
  const sameLevel: Pred = (x) => x.l === w.l;
  const sameLength: Pred = (x) => x.s.length === w.s.length;
  switch (kind) {
    case 'meaning-to-hanzi': {
      const prompt = shortMeaning(w);
      const sharesMeaning: Pred = (x) => meaningSet(x).has(prompt.toLowerCase());
      return build(kind, w, prompt, w.s,
        distractors(pool, w, 3, rng, (x) => x.s, [(x) => sameLength(x) && sameLevel(x), sameLength], sharesMeaning), rng);
    }
    case 'hanzi-to-meaning': {
      const own = meaningSet(w);
      const overlaps: Pred = (x) => own.has(shortMeaning(x).toLowerCase());
      return build(kind, w, w.s, shortMeaning(w), distractors(pool, w, 3, rng, shortMeaning, [sameLevel], overlaps), rng);
    }
    case 'hanzi-to-pinyin':
      return build(kind, w, w.s, w.p, toneVariants(w.n, 3, rng), rng);
    case 'listen-to-hanzi': {
      const plain = normalizePinyin(w.p);
      const sound = w.p.toLowerCase();
      const wrong = distractors(pool, w, 3, rng, (x) => x.s,
        [(x) => sameLength(x) && normalizePinyin(x.p) === plain, sameLength],
        (x) => x.p.toLowerCase() === sound);
      return build(kind, w, '', w.s, wrong, rng, { speak: w.s });
    }
    case 'measure-word': {
      const correct = w.c.find((c) => c !== '个') ?? w.c[0];
      const wrong = shuffle(COMMON_CLASSIFIERS.filter((c) => !w.c.includes(c)), rng).slice(0, 3);
      return build(kind, w, `一 ＿ ${w.s}`, correct, wrong, rng, { hint: `${w.p} · ${shortMeaning(w)}` });
    }
  }
}

export type BuildOptions = { speech: boolean; kind?: QuestionKind };

export function buildQuestions(words: string[], pool: HskWord[], seed: string, opts: BuildOptions): Question[] {
  const rng = seededRng(seed);
  const byS = new Map(pool.map((w) => [w.s, w]));
  const out: Question[] = [];
  for (const s of words) {
    const w = byS.get(s);
    if (!w) continue;
    const kinds = availableKinds(w, opts.speech);
    const kind = opts.kind && kinds.includes(opts.kind) ? opts.kind : kinds[Math.floor(rng() * kinds.length)];
    out.push(makeQuestion(kind, w, pool, rng));
  }
  return out;
}
