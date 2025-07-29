import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';

import { type BaseModalElements } from './_elements/BaseModalElements';

export abstract class BaseModal<T extends BaseModalElements = BaseModalElements> {
  protected page: Page;
  public pageElements: T;

  constructor(page: Page, pageElements: T) {
    this.page = page;
    this.pageElements = pageElements;
  }

  async click(testId: string) {
    await step(`Click element with testId: ${testId}`, async () => {
      await this.page.getByTestId(testId).click();
    });

    return this;
  }

  async fill(testId: string, value: string) {
    await step(`Fill field [${testId}] with value: "${value}"`, async () => {
      await this.page.getByTestId(testId).fill(value);
    });

    return this;
  }

  async clickIntoField(testId: string) {
    await step(`Click into field with testId: ${testId}`, async () => {
      await this.page.getByTestId(testId).click();
    });

    return this;
  }

  /**
   * Checks for any alerts on the page and throws an error if one is found.
   *
   * @throws {Error} If an alert is visible on the page, with the alert text
   *   included in the error message
   */
  protected async checkForAlerts(): Promise<void> {
    const alert = this.page.getByTestId('alert');
    if (await alert.isVisible()) {
      const alertText = await alert.textContent();
      throw new Error(`Alert found on the page with text: ${alertText}`);
    }
  }
}
