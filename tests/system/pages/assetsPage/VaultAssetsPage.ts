import { Page } from 'playwright';

import { BasePage } from '../BasePage';
import { AssetsPageElements } from '../_elements/AssetsPageElements';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { WalletModalWindow } from '../modals/WalletModalWindow';
import { AssetsSettingsModalWindow } from '../modals/AssetsSettingsModalWindow';
import { AssetsSettingsModalElements } from '../_elements/AssetsSettingsModalElements';
import { readConfig } from '../../utils/readConfig';
import { expect } from '@playwright/test';

export class VaultAssetsPage extends BasePage {
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

  public async openSettingsWidget(): Promise<AssetsSettingsModalWindow> {
    await this.clickOnButtonBySelector(this.pageElements.settingsModalWindowButtonSelector, true);

    return new AssetsSettingsModalWindow(this.page, new AssetsSettingsModalElements(), this);
  }

  public async checkTransferFee(chain: { name: string }): Promise<VaultAssetsPage> {
    const config = await readConfig();
    const filteredChains = config.filter((config_chain: any) => config_chain.name === chain.name);

    for (const chain of filteredChains) {
      await this.processChainAssets(chain);
    }

    return this;
  }

  private async processChainAssets(chain: any): Promise<void> {
    const chainId = chain.chainId;
    for (const asset of chain.assets) {
      await this.processAsset(chainId, asset);
    }
  }

  private async processAsset(chainId: string, asset: any): Promise<void> {
    const assetId = asset.assetId;
    const url = `#/assets/transfer?chainId=${chainId}&assetId=${assetId}`;
    await this.page.waitForTimeout(1000);
    await this.page.goto(url);

    await this.waitForContinueButtonToBeEditable();
    await this.expectTransferFeeNotZero();
    await this.page.getByRole('banner').getByRole('button').click();
  }

  private async expectTransferFeeNotZero(): Promise<void> {
    const feeRow = this.page.locator('div.flex.justify-between.items-center.w-full');
    const feeLocator = feeRow.locator('dd > div > span.text-body.text-text-primary');
    const feeText = await feeLocator.textContent();
    const feePattern = /^\d+\.\d+\s+\w+$/;
    expect(feeText).toMatch(feePattern);
  }

  private async waitForContinueButtonToBeEditable(): Promise<void> {
    let isEditable = false;
    while (!isEditable) {
      isEditable = await this.page.getByRole('button', { name: 'Continue' }).isEditable();
      if (!isEditable) {
        await this.page.waitForTimeout(500);
      }
    }
  }
}
