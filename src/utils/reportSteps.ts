import type { Page, TestInfo } from '@playwright/test';

// The 'on' screenshot/video config only captures final state. This attaches a named,
// timestamped screenshot for a specific moment in the flow, so the report shows the
// story of the test (built, published, submitted...) rather than just the end result.
export async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body, contentType: 'image/png' });
}
