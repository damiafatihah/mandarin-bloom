import { describe, expect, it } from 'vitest';
import { greetingFor } from './greeting';

describe('greetingFor', () => {
  it.each([
    [5, '早上好'], [10, '早上好'], [11, '中午好'], [12, '中午好'], [13, '下午好'], [17, '下午好'],
    [18, '晚上好'], [23, '晚上好'], [0, '晚上好'], [4, '晚上好'],
  ])('%i:00 → %s', (hour, zh) => {
    expect(greetingFor(hour).zh).toBe(zh);
  });
  it('has an English line for each', () => {
    expect(greetingFor(9).en).toBe('Good morning');
    expect(greetingFor(12).en).toBe('Good afternoon');
    expect(greetingFor(15).en).toBe('Good afternoon');
    expect(greetingFor(21).en).toBe('Good evening');
  });
});
