import { test, expect, TRIP_FORM, buildTripForm, tripFormTitle } from '../src/fixtures/tripForm';
import { ResponderPage } from '../src/pages/ResponderPage';
import { attachScreenshot } from '../src/utils/reportSteps';

test('creates a trip form with name and preference questions', async ({ editor, context }, testInfo) => {
  const title = tripFormTitle();

  await test.step('Build trip form', async () => {
    await buildTripForm(editor, title);
  });

  const responderUrl = await test.step('Publish form', async () => {
    const url = await editor.publish();
    await attachScreenshot(editor.page, testInfo, 'editor-after-publish');
    return url;
  });

  const responder = new ResponderPage(await context.newPage());

  await test.step('Open responder view', async () => {
    await responder.open(responderUrl);
    await attachScreenshot(responder.page, testInfo, 'responder-view');
  });

  await test.step('Verify form contents', async () => {
    await expect(responder.page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(responder.page.getByRole('textbox', { name: TRIP_FORM.nameQuestion })).toBeVisible();
    const preference = responder.page.getByRole('radiogroup', { name: TRIP_FORM.preferenceQuestion });
    for (const option of TRIP_FORM.preferenceOptions) {
      await expect(preference.getByRole('radio', { name: option })).toBeVisible();
    }
    await expect(responder.page.getByRole('heading', { name: /Required question/ })).toHaveCount(2);
  });
});
