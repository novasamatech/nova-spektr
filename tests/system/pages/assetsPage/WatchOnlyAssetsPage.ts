import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type ChainModel } from '../../data/chains/testChainModel';
import { TransferModalElements } from '../_elements/TransferModalElements';
import { TransferModalWindow } from '../modals/TransferModalWindow';

import { BaseAssetsPage } from './BaseAssetsPage';

export class WatchOnlyAssetsPage extends BaseAssetsPage {
  public async checkTransferButtonNotExists(): Promise<WatchOnlyAssetsPage> {
    await step('Verify transfer button is not visible (watch-only)', async () => {
      const sendButton = this.page.getByTestId(TEST_IDS.ASSETS.SEND_ARROW_ICON).first();
      await expect(sendButton, 'Transfer button should not be visible for watch-only wallet').not.toBeVisible();
    });

    return this;
  }

  public async checkReceiveButtonNotExists(): Promise<WatchOnlyAssetsPage> {
    await step('Verify receive button is not visible (watch-only)', async () => {
      const receiveButton = this.page.getByTestId(TEST_IDS.ASSETS.RECEIVE_ARROW_ICON).first();
      await expect(receiveButton, 'Receive button should not be visible for watch-only wallet').not.toBeVisible();
    });

    return this;
  }

  public override async openTransfer(chain: ChainModel, assetId: number): Promise<TransferModalWindow> {
    return await step(`Open transfer modal (watch-only) for ${chain.name}, asset ID: ${assetId}`, async () => {
      return new TransferModalWindow(this.page, new TransferModalElements(), this, chain, assetId).openTransferModal(
        false,
      );
    });
  }
}
