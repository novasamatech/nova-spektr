import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { ConfirmationModalElements } from '../_elements/ConfirmationModalElements';
import { MultisigModalElements } from '../_elements/MultisigModalElements';

import { ConfirmationModalWindow } from './ConfirmationModalWindow';

export class MultisigModalWindow extends BaseModal<MultisigModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: MultisigModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  private async clickAddSignatoryButton(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add new signatory' }).click();
  }

  private async fillSignatoryAddress(address: string, ammount: number): Promise<void> {
    await this.page.getByTestId(MultisigModalElements.signatoryComboBox).nth(ammount).fill(address);
    await this.page.getByTestId(MultisigModalElements.address).click();
  }

  private async fillWalletName(name: string): Promise<void> {
    await this.page.getByPlaceholder(MultisigModalElements.nameInput).fill(name);
  }

  private async fillSignatoryWalletName(name: string, ammount: number): Promise<void> {
    await this.page
      .getByPlaceholder(MultisigModalElements.nameInput)
      .nth(ammount)
      .fill(name + '_' + ammount);
  }

  private async chooseNetwork(network: string): Promise<void> {
    await this.page.getByTestId('Select').click();
    await this.page.getByLabel(network, { exact: true }).getByText(network).click();
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

  private async chooseTrashhold(trashhold: number): Promise<void> {
    await this.page.getByTestId(MultisigModalElements.selectTestId).click();
    await this.page.getByRole('option', { name: trashhold.toString() }).click();
  }

  public async clickOnContinueButton(): Promise<void> {
    await step('Click Continue button', async () => {
      await this.checkForAlerts();
      await this.waitForContinueButtonToBeEnabled();
      await this.page.getByRole('button', { name: 'Continue' }).click();
      await this.checkForAlerts();
    });
  }

  public async openConfirmationModal(): Promise<ConfirmationModalWindow> {
    await step('Open Confirmation modal from Multisig modal', async () => {
      await this.clickOnContinueButton();
    });
    return new ConfirmationModalWindow(this.page, new ConfirmationModalElements(), this.previousPage);
  }

  public async chooseNetworkandWalletName(network: string, name: string): Promise<void> {
    await step(`Fill wallet name "${name}" and choose network "${network}"`, async () => {
      await this.fillWalletName(name);
      await this.chooseNetwork(network);
      await this.clickOnContinueButton();
    });
  }

  public async fillSignatoryAndSetTrashhold(signatoryDictionary: string[], trashhold?: number): Promise<void> {
    await step('Fill signatories and set threshold', async () => {
      await this.fillSignatoryAddress(signatoryDictionary[0], 0);

      for (let i = 1; i < signatoryDictionary.length; i++) {
        await this.clickAddSignatoryButton();
        await this.fillSignatoryWalletName('Multisig wallet', i);
        await this.fillSignatoryAddress(signatoryDictionary[i], i);
      }
      if (trashhold) {
        if (trashhold < 2 || trashhold > signatoryDictionary.length) {
          throw new Error(`Threshold must be between 2 and ${signatoryDictionary.length}`);
        }
        await this.chooseTrashhold(trashhold);
      } else {
        await this.chooseTrashhold(signatoryDictionary.length);
      }
    });
  }
}
