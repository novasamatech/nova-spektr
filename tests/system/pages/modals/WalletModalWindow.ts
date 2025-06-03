import { type Page } from '@playwright/test';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { MultisigModalElements } from '../_elements/MultisigModalElements';
import { type WalletModalElements } from '../_elements/WalletModalElements';

import { MultisigModalWindow } from './MultisigModalWindow';

export class WalletModalWindow extends BaseModal<WalletModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: WalletModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async openWalletModalWindow(): Promise<WalletModalWindow> {
    await this.previousPage.click(this.previousPage.pageElements.url);

    return this;
  }

  public async openMultisigModalWindow(): Promise<MultisigModalWindow> {
    await this.page.getByRole('button', { name: 'Add' }).click();
    await this.page.getByRole('menuitem', { name: 'Multisig' }).click();

    return new MultisigModalWindow(this.page, new MultisigModalElements(), this.previousPage);
  }
}
