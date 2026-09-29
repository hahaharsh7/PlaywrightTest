import { expect, type Locator, type Page } from '@playwright/test';

// Google Forms' editor widgets are custom elements that can swallow input while the
// page is still wiring them up, so every edit retries until the page reflects it.
const EDIT_TIMEOUT = 20_000;

export class FormEditorPage {
  // Every card carries data-item-id; the form header card uses -1. Inactive cards keep
  // their inputs in the DOM, so all question edits must be scoped to one card.
  readonly questionCards: Locator;

  constructor(readonly page: Page) {
    this.questionCards = page.locator('[data-item-id]:not([data-item-id="-1"])');
  }

  async createBlankForm(): Promise<string> {
    await this.page.goto('https://docs.google.com/forms/create');
    await this.page.waitForURL(/\/forms\/d\/[^/]+\/edit/);
    return this.page.url();
  }

  async setTitle(title: string) {
    await this.typeRichText(this.page.getByRole('textbox', { name: 'Form title' }), title);
  }

  // A new form starts with one blank multiple-choice question; later questions need "Add question".
  async addShortAnswerQuestion(index: number, title: string) {
    const card = await this.startQuestion(index, title);
    await this.setQuestionType(card, 'Short answer');
    await this.markRequired(card);
  }

  // Enter adds the next option, but focus moves to it asynchronously, so each option is
  // clicked and typed explicitly rather than relying on where the keyboard focus lands.
  async addMultipleChoiceQuestion(index: number, title: string, options: string[]) {
    const card = await this.startQuestion(index, title);
    const optionInputs = card.getByRole('textbox', { name: 'option value' });
    for (const [i, option] of options.entries()) {
      if (i > 0) {
        await optionInputs.nth(i - 1).press('Enter');
        await expect(optionInputs).toHaveCount(i + 1);
      }
      await this.typeInput(optionInputs.nth(i), option);
    }
    await this.markRequired(card);
    for (const [i, option] of options.entries()) {
      await expect(optionInputs.nth(i)).toHaveValue(option);
    }
  }

  // The Publish button is disabled (labelled "Saving") while an edit is being saved.
  async publish(): Promise<string> {
    const link = this.page.getByRole('textbox', { name: /Link for sharing/ });
    await expect(async () => {
      const publishButton = this.page.getByRole('button', { name: 'Publish', exact: true });
      await expect(publishButton).toBeEnabled({ timeout: 5_000 });
      await publishButton.click();
      await this.page.getByRole('dialog', { name: 'Publish form' }).getByRole('button', { name: 'Publish' }).click({ timeout: 3_000 });
      await expect(link).toHaveValue(/\/viewform/, { timeout: 5_000 });
    }).toPass({ timeout: EDIT_TIMEOUT });
    const responderUrl = await link.inputValue();
    await this.page.keyboard.press('Escape');
    return responderUrl;
  }

  async openResponses() {
    await this.page.reload();
    await this.page.getByRole('tab', { name: /^Responses/ }).click();
  }

  // A click on the menu item while the menu is still animating open is silently dropped.
  // Google's wording for this varies by account locale ("bin" vs "trash"), so match either.
  async moveToBin() {
    const binned = this.page.getByRole('alertdialog', { name: /File moved to (bin|trash)/i });
    await expect(async () => {
      if (await binned.isVisible()) return;
      await this.page.keyboard.press('Escape');
      await this.page.getByRole('button', { name: 'More', exact: true }).click();
      const item = this.page.getByRole('menuitem', { name: /Move to (bin|trash)/i });
      await expect(item).toBeVisible();
      // The menu fades in; a click during the fade is silently dropped.
      await this.page.waitForTimeout(500);
      await item.click();
      await expect(binned).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: EDIT_TIMEOUT });
  }

  private async startQuestion(index: number, title: string): Promise<Locator> {
    if (index > 0) {
      await this.page.getByRole('button', { name: 'Add question' }).click();
      await expect(this.questionCards).toHaveCount(index + 1);
    }
    const card = this.questionCards.nth(index);
    await this.typeRichText(card.getByRole('textbox', { name: 'Question', exact: true }), title);
    return card;
  }

  private async setQuestionType(card: Locator, name: string) {
    const listbox = card.getByRole('listbox', { name: 'Question types' });
    await expect(async () => {
      await listbox.click();
      await this.page.getByRole('option', { name }).filter({ visible: true }).click({ timeout: 2_000 });
      await expect(listbox.getByRole('option', { name, selected: true })).toHaveCount(1, { timeout: 1_500 });
    }).toPass({ timeout: EDIT_TIMEOUT });
  }

  private async markRequired(card: Locator) {
    const checkbox = card.getByRole('checkbox', { name: 'Required' });
    await expect(async () => {
      if (!(await checkbox.isChecked())) await checkbox.click();
      await expect(checkbox).toBeChecked({ timeout: 1_500 });
    }).toPass({ timeout: EDIT_TIMEOUT });
  }

  private async typeRichText(box: Locator, text: string) {
    await expect(async () => {
      await box.click();
      await box.press('ControlOrMeta+a');
      await box.pressSequentially(text);
      await expect(box).toHaveText(text, { timeout: 1_500 });
    }).toPass({ timeout: EDIT_TIMEOUT });
  }

  private async typeInput(input: Locator, text: string) {
    await expect(async () => {
      await input.click();
      await input.press('ControlOrMeta+a');
      await input.pressSequentially(text);
      await expect(input).toHaveValue(text, { timeout: 1_500 });
    }).toPass({ timeout: EDIT_TIMEOUT });
  }
}
