import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.1 AA audit (axe-core) of every screen and key state. */
async function audit(page: Page, label: string) {
  await page.waitForTimeout(700); // let entrance animations settle so contrast is measured on final colours
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = violations.map((v) => `${label}: [${v.impact}] ${v.id} — ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary).toEqual([]);
}

test('accessibility: all screens', async ({ page }, info) => {
  test.skip(info.project.name === 'tablet');
  await page.goto('/');
  await audit(page, 'welcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await audit(page, 'welcome-perday');
  await page.getByRole('button', { name: 'Next' }).click();
  await audit(page, 'welcome-levels');
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
  await audit(page, 'today');
  await page.getByRole('article').first().getByRole('button', { name: 'Teach me' }).click();
  await audit(page, 'today-revealed');

  await page.goto('/challenge');
  await audit(page, 'challenge-intro');
  await page.getByRole('button', { name: 'Begin' }).click();
  await audit(page, 'question');
  await page.locator('[data-choice]').first().click();
  await audit(page, 'answered');
  for (let i = 0; i < 10; i++) {
    if (i > 0) await page.locator('[data-choice]').first().click();
    await page.getByRole('button', { name: i === 9 ? 'See results' : 'Next question' }).click();
  }
  await audit(page, 'result');
  await page.goto('/');
  await audit(page, 'today-done');
  await page.goto('/practice');
  await audit(page, 'practice');
  await page.goto('/dictionary?q=hesitate');
  await expect(page.locator('ul li a').first()).toBeVisible();
  await audit(page, 'dictionary');
  await page.goto('/word/' + encodeURIComponent('经济'));
  await expect(page.getByRole('heading', { name: '经济' })).toBeVisible();
  await audit(page, 'word');
  await page.goto('/me');
  await audit(page, 'me');
});
