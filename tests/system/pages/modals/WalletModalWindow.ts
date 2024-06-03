import { Page } from 'playwright';

import { WalletModalElements } from '../_elements/WalletModalElements';
import { BaseModal } from '../BaseModalWindow';
import { BasePage } from '../BasePage';

export class WalletModalWindow extends BaseModal {
  public pageElements: WalletModalElements;
  public previousPage: BasePage;

  constructor(page: Page, pageElements: WalletModalElements, previousPage: BasePage) {
    super(page);
    this.pageElements = pageElements;
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
