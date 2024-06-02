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

  public async wentThroughAllNetworksTransfer(chain: {name: string}): Promise<VaultAssetsPage> {
    const config = await readConfig();
    const filteredChains = config.filter((config_chain: any) => config_chain.name === chain.name);

    for (const chain of filteredChains) {
      const chainId = chain.chainId;
      for (const asset of chain.assets) {
        const assetId = asset.assetId;
        const url = `#/assets/transfer?chainId=${chainId}&assetId=${assetId}`;
        await this.page.waitForTimeout(1000);
        await this.page.goto(url);

        let isEditable = false;
        while (!isEditable) {
          isEditable = await this.page.getByRole('button', { name: 'Continue' }).isEditable();
          if (!isEditable) {
            await this.page.waitForTimeout(100); // wait for 100ms before checking again
          }
        }

        await this.page.getByRole('banner').getByRole('button').click();
      }
    }

    return this;
  }
}
