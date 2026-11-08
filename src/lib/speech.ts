/**
 * Mandarin text-to-speech on top of the Web Speech API, hardened against a measured Chrome/macOS bug.
 *
 * THE BUG (reproduced with the real engine, e2e real-engine experiments): calling speechSynthesis.cancel()
 * in the same instant as a speak() whose utterance has not started yet jams the engine. `speaking` stays
 * true, every later utterance is cancelled, and pause()/resume()/cancel() do not help; only leaving it alone
 * for a few seconds does. The original code did `cancel(); speak()` on every click, so two calls at once
 * (a listening question's auto-play runs twice under React StrictMode in dev) jammed it, and every 🔊 after
 * that stayed silent: "sound worked at first, then stopped".
 *
 * THE RULES this module follows:
 *  1. Never touch the engine synchronously: calls are coalesced on a 0ms timer (latest text wins).
 *  2. Never cancel an utterance that has not started. If ours is still queued, wait for its start event.
 *  3. Only cancel a playing utterance, then wait GAP_MS before speaking again.
 *  4. Use the browser's default Chinese voice unless the learner picked one in settings.
 *  5. Keep a strong reference to the in-flight utterance (Chrome can GC it and drop its events).
 */

export const speechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.speechSynthesis?.speak === 'function';

const NOVELTY = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;
const GAP_MS = 100; // after cancelling a playing word (tested pattern on the real engine)
const STALE_MS = 4000; // our utterance never started (engine jammed by something else): stop waiting for it

type Want = { text: string; rate: number };

let want: Want | null = null; // latest request not yet spoken
let current: SpeechSynthesisUtterance | null = null; // our in-flight utterance (strong ref)
let started = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let staleTimer: ReturnType<typeof setTimeout> | undefined;
let preferred = '';

/** For tests only. */
export function __resetSpeech() {
  clearTimeout(flushTimer);
  clearTimeout(staleTimer);
  flushTimer = staleTimer = undefined;
  want = null;
  current = null;
  started = false;
  preferred = '';
}

export const currentUtterance = () => current;

export function setPreferredVoice(name: string) {
  preferred = name;
}

const normLang = (lang: string) => lang.replace('_', '-');
const isMandarin = (v: SpeechSynthesisVoice) => /^(zh(-(cn|tw|sg|hans|hant)|$)|cmn)/i.test(normLang(v.lang));

/** Mandarin voices (Cantonese zh-HK excluded): real voices first, mainland first, offline first, novelty last. */
export function chineseVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  const rank = (v: SpeechSynthesisVoice) =>
    (NOVELTY.test(v.name) ? 100 : 0) + (/^(zh-cn|cmn)/i.test(normLang(v.lang)) ? 0 : 10) + (v.localService ? 0 : 1);
  return window.speechSynthesis
    .getVoices()
    .filter(isMandarin)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

function schedule(ms = 0) {
  if (flushTimer === undefined) flushTimer = setTimeout(flush, ms);
}

function flush() {
  flushTimer = undefined;
  if (!want) return;
  const synth = window.speechSynthesis;
  if (synth.paused) synth.resume();
  if (current && !started) return; // rule 2: wait for its start event (onstart re-schedules)
  if (current && started) {
    // rule 3: interrupt the playing word, then speak after a gap
    current = null;
    started = false;
    clearTimeout(staleTimer);
    synth.cancel();
    schedule(GAP_MS);
    return;
  }
  speakNow();
}

function speakNow() {
  const synth = window.speechSynthesis;
  const w = want!;
  want = null;
  const u = new SpeechSynthesisUtterance(w.text);
  const voice = preferred ? synth.getVoices().find((v) => v.name === preferred) : undefined;
  u.lang = voice ? normLang(voice.lang) : 'zh-CN';
  if (voice) u.voice = voice;
  u.rate = w.rate;

  const done = () => {
    if (current !== u) return;
    current = null;
    started = false;
    clearTimeout(staleTimer);
    if (want) schedule();
  };
  u.onstart = () => {
    if (current !== u) return;
    started = true;
    clearTimeout(staleTimer);
    if (want) schedule(); // a newer click arrived while this one was queued
  };
  u.onend = done;
  u.onerror = done;

  current = u;
  started = false;
  clearTimeout(staleTimer);
  // If it never starts (engine jammed by something else), forget it without cancelling: cancelling would
  // prolong the jam. The next request then queues behind and plays once the engine recovers.
  staleTimer = setTimeout(() => {
    if (current === u && !started) {
      current = null;
      if (want) schedule();
    }
  }, STALE_MS);
  synth.speak(u);
}

export function speak(text: string, rate = 0.9): void {
  if (!speechSupported()) return;
  want = { text, rate };
  schedule(); // rule 1: coalesce same-instant calls
}

/** Subscribe to voice-list changes (voices load asynchronously). Returns an unsubscribe function. */
export function onVoicesChanged(cb: () => void): () => void {
  if (!speechSupported()) return () => {};
  const synth = window.speechSynthesis; // keep the reference: unsubscribe must not depend on globals later
  if (typeof synth.addEventListener !== 'function') return () => {};
  synth.addEventListener('voiceschanged', cb);
  return () => synth.removeEventListener('voiceschanged', cb);
}
