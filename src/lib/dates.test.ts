import { describe, expect, it } from 'vitest';
import { addDays, dateKey, streak } from './dates';

describe('dates', () => {
  it('formats local date keys', () => {
    expect(dateKey(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
  });
  it('adds days across month/year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('counts streaks, not broken by an unfinished today', () => {
    expect(streak(['2026-11-06', '2026-11-07'], '2026-11-08')).toBe(2);
    expect(streak(['2026-11-06', '2026-11-07', '2026-11-08'], '2026-11-08')).toBe(3);
    expect(streak(['2026-11-05'], '2026-11-08')).toBe(0);
  });
});
