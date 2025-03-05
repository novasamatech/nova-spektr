import { type Page } from '@playwright/test';

import { type BasePageElements } from './_elements/BasePageElements';

export abstract class BasePage<T extends BasePageElements = BasePageElements> {
  protected page: Page;
  public pageElements: T;

  constructor(page: Page, pageElements: T) {
    this.page = page;
    this.pageElements = pageElements;
  }

  async goto(url: string) {
    await this.page.goto(url);

    return this;
  }

  public async gotoMain(): Promise<this> {
    await this.page.goto(this.pageElements.url);
    await this.page.waitForLoadState('load');
    await this.page.reload();
    await this.page.waitForLoadState('load');

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
