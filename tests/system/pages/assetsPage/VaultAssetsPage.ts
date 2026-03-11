import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { type ChainModel } from '../../data/chains/testChainModel';
import { readConfig } from '../../utils/readConfig';
import { AssetsSettingsModalElements } from '../_elements/AssetsSettingsModalElements';
import { FellowshipPageElements } from '../_elements/FellowshipPageElements';
import { GovernancePageElements } from '../_elements/GovernancePageElements';
import { FellowshipPage } from '../fellowshipPage/FellowshipPage';
import { GovernancePage } from '../governancePage/GovernancePage';
import { AssetsSettingsModalWindow } from '../modals/AssetsSettingsModalWindow';

import { BaseAssetsPage } from './BaseAssetsPage';

export class VaultAssetsPage extends BaseAssetsPage {
  public async goToGovernancePage(): Promise<GovernancePage> {
    return await step('Navigate to Governance page', async () => {
      return new GovernancePage(this.page, new GovernancePageElements()).gotoMain();
    });
  }

  public async goToFellowshipPage(): Promise<FellowshipPage> {
    return await step('Navigate to Fellowship page', async () => {
      return new FellowshipPage(this.page, new FellowshipPageElements()).gotoMain();
    });
  }

  public async openSettingsWidget(): Promise<AssetsSettingsModalWindow> {
    return await step('Open settings widget', async () => {
      await this.page.getByTestId(TEST_IDS.ASSETS.SETTINGS_WIDGET).click();

      return new AssetsSettingsModalWindow(this.page, new AssetsSettingsModalElements(), this);
    });
  }

  public async checkTransferFee(chain: ChainModel): Promise<VaultAssetsPage> {
    return await step(`Check transfer fee for each asset on chain: ${chain.name}`, async () => {
      const config = await readConfig();
      const targetChain = config.find((config_chain) => config_chain.name === chain.name);

      if (targetChain) {
        for (const asset of targetChain.assets) {
          // TODO: need to wait before open another transfer modal
          await this.page.waitForTimeout(1000);
          const transferModal = await this.openTransfer(chain, asset.assetId);
          await transferModal.expectTransferFeeNotZero();
          await transferModal.close();
        }
      }

      return this;
    });
  }
}
