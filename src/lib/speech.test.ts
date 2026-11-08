import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSynth, FakeUtterance, fakeVoice } from '../test/fakeSpeech';
import { __resetSpeech, chineseVoices, currentUtterance, setPreferredVoice, speak } from './speech';

const MAC_VOICES = [
  fakeVoice('Eddy (Chinese (China mainland))', 'zh-CN'),
  fakeVoice('Grandma (Chinese (China mainland))', 'zh-CN'),
  fakeVoice('Meijia', 'zh-TW'),
  fakeVoice('Samantha', 'en-US', true, true),
  fakeVoice('Sinji', 'zh-HK'),
  fakeVoice('Tingting', 'zh-CN'),
];

let s: FakeSynth;
const later = (ms: number) => vi.advanceTimersByTime(ms);
const heardText = () => s.heard.map((h) => h.split('@')[0]);

beforeEach(() => {
  vi.useFakeTimers();
  s = new FakeSynth();
  vi.stubGlobal('speechSynthesis', s);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  __resetSpeech();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** The app's ORIGINAL implementation, kept here to document the bug. */
function speakOriginal(text: string) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  window.speechSynthesis.speak(u);
}

describe('the bug: "sound works at first, then stops"', () => {
  it('ORIGINAL code jams the engine when called twice at once (React StrictMode auto-play), killing later clicks', () => {
    speakOriginal('听'); // listening question auto-play…
    speakOriginal('听'); // …runs twice in dev (StrictMode)
    later(1200);
    speakOriginal('书'); // later clicks on 🔊
    later(1200);
    speakOriginal('河');
    later(1200);
    expect(heardText()).not.toContain('书');
    expect(heardText()).not.toContain('河');
  });

  it('NEW code: the same sequence never jams and every click is heard', () => {
    speak('听');
    speak('听');
    later(1200);
    speak('书');
    later(1200);
    speak('河');
    later(1200);
    expect(heardText()).toEqual(['听', '书', '河']);
    expect(s.wedged).toBe(false);
  });
});

describe('speak', () => {
  it('real-engine phases A–D (as measured on this Mac): every phase is fully heard, never jams', () => {
    const words = ['犹豫', '经济', '环境', '书', '机会', '一帆风顺', '安静', '河'];
    const phase = (fn: () => void) => {
      const before = s.heard.length;
      fn();
      later(1500);
      return s.heard.length - before;
    };
    expect(phase(() => words.forEach((w) => { speak(w); later(1200); }))).toBe(8); // A normal clicks
    expect(phase(() => words.forEach((w) => { speak(w); later(300); }))).toBeGreaterThanOrEqual(8); // B while speaking
    expect(phase(() => words.forEach((w) => { speak(w); speak(w); later(1200); }))).toBe(8); // C doubles
    expect(phase(() => words.forEach((w) => { speak(w); later(1200); }))).toBe(8); // D afterwards
    expect(s.wedged).toBe(false);
  });

  it('coalesces a burst of same-instant calls into one utterance (the latest)', () => {
    for (let i = 0; i < 20; i++) speak(`词${i}`);
    later(1000);
    expect(s.spoken).toHaveLength(1);
    expect(heardText()).toEqual(['词19']);
  });

  it('a click while the previous word is still queued (not started) waits, then plays: no cancel-before-start', () => {
    speak('一');
    later(5); // previous queued, not started yet
    speak('二');
    later(1500);
    expect(s.wedged).toBe(false);
    expect(heardText().at(-1)).toBe('二');
  });

  it('a click while a word is playing interrupts it and plays the new one', () => {
    speak('一二三四五');
    later(100);
    speak('二');
    later(1500);
    expect(heardText()).toEqual(['一二三四五', '二']);
  });

  it('uses the browser default Chinese voice even after voices load (no explicit voice)', () => {
    s.setVoices(MAC_VOICES);
    speak('你好', 0.8);
    later(500);
    const u = s.spoken[0];
    expect(u.lang).toBe('zh-CN');
    expect(u.voice).toBeNull();
    expect(u.rate).toBe(0.8);
  });

  it('honours a preferred voice from settings; ignores one that no longer exists', () => {
    s.setVoices(MAC_VOICES);
    setPreferredVoice('Meijia');
    speak('好');
    later(500);
    expect(s.heard.at(-1)).toBe('好@Meijia');
    expect(s.spoken.at(-1)!.lang).toBe('zh-TW');
    setPreferredVoice('Gone');
    speak('好');
    later(500);
    expect(s.heard.at(-1)).toBe('好@default');
  });

  it('un-sticks a paused engine', () => {
    s.pause();
    speak('书');
    later(500);
    expect(s.resumes).toBeGreaterThan(0);
    expect(heardText()).toEqual(['书']);
  });

  it('if the engine is already jammed, clicks do not prolong the jam; the latest click plays once it recovers', () => {
    // something else jammed it
    s.speak(new FakeUtterance('x'));
    s.cancel();
    const cancelsAtJam = s.cancels;
    for (let i = 0; i < 4; i++) {
      speak(`点${i}`);
      later(700);
    }
    expect(s.cancels).toBe(cancelsAtJam); // never cancelled a not-yet-started utterance
    later(3000);
    expect(heardText().at(-1)).toBe('点3');
    expect(s.heard.length).toBeLessThanOrEqual(2);
  });

  it('keeps a strong reference to the utterance while it is in flight (Chrome GC bug)', () => {
    speak('长');
    later(50);
    expect(currentUtterance()).not.toBeNull();
    later(1000);
    expect(currentUtterance()).toBeNull();
  });

  it('is a no-op when speech is unsupported', () => {
    vi.unstubAllGlobals();
    expect(() => speak('书')).not.toThrow();
  });
});

describe('chineseVoices', () => {
  it('Mandarin only (no Cantonese zh-HK, no English); real voices first, novelty voices last', () => {
    s.setVoices(MAC_VOICES);
    expect(chineseVoices().map((v) => v.name)).toEqual([
      'Tingting',
      'Meijia',
      'Eddy (Chinese (China mainland))',
      'Grandma (Chinese (China mainland))',
    ]);
  });
});
