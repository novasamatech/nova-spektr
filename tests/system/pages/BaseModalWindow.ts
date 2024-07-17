import { type Page } from 'playwright';

import { type BaseModalElements } from './_elements/BaseModalElements';

export abstract class BaseModal<T extends BaseModalElements = BaseModalElements> {
  constructor(protected page: Page, protected pageElements: T) {}

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
