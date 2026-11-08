/**
 * A stand-in for window.speechSynthesis that behaves like Chrome's real engine on macOS, as measured
 * (e2e real-engine experiments, Nov 2026):
 *  - speak() queues; utterances start ~10ms later, one at a time, and end after ~300ms.
 *  - Two speak() calls without cancel play one after the other.
 *  - cancel() after the current utterance has started interrupts it; a later speak() works.
 *  - WEDGE: cancel() in the same tick as a speak() whose utterance has not started yet jams the engine:
 *    `speaking` stays true and nothing starts until it has been left alone (no cancel) for WEDGE_MS.
 *    pause()/resume() do not help.
 *  - paused: nothing starts until resume().
 */
export const WEDGE_MS = 3000;

export class FakeUtterance {
  text: string;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  volume = 1;
  onstart: ((e: unknown) => void) | null = null;
  onend: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

export const fakeVoice = (name: string, lang: string, localService = true, isDefault = false) =>
  ({ name, lang, localService, default: isDefault, voiceURI: name }) as SpeechSynthesisVoice;

export class FakeSynth {
  speaking = false;
  pending = false;
  paused = false;
  voices: SpeechSynthesisVoice[] = [];
  spoken: FakeUtterance[] = []; // every utterance passed to speak()
  heard: string[] = []; // utterances that actually started: "text@voiceName|default"
  cancels = 0;
  resumes = 0;
  wedgedUntil = 0; // fake-clock ms; > now means jammed
  private queue: FakeUtterance[] = [];
  private currentU: FakeUtterance | null = null;
  private currentStarted = false;
  private queuedThisTick = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners: (() => void)[] = [];

  getVoices() {
    return this.voices;
  }
  addEventListener(_type: 'voiceschanged', cb: () => void) {
    this.listeners.push(cb);
  }
  removeEventListener(_type: 'voiceschanged', cb: () => void) {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }
  setVoices(v: SpeechSynthesisVoice[]) {
    this.voices = v;
    this.listeners.forEach((l) => l());
  }
  get wedged() {
    return Date.now() < this.wedgedUntil;
  }

  speak(u: FakeUtterance) {
    this.spoken.push(u);
    this.queue.push(u);
    this.speaking = true;
    this.pending = this.queue.length > 1 || !!this.currentU;
    this.queuedThisTick = true;
    setTimeout(() => (this.queuedThisTick = false), 0);
    this.pump();
  }

  private pump() {
    if (this.currentU || this.paused || !this.queue.length) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.startNext(), 10);
  }

  private startNext() {
    if (this.currentU || this.paused || !this.queue.length) return;
    if (this.wedged) {
      // jammed: keep "speaking", retry once the wedge expires
      this.timer = setTimeout(() => this.startNext(), this.wedgedUntil - Date.now() + 1);
      return;
    }
    const u = this.queue.shift()!;
    this.currentU = u;
    this.currentStarted = true;
    this.pending = this.queue.length > 0;
    this.heard.push(`${u.text}@${u.voice?.name ?? 'default'}`);
    u.onstart?.({});
    this.timer = setTimeout(() => {
      if (this.currentU !== u) return;
      this.currentU = null;
      this.currentStarted = false;
      u.onend?.({});
      this.speaking = this.queue.length > 0;
      this.pump();
    }, 300);
  }

  cancel() {
    this.cancels++;
    const notStartedYet = this.queuedThisTick && (!this.currentU || !this.currentStarted);
    if (notStartedYet || this.wedged) {
      // the measured Chrome bug: jam (or extend the jam)
      this.wedgedUntil = Date.now() + WEDGE_MS;
    }
    clearTimeout(this.timer);
    const cur = this.currentU;
    const dropped = this.queue.splice(0);
    this.currentU = null;
    this.currentStarted = false;
    cur?.onerror?.({ error: 'interrupted' });
    dropped.forEach((u) => u.onerror?.({ error: 'canceled' }));
    this.pending = false;
    this.speaking = this.wedged; // a jammed engine keeps reporting speaking=true
  }

  resume() {
    this.resumes++;
    this.paused = false;
    this.pump();
  }
  pause() {
    this.paused = true;
  }
}
