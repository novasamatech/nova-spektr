import { expect } from '@playwright/test';
import { TEST_IDS } from '@/shared/constants/testIds';
import { BasePage } from '../BasePage';
import { type AssetsPageElements } from '../_elements/AssetsPageElements';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { WalletModalWindow } from '../modals/WalletModalWindow';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';
import { TransferModalWindow } from '../modals/TransferModalWindow';
import { ChainModel } from 'tests/system/data/chains/testChainModel';
import { TransferModalElements } from '../_elements/TransferModalElements';

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
    await expect(sendButton).not.toBeVisible();

    return this;
  }

  public async checkReceiveButtonNotExists(): Promise<WatchOnlyAssetsPage> {
    const receiveButton = this.page.getByTestId(TEST_IDS.ASSETS.RECEIVE_ARROW_ICON).first();
    await expect(receiveButton).not.toBeVisible();

    return this;
  }

  public async openTransferByUrl(chain: ChainModel, assetId: number): Promise<TransferModalWindow> {
    return new TransferModalWindow(this.page, new TransferModalElements(), this, chain, assetId).openTransferModalByUrl();
  }
}