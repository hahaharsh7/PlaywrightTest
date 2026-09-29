import { defineConfig } from '@playwright/test';
import path from 'path';

export const STORAGE_STATE = path.join(__dirname, 'playwright/.auth/google.json');

// Google refuses sign-in from Playwright's bundled Chromium and from browsers that
// advertise automation, so use real Chrome with the automation flags stripped.
export const GOOGLE_LAUNCH_OPTIONS = {
  channel: 'chrome',
  args: ['--disable-blink-features=AutomationControlled'],
  ignoreDefaultArgs: ['--enable-automation'],
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Building a form through the editor UI takes well over the 30s default. */
  timeout: 120_000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* 'list' for console output, 'html' for the report - both always run regardless of
   * any --reporter flag passed on the command line, which otherwise replaces this array
   * entirely and silently stops the HTML report from being written. */
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Every run keeps a trace, video and screenshot regardless of outcome, so the
     * HTML report always has visual evidence for passed, failed and skipped tests. */
    trace: 'on',
    video: 'on',
    screenshot: 'on',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'google-forms',
      dependencies: ['setup'],
      use: {
        storageState: STORAGE_STATE,
        channel: GOOGLE_LAUNCH_OPTIONS.channel,
        launchOptions: {
          args: GOOGLE_LAUNCH_OPTIONS.args,
          ignoreDefaultArgs: GOOGLE_LAUNCH_OPTIONS.ignoreDefaultArgs,
        },
      },
    },
  ],
});
