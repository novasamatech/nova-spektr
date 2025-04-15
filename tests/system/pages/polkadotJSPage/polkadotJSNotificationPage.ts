import { type Page } from '@playwright/test';

import { type BasePageElements } from '../_elements/BasePageElements';
import { BasePage } from '../BasePage';
import { PolkadotJSElements } from '../_elements/PolkadotJSElements';

export class PjsNotificationPage extends BasePage<PolkadotJSElements> {
  constructor(page: Page, elements: PolkadotJSElements) {
    super(page, elements);
  }
 
  async initialize(page: Page): Promise<this> {
    this.page = page;
    return this;
  }

  public async goto(): Promise<this> {
    await this.page.goto(this.pageElements.url);
    return this;
  }

  public async clickContinueButton(): Promise<this> {
    await this.click(this.pageElements.continueButton);
    return this;
  }

  public async clickSelectAllButton(): Promise<this> {
    await this.click(this.pageElements.selectAllButton);
    return this;
  }

  public async clickConnectButton(): Promise<void> {
    await this.click(this.pageElements.connectButton);
    await this.page.close();
  }
}