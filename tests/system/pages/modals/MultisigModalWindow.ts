import { BasePage } from "../BasePage";
import { Page } from "@playwright/test";
import { BaseModal } from "../BaseModalWindow";
import { MultisigModalElements } from "../_elements/MultisigModalElements";
import { TEST_IDS } from "@/shared/constants/testIds";
import { ConfirmationModalWindow } from "./ConfirmationModalWindow";
import { ConfirmationModalElements } from "../_elements/ConfirmationModalElements";

export class MultisigModalWindow extends BaseModal<MultisigModalElements> {
    public previousPage: BasePage;

  constructor(page: Page, pageElements: MultisigModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async fillFirstSignatoryAddress(address: string): Promise<void> {
    await this.page.getByTestId(TEST_IDS.MULTISIG.SIGNATORY_COMBOBOX).fill(address);
  }

  public async clickAddSignatoryButton(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add new signatory' }).click();
  }

  public async fillSecondSignatoryAddress(address: string): Promise<void> {
    await this.page.getByTestId(TEST_IDS.MULTISIG.SIGNATORY_COMBOBOX).nth(1).fill(address);
  }

  public async fillWalletName(name: string): Promise<void> {
    await this.page.getByPlaceholder(MultisigModalElements.nameInput).fill(name);
  }

  public async fillSignatoryWalletName(name: string): Promise<void> {
    await this.page.getByPlaceholder(MultisigModalElements.nameInput).nth(1).fill(name);
  }

  public async chooseNetwork(network: string): Promise<void> {    
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

  public async chooseTrashhold(trashhold: number): Promise<void> {
    await this.page.getByTestId('Select').click();
    await this.page.getByRole('option', { name: trashhold.toString() }).click();
  
  }

  public async clickOnContinueButton(): Promise<void> {
    await this.waitForContinueButtonToBeEnabled();
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }

  public async openConfirmationModal(): Promise<ConfirmationModalWindow> {
    await this.clickOnContinueButton();
    return new ConfirmationModalWindow(this.page, new ConfirmationModalElements(), this.previousPage);
  }
  
}


