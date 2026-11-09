export function dateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

/** Consecutive completed days ending today (or yesterday if today isn't done yet). */
export function streak(completed: Iterable<string>, today: string): number {
  const set = new Set(completed);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Whole calendar days from date key `a` to `b` (negative if b is earlier). */
export function daysBetween(a: string, b: string): number {
  const t = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** "Review due" / "Review tomorrow" / "Review in N days" for a card's due date. */
export function reviewText(due: string, today: string): string {
  const n = daysBetween(today, due);
  return n <= 0 ? 'Review due' : n === 1 ? 'Review tomorrow' : `Review in ${n} days`;
}
