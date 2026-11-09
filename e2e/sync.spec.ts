import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Requests to the stand-in cloud are answered here, so two browser "devices" can share one copy.
test.use({ serviceWorkers: 'block' });

async function cloudFor(...contexts: BrowserContext[]) {
  const cloud = new Map<string, string>();
  for (const c of contexts) {
    await c.route('**/__fake-sync/**', async (route) => {
      const key = route.request().url().split('/__fake-sync/')[1];
      if (route.request().method() === 'PUT') {
        cloud.set(key, route.request().postData() ?? '');
        return route.fulfill({ status: 204 });
      }
      const body = cloud.get(key);
      return body ? route.fulfill({ status: 200, contentType: 'application/json', body }) : route.fulfill({ status: 404 });
    });
  }
  return cloud;
}

async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
}
const goTab = (page: Page, name: RegExp) => page.getByRole('link', { name }).first().click();

test('two devices: sign in on both and progress follows you', async ({ browser }, info) => {
  test.skip(info.project.name === 'tablet');
  test.setTimeout(90_000);
  const laptopCtx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const cloud = await cloudFor(laptopCtx, phoneCtx);
  const laptop = await laptopCtx.newPage();
  const phone = await phoneCtx.newPage();

  // Laptop: learn 3 words, then sign in on Me
  await onboard(laptop);
  const lcards = laptop.getByRole('article');
  await expect(lcards).toHaveCount(5);
  const names = await lcards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  await lcards.nth(0).getByRole('button', { name: 'Teach me' }).click();
  await lcards.nth(1).getByRole('button', { name: 'Teach me' }).click();
  await lcards.nth(2).getByRole('button', { name: 'I know it' }).click();
  await goTab(laptop, /Me/);
  const lsync = laptop.getByRole('region', { name: /Sync/ });
  await lsync.getByLabel('Email').fill('me@example.com');
  await lsync.getByRole('button', { name: 'Email me a link' }).click();
  await expect(lsync.getByText('Signed in as me@example.com')).toBeVisible();
  await expect(lsync.getByRole('status')).toHaveText(/Synced/);
  expect(cloud.size).toBe(1);

  // Phone: brand new, signs in from the welcome screen and lands on Today with the same words
  await phone.goto('/');
  await phone.getByRole('button', { name: 'Sign in to bring your progress' }).click();
  // the stand-in cloud signs in as soon as the email is "sent", so this checks the link path…
  await phone.getByLabel('Email').fill('me@example.com');
  await phone.getByRole('button', { name: 'Email me a link' }).click();
  await expect(phone).toHaveURL(/\/$/);
  const pcards = phone.getByRole('article');
  await expect(phone.getByText(/words done today/)).toHaveText('3 of 5 words done today');
  expect(await pcards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(names);

  // Phone learns one more and changes words per day; the laptop picks both up when you come back to it
  await pcards.nth(3).getByRole('button', { name: 'Teach me' }).click();
  await goTab(phone, /Me/);
  await phone.getByRole('button', { name: 'More words' }).click(); // 5 → 6
  await expect(phone.getByRole('region', { name: /Sync/ }).getByRole('status')).toHaveText(/Synced/, { timeout: 10_000 });
  await expect.poll(() => JSON.parse(cloud.get('me%40example.com') ?? '{}').settings?.wordsPerDay, { timeout: 10_000 }).toBe(6);

  await laptop.reload();
  await goTab(laptop, /Today/);
  await expect(laptop.getByText(/words done today/)).toHaveText('4 of 6 words done today', { timeout: 10_000 });

  // Sign out keeps progress on the device
  await goTab(laptop, /Me/);
  await laptop.getByRole('button', { name: 'Sign out' }).click();
  await expect(laptop.getByRole('button', { name: 'Email me a link' })).toBeVisible();
  await goTab(laptop, /Today/);
  await expect(laptop.getByText(/words done today/)).toHaveText('4 of 6 words done today');

  await laptopCtx.close();
  await phoneCtx.close();
});

test('a device can sign in with the code from the email (when the link was opened somewhere else)', async ({ browser }, info) => {
  test.skip(info.project.name !== 'phone');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await cloudFor(ctx);
  const page = await ctx.newPage();
  // stop the stand-in from auto-signing in, so the code step is used
  await page.addInitScript(() => { (window as unknown as { __fakeSyncNoAutoLink: boolean }).__fakeSyncNoAutoLink = true; });
  await onboard(page);
  await goTab(page, /Me/);
  const s = page.getByRole('region', { name: /Sync/ });
  await s.getByLabel('Email').fill('me@example.com');
  await s.getByRole('button', { name: 'Email me a link' }).click();
  await expect(s.getByRole('status')).toContainText('type the code from the email here');
  await s.getByLabel('Code from the email').fill('111111');
  await s.getByRole('button', { name: 'Sign in' }).click();
  await expect(s.getByRole('alert')).toContainText('That code didn’t work');
  await s.getByLabel('Code from the email').fill('123456');
  await s.getByRole('button', { name: 'Sign in' }).click();
  await expect(s.getByText('Signed in as me@example.com')).toBeVisible();
  await expect(s.getByRole('status')).toHaveText(/Synced/);
  await ctx.close();
});
