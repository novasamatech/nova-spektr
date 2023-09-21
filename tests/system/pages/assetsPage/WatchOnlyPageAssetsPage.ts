import { Page } from 'playwright';
import { BasePage } from '../BasePage';
import { AssetsPageElements } from '../_elements/AssetsPageElements'


export class WatchOnlyAssetsPage extends BasePage {
  protected pageElements: AssetsPageElements;

  constructor(page: Page, pageElements: AssetsPageElements) {
    super(page);
    this.pageElements = pageElements;
  }
}
