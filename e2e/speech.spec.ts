import { expect, test, type Page } from '@playwright/test';

/**
 * The user's bug, end to end, on the REAL speech engine (this machine's system voices, muted):
 * "sound works at first, then stops". Runs against the dev server (React StrictMode), where a listening
 * question's auto-play fires twice at once; the original code then jammed Chrome's speech engine.
 * Skips on machines without Chinese system voices. Override the server with SPEECH_DEV_BASE.
 */
const DEV = process.env.SPEECH_DEV_BASE ?? 'http://localhost:5174';

const MUTE_AND_COUNT = () => {
  const W = window as unknown as { __started: string[] };
  W.__started = [];
  const Orig = window.SpeechSynthesisUtterance;
  if (!Orig) return;
  window.SpeechSynthesisUtterance = class extends Orig {
    constructor(t?: string) {
      super(t);
      this.volume = 0; // never make noise during tests
      this.addEventListener('start', () => W.__started.push(t ?? ''));
    }
  } as typeof SpeechSynthesisUtterance;
};

const startedCount = (page: Page) => page.evaluate(() => (window as unknown as { __started: string[] }).__started.length);

test('after listening questions, every 🔊 button still speaks (real engine, dev mode)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough');
  test.setTimeout(90_000);
  await page.addInitScript(MUTE_AND_COUNT);
  await page.goto(DEV + '/');
  const hasZh = await page
    .waitForFunction(() => speechSynthesis.getVoices().some((v) => v.lang.startsWith('zh')), null, { timeout: 8000 })
    .then(() => true, () => false);
  test.skip(!hasZh, 'no Chinese system voices on this machine');

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();

  // A burst of 🔊 clicks while words are still playing (phase B on the real engine)
  const hear = page.getByRole('button', { name: /^Hear / });
  for (let i = 0; i < 8; i++) {
    await hear.nth(i % (await hear.count())).click();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);

  // Listening practice: auto-play on each question (twice at once under StrictMode)
  await page.getByRole('link', { name: /Practice/ }).first().click();
  await page.getByRole('button', { name: 'Listening' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1500);
    await page.locator('[data-choice]').first().click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  await page.waitForTimeout(1500);
  expect(await startedCount(page), 'listening questions spoke').toBeGreaterThanOrEqual(6);

  // Back to Today: each 🔊 click must start speaking
  await page.getByRole('link', { name: /Today/ }).first().click();
  const buttons = page.getByRole('button', { name: /^Hear / });
  await expect(buttons.first()).toBeVisible();
  const n = Math.min(5, await buttons.count());
  const before = await startedCount(page);
  for (let i = 0; i < n; i++) {
    await buttons.nth(i).click();
    await page.waitForTimeout(1300);
  }
  expect(await startedCount(page) - before, '🔊 clicks that actually spoke').toBe(n);
  // the engine must go idle again (a jammed engine stays 'speaking' forever)
  await expect.poll(() => page.evaluate(() => speechSynthesis.speaking), { timeout: 5000 }).toBe(false);
});
