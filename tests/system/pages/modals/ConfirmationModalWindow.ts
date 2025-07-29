import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';

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
    return await step('Confirm transaction', async () => {
      await this.checkForAlerts();
      await this.page.getByRole('button', { name: ConfirmationModalElements.confirmButton }).click();
      await this.checkForAlerts();
      return new SigningModalWindow(this.page, new SigningModalElements(), this.previousPage);
    });
  }
}
