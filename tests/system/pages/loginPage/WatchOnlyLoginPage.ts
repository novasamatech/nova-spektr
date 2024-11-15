import { BasePage } from '../BasePage';
import { AssetsPageElements } from '../_elements/AssetsPageElements';
import { type LoginPageElements as OnboardingPageElements } from '../_elements/LoginPageElements';
import { WatchOnlyAssetsPage } from '../assetsPage/WatchOnlyAssetsPage';

export class WatchOnlyOnboardingPage extends BasePage<OnboardingPageElements> {
  public async fillAccountAddress(address: string): Promise<WatchOnlyOnboardingPage> {
    await this.click(this.pageElements.enterAccountAddress);
    await this.page.getByTestId(this.pageElements.enterAccountAddress).fill(address);

    return this;
  }

  public async fillWalletName(name: string): Promise<WatchOnlyOnboardingPage> {
    await this.page.getByTestId(this.pageElements.accountNameField).fill(name);

    return this;
  }

  public async createWatchOnlyAccount(name: string, address: string): Promise<WatchOnlyAssetsPage> {
    await this.fillWalletName(name);
    await this.fillAccountAddress(address);
    await this.click(this.pageElements.continueButton);
    await this.page.waitForTimeout(5000); // takes some time to load the app and balances

    return new WatchOnlyAssetsPage(this.page, new AssetsPageElements());
  }

  public async clickFirstInfoButton(): Promise<WatchOnlyOnboardingPage> {
    await this.page.getByTestId(this.pageElements.firstInfoButton).first().click();

    return this;
  }
}
