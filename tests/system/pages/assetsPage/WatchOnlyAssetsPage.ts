import { expect } from '@playwright/test';
import { TEST_IDS } from '@/shared/constants/testIds';
import { TransferModalWindow } from '../modals/TransferModalWindow';
import { ChainModel } from 'tests/system/data/chains/testChainModel';
import { TransferModalElements } from '../_elements/TransferModalElements';
import { BaseAssetsPage } from './BaseAssetsPage';

export class WatchOnlyAssetsPage extends BaseAssetsPage { 
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
  
  public override async openTransfer(chain: ChainModel, assetId: number): Promise<TransferModalWindow> {
      return new TransferModalWindow(this.page, new TransferModalElements(), this, chain, assetId).openTransferModalByUrl();
  }
  
}