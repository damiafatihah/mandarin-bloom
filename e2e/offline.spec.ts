import { expect, test } from '@playwright/test';

/** PWA: after one online visit, the app shell and word data work with no network. */
test('works offline after the first visit', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('article').first()).toBeVisible(); // hsk.json fetched → runtime-cached
  await page.goto('/dictionary?q=hello');
  await expect(page.getByText(/Loading the full dictionary/)).toBeHidden({ timeout: 30_000 }); // cedict cached

  await context.setOffline(true);
  await page.goto('/');
  await expect(page.getByRole('article').first()).toBeVisible();
  await page.goto('/dictionary?q=' + encodeURIComponent('犹豫'));
  await expect(page.locator('ul li a').first()).toContainText('犹豫');
  await page.goto('/word/' + encodeURIComponent('经济'));
  await expect(page.getByRole('heading', { name: '经济' })).toBeVisible();
  await context.setOffline(false);
});
