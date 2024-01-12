import { Page } from 'playwright';

import { WalletModalElements } from '../_elements/WalletModalElements';
import { BaseModal } from '../BaseModalWindow';
import { BasePage } from '../BasePage';
import { MatrixModalElements } from '../_elements/MatrixModalElements';
import { MatrixModalWindow } from './MatrixModalWindow';

export class WalletModalWindow extends BaseModal {
  public pageElements: WalletModalElements;
  public previousPage: BasePage;

  constructor(page: Page, pageElements: WalletModalElements, previousPage: BasePage) {
    super(page);
    this.pageElements = pageElements;
  }

  public async openWalletModelWindow(): Promise<WalletModalWindow> {
    await this.previousPage.clickOnButton((this.previousPage as any).pageElements.accountButton);

    return this;
  }

  public async clickOnAddButton(): Promise<WalletModalWindow> {
    await this.clickOnButton(this.pageElements.addButton);

    return this;
  }

  public async clickOnMultisigButtonWithoutAuth(): Promise<MatrixModalWindow> {
    await this.clickOnButton(this.pageElements.multisigButton);

    return new MatrixModalWindow(this.page, new MatrixModalElements(), this.previousPage);
  }
}
