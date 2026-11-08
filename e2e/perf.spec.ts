import { expect, test } from '@playwright/test';

/** Performance on a slow phone: 4× CPU throttle. Logs timings; fails on clearly bad numbers. */
test('slow phone: today loads fast, dictionary becomes searchable, typing stays responsive', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // onboard
  await page.goto('/');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();

  let t = Date.now();
  await page.goto('/');
  await expect(page.getByRole('article').first()).toBeVisible();
  const todayMs = Date.now() - t;

  t = Date.now();
  await page.goto('/dictionary');
  await expect(page.getByRole('searchbox')).toBeVisible();
  const dictShellMs = Date.now() - t;
  await expect(page.getByText(/Loading the full dictionary/)).toBeHidden({ timeout: 60_000 });
  const dictFullMs = Date.now() - t;

  // typing latency: time from fill to the first result row updating
  const box = page.getByRole('searchbox');
  const lat: number[] = [];
  for (const q of ['love', 'zhong', '学', 'economy', 'ai']) {
    t = Date.now();
    await box.fill(q);
    await page.waitForFunction((q) => new URL(location.href).searchParams.get('q') === q, q);
    lat.push(Date.now() - t);
  }
  const longTasks = await page.evaluate(() => performance.getEntriesByType('longtask').length);
  console.log(JSON.stringify({ todayMs, dictShellMs, dictFullMs, searchLatencyMs: lat, longTasks }));

  expect(todayMs).toBeLessThan(4000);
  expect(dictFullMs).toBeLessThan(15000);
  expect(Math.max(...lat)).toBeLessThan(1500);
});
