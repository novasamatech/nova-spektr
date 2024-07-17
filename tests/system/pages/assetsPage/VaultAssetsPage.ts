import { type Page } from 'playwright';

import { type ChainModel } from '../../data/chains/testChainModel';
import { readConfig } from '../../utils/readConfig';
import { BasePage } from '../BasePage';
import { type AssetsPageElements } from '../_elements/AssetsPageElements';
import { AssetsSettingsModalElements } from '../_elements/AssetsSettingsModalElements';
import { SettingsPageElements } from '../_elements/SettingsPageElements';
import { TransferModalElements } from '../_elements/TransferModalElements';
import { WalletModalElements } from '../_elements/WalletModalElements';
import { AssetsSettingsModalWindow } from '../modals/AssetsSettingsModalWindow';
import { TransferModalWindow } from '../modals/TransferModalWindow';
import { WalletModalWindow } from '../modals/WalletModalWindow';
import { BaseSettingsPage } from '../settingsPage/BaseSettingsPage';

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

  public async openTransfer(chain: ChainModel, assetId: number): Promise<TransferModalWindow> {
    return new TransferModalWindow(this.page, new TransferModalElements(), this, chain, assetId);
  }

  public async checkTransferFee(chain: ChainModel): Promise<VaultAssetsPage> {
    const config = await readConfig();
    const targetChain = config.find((config_chain: any) => config_chain.name === chain.name);

    if (targetChain) {
      for (const asset of targetChain.assets) {
        await (await this.openTransfer(chain, asset.assetId)).checkFeeforAsset();
      }
    }

    return this;
  }
}
