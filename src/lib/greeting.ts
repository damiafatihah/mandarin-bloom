export type Greeting = { zh: string; en: string };

/** Time-of-day greeting: 早上好 5–10, 中午好 11–12, 下午好 13–17, 晚上好 otherwise. */
export function greetingFor(hour: number): Greeting {
  if (hour >= 5 && hour < 11) return { zh: '早上好', en: 'Good morning' };
  if (hour >= 11 && hour < 13) return { zh: '中午好', en: 'Good afternoon' };
  if (hour >= 13 && hour < 18) return { zh: '下午好', en: 'Good afternoon' };
  return { zh: '晚上好', en: 'Good evening' };
}
