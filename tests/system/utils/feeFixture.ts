import { type VaultAssetsPage } from '../pages/assetsPage/VaultAssetsPage';

import { test as base } from './baseRegularFixture';

type FeeFixture = {
  vaultWallet: VaultAssetsPage;
};

export const test = base.extend<FeeFixture>({
  vaultWallet: async ({ loginPage }, use, testInfo) => {
    await loginPage.gotoOnboarding();
    const vaultWallet = testInfo.tags.includes('@eth-test')
      ? await loginPage.createVaultEthWallet()
      : await loginPage.createVaultSubstrateWallet();
    await use(vaultWallet);
  },
});

export { expect } from '@playwright/test';
