import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test } from '@playwright/test';

import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';
import { substrateChains } from '../../data/chains/chainsList';
import { VaultAssetsPage } from '../../pages/assetsPage/VaultAssetsPage';

test.describe('Load Transfer fee as Substrate Polkadot Vault', () => {
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
    vaultWallet = await loginPage.createVaultSubstrateWallet();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  substrateChains.forEach((chain) => {
    test(`Can load fee for ${chain.name}`, async () => {
      test.slow();
      const assetsPage = await vaultWallet.gotoMain();

      await assetsPage.checkTransferFee(chain);
    });
  });
});
