import { type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { getValidationLocators } from '../../utils/validationHelpers';
import { type Validation } from '../../utils/validationTestCases';
import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { DelegateModalElements } from '../_elements/DelegateModalElements';

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

  public async expectValidationsVisible(validations: Validation | Validation[]): Promise<void> {
    const list = Array.isArray(validations) ? validations : [validations];
    await this.isContinueButtonDisabled();
    await this.expectTransferFeeNotZero();
    await this.isContinueButtonDisabled();

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
    await this.isContinueButtonDisabled();
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
