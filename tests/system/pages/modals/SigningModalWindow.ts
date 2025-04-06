import { type Page, expect } from '@playwright/test';

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
    expect(this.page.getByTestId(SigningModalElements.qrCodeContainerLocator)).toBeVisible();
  }

  public async checkQRCodeWalletConnect(): Promise<void> {
    expect(this.page.getByTestId(SigningModalElements.qrCodeWalletConnectLocator)).toBeVisible();
  }
}
