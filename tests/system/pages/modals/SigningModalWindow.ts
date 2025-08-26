import { type Page, expect } from '@playwright/test';
import { step } from 'allure-js-commons';

import { BaseModal } from '../BaseModalWindow';
import { type BasePage } from '../BasePage';
import { SigningModalElements } from '../_elements/SigningModalElements';

export class SigningModalWindow extends BaseModal<SigningModalElements> {
  public previousPage: BasePage;

  constructor(page: Page, pageElements: SigningModalElements, previousPage: BasePage) {
    super(page, pageElements);
    this.previousPage = previousPage;
  }

  public async checkQRCode(): Promise<void> {
    await step('Check that QR Code is visible', async () => {
      await expect(this.page.getByTestId(SigningModalElements.qrCodeContainerLocator)).toBeVisible();
    });
  }

  public async checkSignReadyWalletConnect(): Promise<void> {
    await step('Check that we are on signing page', async () => {
      await this.checkForAlerts();
      await expect(this.page.getByText(SigningModalElements.signReadyWalletConnectLocator)).toBeVisible();
    });
  }
}
