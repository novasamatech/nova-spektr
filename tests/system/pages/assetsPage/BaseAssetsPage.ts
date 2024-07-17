import { type Page } from 'playwright';

import { BasePage } from '../BasePage';
import { type AssetsPageElements } from '../_elements/AssetsPageElements';

export class BaseAssetsPage extends BasePage {
  protected pageElements: AssetsPageElements;

  constructor(page: Page, pageElements: AssetsPageElements) {
    super(page);
    this.pageElements = pageElements;
  }
}
