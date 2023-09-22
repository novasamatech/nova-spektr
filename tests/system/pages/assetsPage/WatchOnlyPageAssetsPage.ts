import { Page } from 'playwright';

import { BasePage } from '../BasePage';
import { AssetsPageElements } from '../_elements/AssetsPageElements';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';
import { SettingsPageElements } from '../_elements/SettingsPageElements';

export class WatchOnlyAssetsPage extends BasePage {
  protected pageElements: AssetsPageElements;

  constructor(page: Page, pageElements: AssetsPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async goToSettingsPage(): Promise<BaseSettingsPage> {
    return new BaseSettingsPage(this.page, new SettingsPageElements()).gotoMain();
  }
}
