import { type Page } from '@playwright/test';

import { type BaseModalElements } from './_elements/BaseModalElements';

export abstract class BaseModal<T extends BaseModalElements = BaseModalElements> {
  protected page: Page;
  public pageElements: T;

  constructor(page: Page, pageElements: T) {
    this.page = page;
    this.pageElements = pageElements;
  }

  async click(testId: string) {
    await this.page.getByTestId(testId).click();

    return this;
  }

  async fill(testId: string, value: string) {
    await this.page.getByTestId(testId).fill(value);

    return this;
  }

  async clickIntoField(testId: string) {
    await this.page.getByTestId(testId).click();

    return this;
  }
}
