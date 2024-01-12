import { Page } from 'playwright';

import { LoginPageElements } from '../_elements/LoginPageElements';
import { BasePage } from '../BasePage';
import { PolkadotVaultLoginPage } from './PolkadotVaultLoginPage';
import { WatchOnlyLoginPage } from './WatchOnlyLoginPage';
import { WatchOnlyAssetsPage } from '../assetsPage/WatchOnlyPageAssetsPage';
import { baseTestConfig } from '../../BaseTestConfig';

export class BaseLoginPage extends BasePage {
  protected pageElements: LoginPageElements;

  constructor(page: Page, pageElements: LoginPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async gotoOnboarding(): Promise<BaseLoginPage> {
    await this.goto(this.pageElements.url);

    return this;
  }

  public async clickWatchOnlyButton(): Promise<WatchOnlyLoginPage> {
    await this.click(this.pageElements.watchOnlyButton);

    return new WatchOnlyLoginPage(this.page, this.pageElements);
  }

  public async clickPolkadotVaultButton(): Promise<PolkadotVaultLoginPage> {
    await this.click(this.pageElements.polkadotVaultButton);

    return new PolkadotVaultLoginPage(this.page, this.pageElements);
  }

  public async createBaseWatchOnlyWallet(): Promise<WatchOnlyAssetsPage> {
    await this.gotoOnboarding();

    return (await this.clickWatchOnlyButton()).createWatchOnlyAccount(
      baseTestConfig.test_name,
      baseTestConfig.test_address,
    );
  }
}
