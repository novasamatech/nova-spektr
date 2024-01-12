import { Page } from 'playwright';

import { LoginPageElements } from '../_elements/LoginPageElements';
import { BasePage } from '../BasePage';

export class PolkadotVaultLoginPage extends BasePage {
  public pageElements: LoginPageElements;

  constructor(page: Page, pageElements: LoginPageElements) {
    super(page);
    this.pageElements = pageElements;
  }
}
