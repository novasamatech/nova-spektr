import { Page } from 'playwright';

import { LoginPageElements } from '../_elements/LoginPageElements';
import { BasePage } from '../BasePage';
import { PolkadotVaultLoginPage } from './PolkadotVaultLoginPage';
import { WatchOnlyLoginPage } from './WatchOnlyLoginPage';
import { WatchOnlyAssetsPage } from '../assetsPage/WatchOnlyAssetsPage';
import { baseTestConfig } from '../../BaseTestConfig';
import { VaultAssetsPage } from '../assetsPage/VaultAssetsPage';
import {
  vaultDPPolkadotTestWallet,
  vaultDPPolkadotTestAccount,
} from '../../data/db/dynamicDerivations/dynamicDerivationsWallets';
import { IndexedDBData, injectDataInDatabase } from '../../utils/interactWithDatabase';
import { AssetsPageElements } from '../_elements/AssetsPageElements';
import { vaultSubstrateWallet, vaultSubstrateAccount } from '../../data/db/polkadotVaultWallet/polkadotVaultSubstrateWallet';
import { vaultAndEthereumAccount, vaultAndEthereumWallet } from '../../data/db/polkadotVaultWallet/polkadotVaultWithEthereum';

export class BaseLoginPage extends BasePage {
  protected pageElements: LoginPageElements;

  constructor(page: Page, pageElements: LoginPageElements) {
    super(page);
    this.pageElements = pageElements;
  }

  public async gotoOnboarding(): Promise<BaseLoginPage> {
    await this.goto(this.pageElements.url);
    await this.page.getByText(this.pageElements.onboardingLabel).waitFor();

    return this;
  }

  public async clickWatchOnlyButton(): Promise<WatchOnlyLoginPage> {
    await this.clickOnButton(this.pageElements.watchOnlyButton);

    return new WatchOnlyLoginPage(this.page, this.pageElements);
  }

  public async clickPolkadotVaultButton(): Promise<PolkadotVaultLoginPage> {
    await this.clickOnButton(this.pageElements.polkadotVaultButton);

    return new PolkadotVaultLoginPage(this.page, this.pageElements);
  }

  public async createBaseWatchOnlyWallet(): Promise<WatchOnlyAssetsPage> {
    await this.gotoOnboarding();

    return (await this.clickWatchOnlyButton()).createWatchOnlyAccount(
      baseTestConfig.test_name,
      baseTestConfig.test_address,
    );
  }

  public async createDDPolkadotVaultWallet(): Promise<VaultAssetsPage> {
    return this.createVaultWallet(vaultDPPolkadotTestWallet, vaultDPPolkadotTestAccount);
  }

  public async createVaultSubstrateWallet(): Promise<VaultAssetsPage> {
    return this.createVaultWallet(vaultSubstrateWallet, vaultSubstrateAccount);
  }

  public async createVaultEthWallet(): Promise<VaultAssetsPage> {
    return this.createVaultWallet(vaultAndEthereumWallet, vaultAndEthereumAccount);
  }

  private async createVaultWallet(walletData: IndexedDBData, accountData: IndexedDBData): Promise<VaultAssetsPage> {
    await this.gotoOnboarding();
  
    await injectDataInDatabase(this.page, walletData);
    await injectDataInDatabase(this.page, accountData);
  
    await this.page.waitForTimeout(2000); // waiting for database update
    await this.page.reload();
  
    return new VaultAssetsPage(this.page, new AssetsPageElements());
  }
}
