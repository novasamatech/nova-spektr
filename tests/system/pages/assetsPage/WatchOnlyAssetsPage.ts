import { expect } from '@playwright/test';
import { TEST_IDS } from '@/shared/constants/testIds';
import { BasePage } from '../BasePage';
import { type AssetsPageElements } from '../_elements/AssetsPageElements';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { WalletModalWindow } from '../modals/WalletModalWindow';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';

export class WatchOnlyAssetsPage extends BasePage<AssetsPageElements> {
  public async goToSettingsPage(): Promise<BaseSettingsPage> {
    return new BaseSettingsPage(this.page, new SettingsPageElements()).gotoMain();
  }

  public async openWalletManagement(): Promise<WalletModalWindow> {
    await this.click(this.pageElements.accountButton);

    return new WalletModalWindow(this.page, new WalletModalElements(), this);
  }

  public async checkTransferButtonNotExists(): Promise<WatchOnlyAssetsPage> {
    const sendButton = this.page.getByTestId(TEST_IDS.ASSETS.SEND_ARROW_ICON).first();
    await expect(sendButton).toHaveCount(0);

    return this;
  }
}