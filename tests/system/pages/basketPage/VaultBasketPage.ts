import { Page } from 'playwright';

import { BasketPageElements } from '../_elements/BasketPageElements';
import { BaseBasketPage } from './BaseBasketPage';

export class VaultBasketPage extends BaseBasketPage {
  protected pageElements: BasketPageElements;

  constructor(page: Page, pageElements: BasketPageElements) {
    super(page, pageElements);
    this.pageElements = pageElements;
  }
}
