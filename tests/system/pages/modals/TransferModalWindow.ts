import { type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type ChainModel } from '../../data/chains/testChainModel';
import { watchContinueButtonDisabled } from '../../utils/buttonWatcher';
import { readConfig } from '../../utils/readConfig';
import { getValidationLocators } from '../../utils/validationHelpers';
import { type Validation } from '../../utils/validationTestCases';
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
      const chainId = filteredChain!.chainId;
      const url = TransferModalElements.getUrl(chainId, this.assetId);
      await this.page.getByTestId(TEST_IDS.ASSETS.TOKEN_PLATE).first().waitFor({ timeout: 15000 });
      await this.page.goto(url);

      if (waitForModal) {
        await this.page.getByTestId(TEST_IDS.TRANSFER.MODAL).waitFor({ state: 'visible', timeout: 15000 });
      }

      return this;
    });
  }

  public async expectTransferFeeNotZero(): Promise<void> {
    const feeRow = this.page.getByTestId(TransferModalElements.feeRowLocator);
    const fees = feeRow.getByTestId(TransferModalElements.tokenAmountLocator);
    const feeLoaders = feeRow.getByTestId(TEST_IDS.OPERATIONS.FEE_LOADER);

    await step('Wait until all fees are loaded', async () => {
      const loaders = await feeLoaders.all();
      for (const loader of loaders) {
        // TODO: investigate why it took so long to load the fees
        await expect(loader).toBeHidden({ timeout: 30_000 });
      }
    });

    await step('Expect transfer fee to be greater than 0', async () => {
      const allFees = await fees.all();
      for (const fee of allFees) {
        const feeText = await fee.textContent();

        const numericMatch = feeText?.match(/(\d+\.?\d*)/);
        const feeValue = numericMatch ? parseFloat(numericMatch[0]) : 0;

        expect(feeValue, `Fee should be > 0, got "${feeText}"`).toBeGreaterThan(0);
      }
    });
  }

  public async waitUntilAvailableAmountLoaded(): Promise<void> {
    const balanceRow = this.page.getByTestId(TransferModalElements.balanceRowLocator);
    const assetBalance = balanceRow.getByTestId(TransferModalElements.tokenAmountLocator);

    await step('Expect available balance to be visible', async () => {
      expect(assetBalance).toBeVisible();
    });
  }

  private async waitForContinueButtonToBeEnabled(): Promise<void> {
    await step('Wait for Continue button to be enabled and not loading', async () => {
      const button = this.page.getByRole('button', { name: 'Continue' });
      await expect(button).toBeVisible();
      // TODO: investigate why it took so long, dry run in XCM flow takes it
      await expect(button).toBeEnabled({ timeout: 30_000 });

      // Wait for loading spinner to disappear (fee calculation)
      const loader = button.getByTestId('Icon:loader');
      await expect(loader).toBeHidden({ timeout: 15000 });
    });
  }

  public async expectContinueButtonToBeDisabled(): Promise<void> {
    await step('Expect Continue button to be disabled', async () => {
      const button = this.page.getByRole('button', { name: 'Continue' });
      await expect(button).toBeDisabled();
    });
  }

  /**
   * Asserts that Continue button is disabled. Fails test gracefully if enabled.
   */
  public async isContinueButtonDisabled(): Promise<void> {
    await step('Check that Continue button is disabled', async () => {
      const button = this.page.getByRole('button', { name: 'Continue' });
      await expect(button, 'Continue button should be disabled').toBeDisabled();
    });
  }

  public async waitForAlertToDisappear(): Promise<void> {
    const alert = this.page.getByTestId('alert');

    await step('Wait for alert to disappear', async () => {
      await expect(alert).toHaveCount(0);
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

  public async clearRecipient(): Promise<void> {
    await step('Clear the committed recipient back to the address input', async () => {
      // Blurring the input commits the value and reveals the read-only card with its clear button.
      await this.page.getByTestId(TransferModalElements.recipientInputLocator).blur();
      await this.page.getByTestId(TransferModalElements.recipientClearLocator).click();
    });
  }

  public async clickMyselfButton(): Promise<void> {
    await step(`Click 'Myself' button to fill in address`, async () => {
      await this.page.getByTestId(TransferModalElements.myselfButton).click();
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
      // Once a recipient is committed, the recipient "clear" icon-button reuses the same
      // close icon as the modal header close button. Scope to the modal's own close button
      // by excluding the recipient-clear test id to avoid a strict-mode violation.
      await modal
        .locator(`button[aria-label="icon button: close"]:not([data-testid="${TEST_IDS.OPERATIONS.RECIPIENT_CLEAR}"])`)
        .click();
      await modal.waitFor({ state: 'hidden', timeout: 15000 });
    });

    return this.previousPage;
  }

  public async expectValidationsVisible(
    validations: Validation | Validation[],
    transferFeeNotZero = true,
  ): Promise<void> {
    const list = Array.isArray(validations) ? validations : [validations];

    await watchContinueButtonDisabled(this.page, async () => {
      if (transferFeeNotZero) {
        await this.expectTransferFeeNotZero();
      }
      await this.waitUntilAvailableAmountLoaded();

      await step(`Check validations visible: ${list.join(', ')}`, async () => {
        for (const v of list) {
          const locs = getValidationLocators(this.page, v);

          await Promise.race(locs.map((l) => l.waitFor({ state: 'visible', timeout: 15000 }))).catch(() => {
            throw new Error(`Validation "${v}" did not appear.`);
          });

          for (const l of locs) {
            await expect(l).toBeVisible();
          }
        }
      });
    });
  }

  public async expectValidationsHidden(validations: Validation | Validation[]): Promise<void> {
    const list = Array.isArray(validations) ? validations : [validations];

    await step(`Check validations hidden: ${list.join(', ')}`, async () => {
      for (const v of list) {
        const locs = getValidationLocators(this.page, v);
        for (const l of locs) {
          await expect(l).toHaveCount(0);
        }
      }
    });
  }
}
