import { test as base } from '@playwright/test';
import { FormEditorPage } from '../pages/FormEditorPage';

export const TRIP_FORM = {
  nameQuestion: 'Name',
  preferenceQuestion: 'Preference',
  preferenceOptions: ['Beach', 'Mountains', 'City'],
};

export function tripFormTitle(): string {
  return `Trip Planner ${Date.now()}`;
}

export async function buildTripForm(editor: FormEditorPage, title: string) {
  await editor.createBlankForm();
  await editor.setTitle(title);
  await editor.addShortAnswerQuestion(0, TRIP_FORM.nameQuestion);
  await editor.addMultipleChoiceQuestion(1, TRIP_FORM.preferenceQuestion, TRIP_FORM.preferenceOptions);
}

type TripFormFixtures = {
  editor: FormEditorPage;
  publishedTripForm: { title: string; responderUrl: string };
};

export const test = base.extend<TripFormFixtures>({
  // Every form a test opens in the editor is moved to the bin afterwards, pass or fail.
  editor: async ({ page }, use) => {
    const editor = new FormEditorPage(page);
    await use(editor);
    if (/\/forms\/d\/[^/]+\/edit/.test(page.url())) await editor.moveToBin();
  },
  publishedTripForm: async ({ editor }, use) => {
    const title = tripFormTitle();
    const responderUrl = await base.step('Set up: build and publish trip form', async () => {
      await buildTripForm(editor, title);
      return editor.publish();
    });
    await use({ title, responderUrl });
  },
});

export { expect } from '@playwright/test';
