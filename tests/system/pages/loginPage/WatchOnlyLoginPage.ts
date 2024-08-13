import { BasePage } from '../BasePage';
import { AssetsPageElements } from '../_elements/AssetsPageElements';
import { type LoginPageElements } from '../_elements/LoginPageElements';
import { WatchOnlyAssetsPage } from '../assetsPage/WatchOnlyAssetsPage';

export class WatchOnlyLoginPage extends BasePage<LoginPageElements> {
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
    await this.page.locator(this.pageElements.firstInfoButton).getByRole('button').nth(1).click();

    return this;
  }
}
