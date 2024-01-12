import { Page } from 'playwright';

import { BaseModalElements } from './_elements/BaseModalElements';

export abstract class BaseModal {
  protected page: Page;
  protected pageElements: BaseModalElements;

  constructor(page: Page) {
    this.page = page;
  }

  async click(selector: string) {
    await this.page.click(selector);

    return this;
  }

  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);

    return this;
  }

  async clickIntoField(placeholder: string) {
    await this.page.getByPlaceholder(placeholder).click();

    return this;
  }

  async fillFieldByValue(placeholder: string, value: string) {
    await this.page.getByPlaceholder(placeholder).fill(value);

    return this;
  }

  async clickOnButton(name: string) {
    await this.page.getByRole('button', { name: name }).click();

    return this;
  }
}
