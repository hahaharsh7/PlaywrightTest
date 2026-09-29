import { test, expect, TRIP_FORM } from '../src/fixtures/tripForm';
import { ResponderPage } from '../src/pages/ResponderPage';
import { attachScreenshot } from '../src/utils/reportSteps';

test('submits the trip form and the response is recorded', async ({ publishedTripForm, editor, context }, testInfo) => {
  const answers = { name: 'Ada Lovelace', preference: 'Mountains' };
  const responder = new ResponderPage(await context.newPage());

  await test.step('Fill out responder form', async () => {
    await responder.open(publishedTripForm.responderUrl);
    await responder.answerText(TRIP_FORM.nameQuestion, answers.name);
    await responder.chooseOption(TRIP_FORM.preferenceQuestion, answers.preference);
    await attachScreenshot(responder.page, testInfo, 'responder-filled');
  });

  await test.step('Submit response', async () => {
    await responder.submit();
    await expect(responder.page.getByText('Your response has been recorded.')).toBeVisible();
    await expect(responder.page.getByRole('heading', { level: 1 })).toHaveText(publishedTripForm.title);
    await attachScreenshot(responder.page, testInfo, 'responder-confirmation');
  });

  await test.step('Verify response recorded in editor', async () => {
    await editor.openResponses();
    await expect(editor.page.getByRole('tab', { name: 'Responses 1' })).toBeVisible();
    await expect(editor.page.getByRole('heading', { name: `${TRIP_FORM.nameQuestion} 1 response` })).toBeVisible();
    await expect(editor.page.getByText(answers.name, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(editor.page.getByRole('row', { name: `${answers.preference} 1` })).toBeVisible();
    await attachScreenshot(editor.page, testInfo, 'editor-responses-tab');
  });
});
