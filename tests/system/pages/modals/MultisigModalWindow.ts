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

  public async fillWalletName(name: string): Promise<void> {
    await step(`Fill wallet name: ${name}`, async () => {
      await this.page.getByTestId(MultisigModalElements.walletNameInput).fill(name);
    });
  }

  private async chooseNetwork(network: string): Promise<void> {
    await this.page.getByTestId('Select').click();
    await this.page.getByTestId(MultisigModalElements.networkOption).filter({ hasText: network }).first().click();
  }

  private async waitForContinueButtonToBeEnabled(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Continue' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  }

  public async selectMultisigType(multisigType: string): Promise<void> {
    await step('Select the type of a new multisig', async () => {
      await this.page.getByTestId(multisigType).click();
    });
  }

  private async selectMyAccount(account: string): Promise<void> {
    await step(`Select account: ${account}`, async () => {
      await this.page.getByTestId(MultisigModalElements.signerSelector).click();
      await this.page.getByTestId(MultisigModalElements.address).filter({ hasText: account }).first().click();
    });
  }

  private async editNetworkSelection(): Promise<NetworkSelectionModalWindow> {
    await step('Click Edit Network button to open selection modal', async () => {
      await this.page.getByTestId(MultisigModalElements.networkEditButton).click();
    });

    return new NetworkSelectionModalWindow(this.page, new MultisigModalElements(), this.previousPage);
  }

  public async editAndSelectNetwork(name: string): Promise<MultisigModalWindow> {
    return await step(`Edit network and select "${name}"`, async () => {
      const networkModal = await this.editNetworkSelection();

      return await networkModal.selectAndApplyNetwork(name);
    });
  }

  public async clickContinueWithAlertChecks(): Promise<void> {
    await step('Click Continue button with alert checks', async () => {
      await this.checkForAlerts();
      await this.waitForContinueButtonToBeEnabled();
      await this.page.getByRole('button', { name: 'Continue' }).click();
      await this.checkForAlerts();
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

  private async addSignatory(signatory: string): Promise<void> {
    await step('Add signatory', async () => {
      await this.clickAddSignatoryButton();
      await this.page.getByTestId(MultisigModalElements.signatoryComboBox).fill(signatory);
    });
  }

  private async fillSignatoryName(name: string): Promise<void> {
    await step(`Fill signatory name`, async () => {
      await this.page.getByTestId(MultisigModalElements.signatoryName).fill(name);
    });
  }

  public async addSignatoryWithName(signatory: string, name: string): Promise<void> {
    await step(`Add signatory "${signatory}" with name "${name}"`, async () => {
      await this.addSignatory(signatory);
      await this.fillSignatoryName(name);
    });
  }

  private async setThreshold(threshold: number): Promise<void> {
    await step(`Set threshold to ${threshold}`, async () => {
      await this.page.getByTestId(MultisigModalElements.thresholdSelector).click();
      await this.page
        .getByTestId(MultisigModalElements.thresholdOption)
        .filter({ hasText: threshold.toString() })
        .first()
        .click();
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

  public async setupSignatoriesAndThreshold(
    signatories: { account: string; name?: string }[],
    threshold: number,
  ): Promise<void> {
    await step(`Setup signatories (total: ${signatories.length}, threshold: ${threshold})`, async () => {
      if (!signatories || signatories.length < 2) {
        throw new Error(
          'setupSignatories: provide at least two signatories (one for My account, one for an additional signatory)',
        );
      }

      if (threshold < 2 || threshold > signatories.length) {
        throw new Error(`setupSignatories: threshold must be at least 2 and no more than ${signatories.length}`);
      }

      const [first, ...rest] = signatories;
      await this.selectMyAccount(first.account);

      for (const s of rest) {
        await this.addSignatoryWithName(s.account, s.name ?? s.account);
      }

      await this.setThreshold(threshold);
    });
  }
}
