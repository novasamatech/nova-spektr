import { Page } from 'playwright';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
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
}