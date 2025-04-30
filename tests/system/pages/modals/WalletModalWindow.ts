import { type Page } from '@playwright/test';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { type WalletModalElements } from '../_elements/WalletModalElements';

export class WalletModalWindow extends BaseModal<WalletModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: WalletModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async openWalletModelWindow(): Promise<WalletModalWindow> {
    await this.previousPage.click(this.previousPage.pageElements.url);

    return this;
  }

  public async clickOnAddButton(): Promise<WalletModalWindow> {
    await this.click(this.pageElements.addButton);

    return this;
  }

  public async clickOnMultisigButton(): Promise<WalletModalWindow> {
    await this.click(this.pageElements.multisigButton);

    return this;
  }
}
