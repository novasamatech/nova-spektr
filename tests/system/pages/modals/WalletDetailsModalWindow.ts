import { type Page } from '@playwright/test';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { WalletDetailsModalElements } from '../_elements/WalletDetailsModalElements';

export class WalletDetailsModalWindow extends BaseModal<WalletDetailsModalElements> {
  public previousPage: BasePage | BaseModal<any>;

  constructor(page: Page, previousPage: BasePage | BaseModal<any>) {
    super(page, new WalletDetailsModalElements());
    this.previousPage = previousPage;
  }
}
