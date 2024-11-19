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

  async click(testId: string) {
    await this.page.getByTestId(testId).click();

    return this;
  }

  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);

    return this;
  }
}
