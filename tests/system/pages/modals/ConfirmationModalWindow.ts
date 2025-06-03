import { type Page } from '@playwright/test';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { ConfirmationModalElements } from '../_elements/ConfirmationModalElements';
import { SigningModalElements } from '../_elements/SigningModalElements';

import { SigningModalWindow } from './SigningModalWindow';

export class ConfirmationModalWindow extends BaseModal<ConfirmationModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: ConfirmationModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async confirm(): Promise<SigningModalWindow> {
    const alert = this.page.getByTestId('alert');
    if (await alert.isVisible()) {
      const alertText = await alert.textContent();
      throw new Error(`Alert found on the page with text: ${alertText}`);
    }
    await this.page.getByRole('button', { name: ConfirmationModalElements.confirmButton }).click();

    return new SigningModalWindow(this.page, new SigningModalElements(), this.previousPage);
  }
}
