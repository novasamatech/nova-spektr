import { type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants/testIds';
import { Validation } from '../../utils/validationTestCases';
import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { DelegateModalElements } from '../_elements/DelegateModalElements';
import { ValidationElements } from '../_elements/ValidationElements';

export class DelegateAuthorityModalWindow extends BaseModal<DelegateModalElements> {
  public previousPage: BasePage | BaseModal<any>;

  constructor(page: Page, previousPage: BasePage | BaseModal<any>) {
    super(page, new DelegateModalElements());
    this.previousPage = previousPage;
  }

  public async fillProxyAddress(proxyName: string): Promise<DelegateAuthorityModalWindow> {
    return await step('Fill in the proxy address to be delegated', async () => {
      await this.page.getByTestId(DelegateModalElements.proxyAddressInput).fill(proxyName);
      await this.page.getByRole('option').filter({ hasText: proxyName }).first().click();
      return this;
    });
  }

  private validationLocators(v: Validation) {
    const fatal = this.page.getByTestId(TEST_IDS.VALIDATIONS.FATAL);
    const missingAccount = this.page.getByTestId(TEST_IDS.VALIDATIONS.MISSING_ACCOUNT);
    const permission = this.page.getByTestId(TEST_IDS.VALIDATIONS.PERMISSION);
    const balance = this.page.getByTestId(TEST_IDS.VALIDATIONS.BALANCE);

    switch (v) {
      case Validation.fatal:
        return [fatal];
      case Validation.missingAccount:
        return [missingAccount];
      case Validation.permission:
        return [permission];
      case Validation.balance:
        return [balance];
      case Validation.sendingAmount:
        return [balance, this.page.getByTestId(ValidationElements.sendingAmountError)];
      case Validation.networkFee:
        return [balance, this.page.getByTestId(ValidationElements.networkFeeAmountError)];
      case Validation.xcmFee:
        return [balance, this.page.getByTestId(ValidationElements.crossChainFeeAmountError)];
      case Validation.deliveryFee:
        return [balance, this.page.getByTestId(ValidationElements.deliveryFeeAmountError)];
      case Validation.multisigDeposit:
        return [balance, this.page.getByTestId(ValidationElements.multisigDepositError)];
      case Validation.proxyDeposit:
        return [balance, this.page.getByTestId(ValidationElements.proxyDepositError)];
    }
  }

  public async expectValidationsVisible(validations: Validation | Validation[]): Promise<void> {
    const list = Array.isArray(validations) ? validations : [validations];
    await this.isContinueButtonDisabled();
    await this.expectTransferFeeNotZero();
    await this.isContinueButtonDisabled();

    await step(`Check validations visible: ${list.join(', ')}`, async () => {
      for (const v of list) {
        const locs = this.validationLocators(v);

        await Promise.race(locs.map((l) => l.waitFor({ state: 'visible' }))).catch(() => {
          throw new Error(`Validation "${v}" did not appear.`);
        });

        for (const l of locs) {
          await expect(l).toBeVisible();
        }
      }
    });
    await this.isContinueButtonDisabled();
  }

  public async expectValidationsHidden(validations: Validation | Validation[]): Promise<void> {
    const list = Array.isArray(validations) ? validations : [validations];

    await step(`Check validations hidden: ${list.join(', ')}`, async () => {
      for (const v of list) {
        const locs = this.validationLocators(v);
        for (const l of locs) {
          await expect(l).toHaveCount(0);
        }
      }
    });
  }

  public async expectContinueButtonToBeDisabled(): Promise<void> {
    await step('Expect Continue button to be disabled', async () => {
      const button = this.page.getByRole('button', { name: 'Continue' });
      await expect(button).toBeDisabled();
    });
  }

  public async isContinueButtonDisabled(): Promise<void> {
    await step('Check that Continue button is disabled', async () => {
      const button = this.page.getByRole('button', { name: 'Continue' });
      if (await button.isEnabled()) {
        throw new Error(`Continue button is enabled by error`);
      }
    });
  }

  public async expectTransferFeeNotZero(): Promise<void> {
    const feeRow = this.page.getByTestId(DelegateModalElements.feeRowLocator);
    const fee = feeRow.getByTestId(DelegateModalElements.tokenAmountLocator);

    await step('Expect transfer fee to be greater than 0', async () => {
      const feeText = await fee.textContent();
      const numericMatch = feeText?.match(/(\d+\.?\d*)/);
      const feeValue = numericMatch ? parseFloat(numericMatch[0]) : 0;

      expect(feeValue).toBeGreaterThan(0);
    });
  }
}
