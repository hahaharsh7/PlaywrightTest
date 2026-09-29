import { expect, type Page } from '@playwright/test';

export class ResponderPage {
  constructor(readonly page: Page) {}

  async open(responderUrl: string) {
    await this.page.goto(responderUrl);
    await expect(this.page.getByRole('button', { name: 'Submit' })).toBeVisible();
  }

  async answerText(question: string, value: string) {
    const input = this.page.getByRole('textbox', { name: question });
    await expect(input).toBeEnabled();
    await input.fill(value);
  }

  async chooseOption(question: string, option: string) {
    const radio = this.page.getByRole('radiogroup', { name: question }).getByRole('radio', { name: option });
    await radio.click();
    await expect(radio).toBeChecked();
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Submit' }).click();
    await this.page.waitForURL(/\/formResponse/);
  }
}
