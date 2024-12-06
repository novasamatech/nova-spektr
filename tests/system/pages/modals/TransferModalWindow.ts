import { expect } from '@playwright/test';
import { type Page } from 'playwright';

import { type ChainModel } from '../../data/chains/testChainModel';
import { readConfig } from '../../utils/readConfig';
import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { TransferModalElements } from '../_elements/TransferModalElements';

export class TransferModalWindow extends BaseModal<TransferModalElements> {
  public previousPage: BasePage;
  public chain: ChainModel;
  public assetId: number;

  constructor(
    page: Page,
    pageElements: TransferModalElements,
    previousPage: BasePage,
    chain: ChainModel,
    assetId: number,
  ) {
    super(page, pageElements);
    this.previousPage = previousPage;
    this.chain = chain;
    this.assetId = assetId;
  }

  public async checkFeeforAsset(): Promise<void> {
    const config = await readConfig();
    const filteredChain = config.filter((config_chain: any) => config_chain.name === this.chain.name)[0];
    const chainId = filteredChain.chainId;
    const url = TransferModalElements.getUrl(chainId, this.assetId);
    await this.page.waitForTimeout(1000);
    await this.page.goto(url);

    await this.waitForContinueButtonToBeEnabled();
    await this.expectTransferFeeNotZero();
    await this.page.getByRole('banner').getByRole('button').click();
  }

  private async expectTransferFeeNotZero(): Promise<void> {
    const feeRow = this.page.getByTestId(TransferModalElements.feeRowLocator);
    const feeText = await feeRow.textContent();

    const numericMatch = feeText?.match(/(\d+\.?\d*)/);
    const feeValue = numericMatch ? parseFloat(numericMatch[0]) : 0;

    expect(feeValue).toBeGreaterThan(0);
  }

  private async waitForContinueButtonToBeEnabled(): Promise<void> {
    let isEnabled = false;
    while (!isEnabled) {
      isEnabled = await this.page.getByRole('button', { name: 'Continue' }).isEnabled();
      if (!isEnabled) {
        await this.page.waitForTimeout(500);
      }
    }
  }
}
