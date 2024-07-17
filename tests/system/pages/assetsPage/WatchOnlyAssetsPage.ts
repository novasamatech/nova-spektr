import { type Page } from 'playwright';

import { BasePage } from '../BasePage';
import { type AssetsPageElements } from '../_elements/AssetsPageElements';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { WalletModalWindow } from '../modals/WalletModalWindow';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';

export class WatchOnlyAssetsPage extends BasePage {
  public pageElements: AssetsPageElements;

  constructor(page: Page, pageElements: AssetsPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async goToSettingsPage(): Promise<BaseSettingsPage> {
    return new BaseSettingsPage(this.page, new SettingsPageElements()).gotoMain();
  }

  public async openWalletManagement(): Promise<WalletModalWindow> {
    await this.clickOnButton(this.pageElements.accountButton);

    return new WalletModalWindow(this.page, new WalletModalElements(), this);
  }
}
