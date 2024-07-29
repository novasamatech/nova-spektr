import { test } from '@playwright/test';
import { type Browser, type BrowserContext, type Page, chromium } from 'playwright';

import { ethChains } from '../../data/chains/chainsList';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';
import { type VaultAssetsPage } from '../../pages/assetsPage/VaultAssetsPage';
import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';

test.describe(
  'Load Transfer fee as ethereum_based polkadot Vault wallet',
  {
    tag: '@fee-test',
  },
  () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let loginPage: BaseLoginPage;
    let vaultWallet: VaultAssetsPage;

    test.beforeAll(async () => {
      browser = await chromium.launch();
      context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      page = await context.newPage();
      loginPage = new BaseLoginPage(page, new LoginPageElements());
      await loginPage.gotoOnboarding();
      vaultWallet = await loginPage.createVaultEthWallet();
    });

    test.afterAll(async () => {
      await browser.close();
    });

    ethChains.forEach((chain) => {
      test(`Can load fee for ${chain.name}`, async () => {
        test.slow();
        const assetsPage = await vaultWallet.gotoMain();
        await assetsPage.checkTransferFee(chain);
      });
    });
  },
);
