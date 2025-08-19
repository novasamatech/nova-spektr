import { type Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { ConfirmationModalElements } from '../_elements/ConfirmationModalElements';
import { MultisigModalElements } from '../_elements/MultisigModalElements';
import { SigningModalElements } from '../_elements/SigningModalElements';

import { ConfirmationModalWindow } from './ConfirmationModalWindow';
import { NetworkSelectionModalWindow } from './NetworkSelectionModalWindow';
import { SigningModalWindow } from './SigningModalWindow';

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

  public async fillWalletName(name: string): Promise<void> {
    await step(`Fill wallet name: ${name}`, async () => {
      await this.page.getByTestId(MultisigModalElements.walletNameInput).fill(name);
    });
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

  private async chooseThreshold(threshold: number): Promise<void> {
    await this.page.getByTestId(MultisigModalElements.selectTestId).click();
    await this.page.getByRole('option', { name: threshold.toString() }).click();
  }

  public async selectMultisigType(multisigType: string): Promise<void> {
    await step('Select the type of a new multisig', async () => {
      await this.page.getByTestId(multisigType).click();
    });
  }

  public async selectMyAccount(account: string): Promise<void> {
    await step(`Select account: ${account}`, async () => {
      await this.page.getByTestId(MultisigModalElements.signerSelector).click();
      await this.page
        .getByTestId(MultisigModalElements.signerSelector)
        .getByTestId(MultisigModalElements.address)
        .filter({ hasText: account })
        .first()
        .click();
    });
  }

  public async editNetworkSelection(): Promise<NetworkSelectionModalWindow> {
    await step('Click Edit Network button to open selection modal', async () => {
      await this.page.getByTestId(MultisigModalElements.networkEditButton).click();
    });

    return new NetworkSelectionModalWindow(this.page, new MultisigModalElements(), this.previousPage);
  }

  public async clickContinueWithAlertChecks(): Promise<void> {
    await step('Click Continue button with alert checks', async () => {
      await this.checkForAlerts();
      await this.waitForContinueButtonToBeEnabled();
      await this.page.getByRole('button', { name: 'Continue' }).click();
      await this.checkForAlerts();
    });
  }

  public async clickContinueNoAlertChecks(): Promise<void> {
    await step('Click Continue button without alert checks', async () => {
      await this.waitForContinueButtonToBeEnabled();
      await this.page.getByRole('button', { name: 'Continue' }).click();
    });
  }

  public async openConfirmationModal(): Promise<ConfirmationModalWindow> {
    await step('Open Confirmation modal from Multisig modal', async () => {
      await this.clickContinueWithAlertChecks();
    });
    return new ConfirmationModalWindow(this.page, new ConfirmationModalElements(), this.previousPage);
  }

  public async chooseNetworkandWalletName(network: string, name: string): Promise<void> {
    await step(`Fill wallet name "${name}" and choose network "${network}"`, async () => {
      await this.fillWalletName(name);
      await this.chooseNetwork(network);
      await this.clickContinueWithAlertChecks();
    });
  }

  public async fillSignatoryAndSetThreshold(signatoryDictionary: string[], threshold?: number): Promise<void> {
    await step('Fill signatories and set threshold', async () => {
      await this.fillSignatoryAddress(signatoryDictionary[0], 0);

      for (let i = 1; i < signatoryDictionary.length; i++) {
        await this.clickAddSignatoryButton();
        await this.fillSignatoryWalletName('Multisig wallet', i);
        await this.fillSignatoryAddress(signatoryDictionary[i], i);
      }
      if (threshold) {
        if (threshold < 2 || threshold > signatoryDictionary.length) {
          throw new Error(`Threshold must be between 2 and ${signatoryDictionary.length}`);
        }
        await this.chooseThreshold(threshold);
      } else {
        await this.chooseThreshold(signatoryDictionary.length);
      }
    });
  }

  public async addSignatory(signatory: string): Promise<void> {
    await step('Add signatory', async () => {
      await this.clickAddSignatoryButton();
      await this.page.getByTestId(MultisigModalElements.signatoryComboBox).fill(signatory);
    });
  }

  public async fillSignatoryName(name: string): Promise<void> {
    await step(`Fill signatory name`, async () => {
      await this.page.getByTestId(MultisigModalElements.signatoryName).fill(name);
    });
  }

  public async setThreshold(threshold: number): Promise<void> {
    await step(`Set threshold to ${threshold}`, async () => {
      await this.page.getByTestId(MultisigModalElements.thresholdSelector).click();
      await this.page.getByRole('option', { name: threshold.toString() }).click();
    });
  }

  public async clickCreatePureProxy(): Promise<SigningModalWindow> {
    await step('Click "Create pure proxy" button', async () => {
      await this.page.getByTestId(MultisigModalElements.createPureButton).click();
    });
    return new SigningModalWindow(this.page, new SigningModalElements(), this.previousPage);
  }

  public async isAssignControlDisabled(): Promise<void> {
    await step('Assert "Assign control" button is disabled', async () => {
      await expect(this.page.getByTestId(MultisigModalElements.assignControlButton)).toBeDisabled();
    });
  }
}
