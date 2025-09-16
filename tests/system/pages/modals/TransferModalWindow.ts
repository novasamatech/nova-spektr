import { type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

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
    return await step(`Open transfer modal for chain "${this.chain.name}" and asset ID ${this.assetId}`, async () => {
      const config = await readConfig();
      const filteredChain = config.filter((config_chain) => config_chain.name === this.chain.name)[0];
      const chainId = filteredChain.chainId;
      const url = TransferModalElements.getUrl(chainId, this.assetId);
      await this.page.getByTestId(TEST_IDS.ASSETS.TOKEN_PLATE).first().waitFor();
      await this.page.goto(url);

      if (waitForModal) {
        await this.page.getByTestId(TEST_IDS.TRANSFER.MODAL).waitFor({ state: 'visible' });
      }

      return this;
    });
  }

  public async checkFeeforAsset(): Promise<void> {
    await step('Check that transfer fee is greater than zero', async () => {
      await this.expectTransferFeeNotZero();
    });
  }

  private async expectTransferFeeNotZero(): Promise<void> {
    const feeRow = this.page.getByTestId(TransferModalElements.feeRowLocator);
    const assetBalance = feeRow.getByTestId(TransferModalElements.feeValueLocator);

    await expect(async () => {
      const feeText = await assetBalance.textContent();
      const numericMatch = feeText?.match(/(\d+\.?\d*)/);
      const feeValue = numericMatch ? parseFloat(numericMatch[0]) : 0;

      expect(feeValue).toBeGreaterThan(0);
    }).toPass({ timeout: 5000, intervals: [200, 300, 500] });
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

  public async waitForAlertToDisapeear(): Promise<void> {
    const alert = this.page.getByTestId('alert');

    await step('Wait for alert to disappear', async () => {
      await expect(alert).toHaveCount(0, { timeout: 5000 });
    });
  }

  public async fillAmount(amount: string): Promise<void> {
    await step(`Fill transfer amount: ${amount}`, async () => {
      await this.page.getByTestId(TransferModalElements.amountInputLocator).fill(amount);
      await this.page.getByTestId(TransferModalElements.amountInputLocator).blur();
    });
  }

  public async fillRecipient(recipient: string): Promise<void> {
    await step(`Fill recipient address: ${recipient}`, async () => {
      await this.page.getByTestId(TransferModalElements.recipientInputLocator).fill(recipient);
    });
  }

  public async chooseXcmChain(chainName: string): Promise<void> {
    await step(`Select destination XCM chain: ${chainName}`, async () => {
      await this.page.getByTestId(TransferModalElements.xcmSelectorLocator).click();
      await this.page.getByTestId(TransferModalElements.networkOption).filter({ hasText: chainName }).first().click();
    });
  }

  public async chooseSignatory(): Promise<void> {
    await step('Choose signatory for transfer', async () => {
      await this.page.getByTestId(TransferModalElements.signatoryLocator).click();
      await this.page.getByTestId(TransferModalElements.signatoryOptionLocator).first().click();
    });
  }

  public async isBalanceValidationOnPage(): Promise<void> {
    await step('Check balance validation on transfer modal', async () => {
      const balanceError = this.page.getByTestId(TEST_IDS.VALIDATIONS.BALANCE);
      const amountError = this.page.getByTestId(TransferModalElements.sendingAmountError);

      await Promise.race([
        balanceError.waitFor({ state: 'visible', timeout: 5000 }),
        amountError.waitFor({ state: 'visible', timeout: 5000 }),
      ]).catch(async () => {
        throw new Error('Validation did not appear within 5s.');
      });

      await expect(balanceError).toBeVisible({ timeout: 2000 });
      await expect(amountError).toBeVisible({ timeout: 2000 });
    });
  }

  public async openConfirmationModal(): Promise<ConfirmationModalWindow> {
    await step('Open confirmation modal', async () => {
      await this.checkForAlerts();
      await this.waitForContinueButtonToBeEnabled();
      await this.page.getByRole('button', { name: 'Continue' }).click();
      await this.checkForAlerts();
    });

    return new ConfirmationModalWindow(this.page, new ConfirmationModalElements(), this.previousPage);
  }

  public async transferModalIsNotVisible(): Promise<TransferModalWindow> {
    await step('Verify that transfer modal is no longer visible', async () => {
      await expect(
        this.page.getByTestId(TransferModalElements.amountInputLocator),
        'Transfer modal should not be visible',
      ).not.toBeVisible();
    });

    return this;
  }

  public async close(): Promise<BasePage> {
    await step('Close transfer modal', async () => {
      const modal = this.page.getByTestId(TEST_IDS.TRANSFER.MODAL);
      await modal.getByTestId(TEST_IDS.CLOSE_BUTTON).click();
      await modal.waitFor({ state: 'hidden' });
    });

    return this.previousPage;
  }
}
