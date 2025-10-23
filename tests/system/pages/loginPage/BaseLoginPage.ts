import { join } from 'path';
import { cwd } from 'process';

import { step } from 'allure-js-commons';

import { TEST_IDS } from '@/shared/constants';
import { baseTestConfig } from '../../BaseTestConfig';
import {
  vaultDPPolkadotTestAccount,
  vaultDPPolkadotTestWallet,
} from '../../data/db/dynamicDerivations/dynamicDerivationsWallets';
import {
  vaultSubstrateAccount,
  vaultSubstrateWallet,
} from '../../data/db/polkadotVaultWallet/polkadotVaultSubstrateWallet';
import {
  vaultAndEthereumAccount,
  vaultAndEthereumWallet,
} from '../../data/db/polkadotVaultWallet/polkadotVaultWithEthereum';
import { type IndexedDBData, injectDataInDatabase } from '../../utils/interactWithDatabase';
import { BasePage } from '../BasePage';
import { AssetsPageElements } from '../_elements/AssetsPageElements';
import { type LoginPageElements } from '../_elements/LoginPageElements';
import { VaultAssetsPage } from '../assetsPage/VaultAssetsPage';
import { type WatchOnlyAssetsPage } from '../assetsPage/WatchOnlyAssetsPage';

import { PolkadotVaultLoginPage } from './PolkadotVaultLoginPage';
import { WatchOnlyOnboardingPage } from './WatchOnlyLoginPage';

export class BaseLoginPage extends BasePage<LoginPageElements> {
  public async gotoOnboarding(): Promise<BaseLoginPage> {
    await step('Go to the onboarding page', async () => {
      await this.goto(this.pageElements.url);
      await this.page.getByText(this.pageElements.onboardingLabel).waitFor();
    });

    return this;
  }

  public async clickWatchOnlyButton(): Promise<WatchOnlyOnboardingPage> {
    await step('Click "Watch Only" button', async () => {
      await this.click(this.pageElements.watchOnlyButton);
    });

    return new WatchOnlyOnboardingPage(this.page, this.pageElements);
  }

  public async clickPolkadotVaultButton(): Promise<PolkadotVaultLoginPage> {
    await step('Click "Polkadot Vault" button', async () => {
      await this.click(this.pageElements.polkadotVaultButton);
    });

    return new PolkadotVaultLoginPage(this.page, this.pageElements);
  }

  public async createBaseWatchOnlyWallet(): Promise<WatchOnlyAssetsPage> {
    return await step('Create base Watch Only wallet', async () => {
      await this.gotoOnboarding();

      return (await this.clickWatchOnlyButton()).createWatchOnlyAccount(
        baseTestConfig.test_name,
        baseTestConfig.test_address,
      );
    });
  }

  public async createDDPolkadotVaultWallet(): Promise<VaultAssetsPage> {
    return this.injectWalletInDatabase(vaultDPPolkadotTestWallet, vaultDPPolkadotTestAccount);
  }

  public async createVaultSubstrateWallet(): Promise<VaultAssetsPage> {
    return this.injectWalletInDatabase(vaultSubstrateWallet, vaultSubstrateAccount);
  }

  public async createVaultEthWallet(): Promise<VaultAssetsPage> {
    return this.injectWalletInDatabase(vaultAndEthereumWallet, vaultAndEthereumAccount);
  }

  public async importDatabase(dbFileName: string): Promise<VaultAssetsPage> {
    return await step(`Import database from ${dbFileName}`, async () => {
      await this.gotoOnboarding();
      await this.page.getByTestId(this.pageElements.importDatabaseButton).click();

      const projectRoot = cwd();
      const dbFilePath = join(projectRoot, 'tests/system/data/db/', dbFileName);

      const fileInput = this.page.locator('input[type="file"]');
      await fileInput.setInputFiles(dbFilePath);
      await this.click('Button');
      await this.page.getByTestId(TEST_IDS.COMMON.WALLET_BUTTON).waitFor({ state: 'visible' });

      return new VaultAssetsPage(this.page, new AssetsPageElements());
    });
  }

  private async injectWalletInDatabase(
    walletData: IndexedDBData,
    accountData: IndexedDBData,
  ): Promise<VaultAssetsPage> {
    return await step('Inject wallet into IndexedDB', async () => {
      await this.gotoOnboarding();

      await injectDataInDatabase(this.page, walletData);
      await injectDataInDatabase(this.page, accountData);

      await this.page.waitForTimeout(2000); // waiting for database update
      await this.page.reload();

      return new VaultAssetsPage(this.page, new AssetsPageElements());
    });
  }
}
