import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSynth, FakeUtterance } from './fakeSpeech';

/** The fake must reproduce the real Chrome/macOS engine measurements (e2e real-engine experiments X0–X8). */
let s: FakeSynth;
const say = (t: string) => s.speak(new FakeUtterance(t));
const later = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers();
  s = new FakeSynth();
});
afterEach(() => vi.useRealTimers());

describe('FakeSynth calibration against the real engine', () => {
  it('X0 say, wait, say → both heard', () => {
    say('一'); later(1500); say('二'); later(2500);
    expect(s.heard.map((h) => h.split('@')[0])).toEqual(['一', '二']);
  });
  it('X1 say + cancel in the same tick, later say → jammed, speaking stays true', () => {
    say('一'); s.cancel(); later(300); say('二'); later(2500);
    expect(s.heard).toEqual([]);
    expect(s.speaking).toBe(true);
  });
  it('X2 say, cancel 5ms later (next tick), later say → second heard', () => {
    say('一'); later(5); s.cancel(); later(300); say('二'); later(2500);
    expect(s.heard.map((h) => h.split('@')[0])).toEqual(['二']);
  });
  it('X3 cancel mid-word, then say → heard', () => {
    say('一二三四五'); later(300); s.cancel(); later(100); say('二'); later(2500);
    expect(s.heard.map((h) => h.split('@')[0])).toEqual(['一二三四五', '二']);
  });
  it('X4 two says in one tick, no cancel → both heard in order', () => {
    say('一'); say('二'); later(2500);
    expect(s.heard.map((h) => h.split('@')[0])).toEqual(['一', '二']);
  });
  it('X6 jammed: pause/resume/cancel do not help', () => {
    say('一'); s.cancel(); later(300); s.pause(); s.resume(); s.cancel(); later(300); say('二'); later(2500);
    expect(s.heard).toEqual([]);
  });
  it('X7 jammed, left alone 5s → recovers', () => {
    say('一'); s.cancel(); later(5000); say('二'); later(2500);
    expect(s.heard.map((h) => h.split('@')[0])).toEqual(['二']);
  });
});
