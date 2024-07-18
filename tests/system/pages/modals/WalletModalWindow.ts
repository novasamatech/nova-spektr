import { type Page } from 'playwright';

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
    await this.previousPage.clickOnButton((this.previousPage as any).pageElements.accountButton);

    return this;
  }

  public async clickOnAddButton(): Promise<WalletModalWindow> {
    await this.clickOnButton(this.pageElements.addButton);

    return this;
  }
}
