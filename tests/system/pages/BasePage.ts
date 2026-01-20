import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';

import { type BasePageElements } from './_elements/BasePageElements';

export abstract class BasePage<T extends BasePageElements = BasePageElements> {
  protected page: Page;
  public pageElements: T;

  constructor(page: Page, pageElements: T) {
    this.page = page;
    this.pageElements = pageElements;
  }

  async goto(url: string) {
    await step(`Navigate to URL: ${url}`, async () => {
      await this.page.goto(url);
    });

    return this;
  }

  public async gotoMain(): Promise<this> {
    await step(`Navigate to the page: ${this.pageElements.url}`, async () => {
      await this.page.goto(this.pageElements.url, { waitUntil: 'domcontentloaded' });
    });

    return this;
  }

  public getPage(): Page {
    return this.page;
  }

  async click(testId: string) {
    await step(`Click element with testId: ${testId}`, async () => {
      await this.page.getByTestId(testId).click();
    });

    return this;
  }

  async fill(selector: string, value: string) {
    await step(`Fill field "${selector}" with value: "${value}"`, async () => {
      await this.page.fill(selector, value);
    });

    return this;
  }
}
