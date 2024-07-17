import { type Page } from 'playwright';

import { type BasePageElements } from './_elements/BasePageElements';

export abstract class BasePage<T extends BasePageElements = BasePageElements> {
  constructor(
    protected page: Page,
    public pageElements: T,
  ) {}

  async goto(url: string) {
    await this.page.goto(url);

    return this;
  }

  public async gotoMain(): Promise<this> {
    await this.page.goto(this.pageElements.url);
    await this.page.waitForLoadState('networkidle');

    return this;
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

  async clickOnButtonBySelector(selector: string, force = false) {
    await this.page.locator(selector).getByRole('button').click({ force: force });

    return this;
  }
}
