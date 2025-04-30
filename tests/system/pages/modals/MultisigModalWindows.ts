import { BasePage } from "../BasePage";
import { Page } from "@playwright/test";
import { BaseModal } from "../BaseModalWindow";
import { MultisigModalElements } from "../_elements/MultisigModalElements";


export class MultisigModalWindows extends BaseModal<MultisigModalElements> {
    public previousPage: BasePage;

  constructor(page: Page, pageElements: MultisigModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  private async fillName(name: string): Promise<void> {
    await this.page.getByPlaceholder(MultisigModalElements.nameInput).fill(name);
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


