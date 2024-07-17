import { type Page } from 'playwright';

import { BasePage } from '../BasePage';
import { type LoginPageElements } from '../_elements/LoginPageElements';

export class PolkadotVaultLoginPage extends BasePage {
  public pageElements: LoginPageElements;

  constructor(page: Page, pageElements: LoginPageElements) {
    super(page);
    this.pageElements = pageElements;
  }
}
