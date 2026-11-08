import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - window.screen.width);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('onboarding → today → challenge → dictionary', async ({ page }, info) => {
  const shot = (name: string) => page.screenshot({ path: `e2e/screens/${info.project.name}-${name}.png`, fullPage: true });

  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await shot('welcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /HSK 6/ }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();

  await expect(page.getByRole('heading', { name: /Today’s words/ })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(10);
  await expectNoHorizontalOverflow(page);
  await shot('today');

  await page.getByRole('link', { name: /Daily challenge/ }).click();
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.locator('[data-choice]').first().click();
  await expect(page.getByText(/Correct|Answer:/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await shot('challenge');

  await page.getByRole('link', { name: /Dictionary/ }).first().click();
  await page.getByRole('searchbox').fill('犹豫');
  await expect(page.getByRole('link', { name: /犹豫/ }).first()).toBeVisible({ timeout: 20_000 });
  await expectNoHorizontalOverflow(page);
  await shot('dictionary');

  await page.getByRole('link', { name: /犹豫/ }).first().click();
  await expect(page.getByRole('heading', { name: '犹豫' })).toBeVisible();
  await shot('word');
});
