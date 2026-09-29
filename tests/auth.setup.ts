import { test as setup, chromium, type Browser, type LaunchOptions } from '@playwright/test';
import fs from 'fs';
import { STORAGE_STATE, GOOGLE_LAUNCH_OPTIONS } from '../playwright.config';

const FORMS_HOME = 'https://docs.google.com/forms/u/0/';
const LOGIN_URL = `https://accounts.google.com/ServiceLogin?continue=${encodeURIComponent(FORMS_HOME)}`;
const MANUAL_LOGIN_TIMEOUT = 5 * 60_000;

// A logged-out visit to Forms redirects to accounts.google.com. When the session is
// still good, re-save it so cookies Google rotated during the visit are kept fresh.
async function refreshIfValid(browser: Browser): Promise<boolean> {
  if (!fs.existsSync(STORAGE_STATE)) return false;
  const context = await browser.newContext({ storageState: STORAGE_STATE });
  const page = await context.newPage();
  await page.goto(FORMS_HOME);
  const valid = page.url().startsWith('https://docs.google.com/forms');
  if (valid) await context.storageState({ path: STORAGE_STATE });
  await context.close();
  return valid;
}

setup('google session', async () => {
  setup.setTimeout(MANUAL_LOGIN_TIMEOUT + 60_000);

  const launch = (headless: boolean) =>
    chromium.launch({ ...(GOOGLE_LAUNCH_OPTIONS as LaunchOptions), headless });

  const checker = await launch(true);
  const valid = await refreshIfValid(checker);
  await checker.close();
  if (valid) return;

  if (process.env.CI) {
    throw new Error('Saved Google session is missing or expired. Run `npm run auth` locally to log in again.');
  }

  console.log(`\nLog in to the dummy Google account in the opened Chrome window (${MANUAL_LOGIN_TIMEOUT / 60_000} min timeout).\n`);
  const browser = await launch(false);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(LOGIN_URL);
  await page.waitForURL(/^https:\/\/docs\.google\.com\/forms/, { timeout: MANUAL_LOGIN_TIMEOUT });
  await context.storageState({ path: STORAGE_STATE });
  await browser.close();
});
