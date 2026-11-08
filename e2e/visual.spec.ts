import { expect, test, type Page } from '@playwright/test';

/**
 * Visual pass: stable screenshots (animations settled) of every screen and state, for human/agent review.
 * Writes e2e/screens/visual-<project>-<name>.png. Also asserts no horizontal overflow on each screen.
 */
const settle = (page: Page) => page.waitForTimeout(800);

async function snap(page: Page, project: string, name: string) {
  await settle(page);
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - window.screen.width);
  expect(overflow, `${name} overflow`).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `e2e/screens/visual-${project}-${name}.png`, fullPage: false });
}

test('visual tour', async ({ page }, info) => {
  const p = info.project.name;
  await page.goto('/');
  await snap(page, p, '01-welcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await snap(page, p, '02-welcome-perday');
  await page.getByRole('button', { name: 'Next' }).click();
  await snap(page, p, '03-welcome-levels');
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
  await page.getByRole('article').first().getByRole('button', { name: 'Teach me' }).click();
  await snap(page, p, '04-today');

  await page.goto('/challenge');
  await snap(page, p, '05-challenge-intro');
  await page.getByRole('button', { name: 'Begin' }).click();
  await snap(page, p, '06-question');
  for (let i = 0; i < 10; i++) {
    await page.locator('[data-choice]').first().click();
    if (i === 0) await snap(page, p, '07-answered');
    await page.getByRole('button', { name: i === 9 ? 'See results' : 'Next question' }).click();
  }
  await snap(page, p, '08-result');

  await page.goto('/');
  await snap(page, p, '09-today-done');
  await page.goto('/practice');
  await snap(page, p, '10-practice');
  await page.goto('/dictionary');
  await snap(page, p, '11-dictionary-empty');
  await page.getByRole('searchbox').fill('hesitate');
  await expect(page.locator('ul li a').first()).toBeVisible();
  await snap(page, p, '12-dictionary-results');
  await page.goto('/word/' + encodeURIComponent('一帆风顺'));
  await expect(page.getByRole('heading', { name: '一帆风顺' })).toBeVisible();
  await snap(page, p, '13-word-idiom');
  await page.goto('/word/' + encodeURIComponent('了'));
  await expect(page.getByRole('heading', { name: '了' })).toBeVisible();
  await expect(page.getByText('Other readings')).toBeVisible({ timeout: 30_000 });
  await snap(page, p, '14-word-polyphone');
  await page.goto('/me');
  await snap(page, p, '15-me');
});
