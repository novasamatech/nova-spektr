import { type Page, expect } from '@playwright/test';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type ChainModel } from '../../data/chains/testChainModel';
import { readConfig } from '../../utils/readConfig';
import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { ConfirmationModalElements } from '../_elements/ConfirmationModalElements';
import { TransferModalElements } from '../_elements/TransferModalElements';

import { ConfirmationModalWindow } from './ConfirmationModalWindow';

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

  public async openTransferModal(waitForModal = true): Promise<TransferModalWindow> {
    const config = await readConfig();
    const filteredChain = config.filter((config_chain: any) => config_chain.name === this.chain.name)[0];
    const chainId = filteredChain.chainId;
    const url = TransferModalElements.getUrl(chainId, this.assetId);    
    await this.page.getByTestId(TEST_IDS.ASSETS.TOKEN_PLATE).first().waitFor();
    await this.page.goto(url);
    
    if (waitForModal) {
      await this.page.getByTestId(TEST_IDS.OPERATIONS.AMOUNT_INPUT).first().waitFor();
    }

    return this;
  }

  public async checkFeeforAsset(): Promise<void> {
    await this.openTransferModal();

    await this.waitForContinueButtonToBeEnabled();
    await this.expectTransferFeeNotZero();
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

  public async fillAmount(amount: string): Promise<void> {
    await this.page.getByTestId(TransferModalElements.amountInputLocator).fill(amount);
  }

  public async fillRecipient(recipient: string): Promise<void> {
    await this.page.getByTestId(TransferModalElements.recipientInputLocator).fill(recipient);
  }

  public async chooseSignatory(): Promise<void> {
    await this.page.getByTestId(TransferModalElements.signatoryLocator).click();
    await this.page.getByTestId(TransferModalElements.signatoryOptionLocator).click();
  }

  public async openConfirmationModal(): Promise<ConfirmationModalWindow> {
    await this.waitForContinueButtonToBeEnabled();
    await this.page.getByRole('button', { name: 'Continue' }).click();

    return new ConfirmationModalWindow(this.page, new ConfirmationModalElements(), this.previousPage);
  }

  public async transferModalIsNotVisible(): Promise<TransferModalWindow> {
    await expect(this.page.getByTestId(TransferModalElements.amountInputLocator)).not.toBeVisible();

    return this;
  }
}
