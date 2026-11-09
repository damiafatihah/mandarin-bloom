import type { AppState, Card, DayRecord } from '../lib/types';

/**
 * Combines this device's progress (`a`) with another copy (`b`, usually the cloud) without losing anything:
 * union of words in review, known words and days; for conflicts the more-advanced copy wins.
 * Ties favour `a`, so merging is stable on the device doing it.
 */
export function mergeStates(a: AppState, b: AppState): AppState {
  const ea = a.epoch ?? 0, eb = b.epoch ?? 0;
  if (ea !== eb) return ea > eb ? a : b; // a newer "Reset all progress" wins outright

  const settingsFromB = (b.settingsAt ?? 0) > (a.settingsAt ?? 0);
  const out: AppState = {
    ...a,
    onboarded: a.onboarded || b.onboarded,
    settings: settingsFromB ? b.settings : a.settings,
    cards: mergeCards(a.cards, b.cards),
    known: [...new Set([...a.known, ...b.known])],
    days: mergeDays(a.days, b.days),
  };
  const settingsAt = Math.max(a.settingsAt ?? 0, b.settingsAt ?? 0);
  if (settingsAt) out.settingsAt = settingsAt;
  else delete out.settingsAt;
  const practice = a.practice ?? b.practice;
  if (practice) out.practice = practice;
  return out;
}

/** More reviews = more recent; then the later due date; ties keep `a`. */
const newerCard = (x: Card, y: Card) => (y.seen > x.seen || (y.seen === x.seen && y.due > x.due) ? y : x);

function mergeCards(a: Record<string, Card>, b: Record<string, Card>): Record<string, Card> {
  const out = { ...a };
  for (const [w, c] of Object.entries(b)) out[w] = out[w] ? newerCard(out[w], c) : c;
  return out;
}

function mergeDays(a: Record<string, DayRecord>, b: Record<string, DayRecord>): Record<string, DayRecord> {
  const out = { ...a };
  for (const [k, d] of Object.entries(b)) out[k] = out[k] ? mergeDay(out[k], d) : d;
  return out;
}

const doneCount = (d: DayRecord) => Object.keys(d.handled ?? {}).length;
const answered = (d: DayRecord) => d.challengeRun?.answers.filter((x) => x != null).length ?? 0;

function mergeDay(x: DayRecord, y: DayRecord): DayRecord {
  // The side that did more keeps its list (so untouched words trimmed on one device don't come back);
  // words done on the other side are added after it.
  const [base, other] = doneCount(y) > doneCount(x) ? [y, x] : [x, y];
  const handled = { ...other.handled, ...base.handled };
  const words = [...base.words, ...other.words.filter((w) => handled[w] && !base.words.includes(w))];
  const out: DayRecord = { ...base, words };
  if (Object.keys(handled).length || base.handled) out.handled = handled;

  // Challenge: a finished one wins, else the one further along. Its words and progress travel together.
  const rank = (d: DayRecord) => (d.challenge ? 1000 : 0) + answered(d) + (d.challengeWords ? 0.5 : 0);
  const ch = rank(y) > rank(x) ? y : x;
  delete out.challenge; delete out.challengeRun; delete out.challengeWords;
  if (ch.challengeWords) out.challengeWords = ch.challengeWords;
  if (ch.challengeRun) out.challengeRun = ch.challengeRun;
  if (ch.challenge) out.challenge = ch.challenge;
  return out;
}
