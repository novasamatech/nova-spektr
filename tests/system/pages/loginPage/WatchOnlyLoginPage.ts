import { Page } from 'playwright';

import { LoginPageElements } from '../_elements/LoginPageElements';
import { BasePage } from '../BasePage';
import { WatchOnlyAssetsPage } from '../assetsPage/WatchOnlyPageAssetsPage';
import { AssetsPageElements } from '../_elements/AssetsPageElements';

export class WatchOnlyLoginPage extends BasePage {
  public pageElements: LoginPageElements;

  constructor(page: Page, pageElements: LoginPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async fillAccountAddress(address: string): Promise<WatchOnlyLoginPage> {
    await this.clickIntoField(this.pageElements.enterAccountAddress);
    await this.fillFieldByValue(this.pageElements.enterAccountAddress, address);

    return this;
  }

  public async fillWalletName(name: string): Promise<WatchOnlyLoginPage> {
    await this.clickIntoField(this.pageElements.accountNameField);
    await this.fillFieldByValue(this.pageElements.accountNameField, name);

    return this;
  }

  public async createWatchOnlyAccount(name: string, address: string): Promise<WatchOnlyAssetsPage> {
    await this.fillWalletName(name);
    await this.fillAccountAddress(address);
    await this.clickOnButton(this.pageElements.continueButton);
    await this.page.waitForTimeout(5000); // takes some time to load the app and balances

    return new WatchOnlyAssetsPage(this.page, new AssetsPageElements());
  }

  public async clickInfoButton(): Promise<WatchOnlyLoginPage> {
    await this.click(this.pageElements.firstInfoButton);

    return this;
  }
}
