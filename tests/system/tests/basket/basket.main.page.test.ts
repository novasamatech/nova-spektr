import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';

import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';

test.describe(
  'Basket Main page',
  {
    tag: ['@regress', '@basket'],
  },
  () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let loginPage: BaseLoginPage;

    test.beforeAll(async () => {
      browser = await chromium.launch();
    });

    test.afterAll(async () => {
      await browser.close();
    });

    test('Empty basket', async () => {
      context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      page = await context.newPage();
      loginPage = new BaseLoginPage(page, new LoginPageElements());

      const vaultWallet = await loginPage.createDDPolkadotVaultWallet();
      await vaultWallet.openBasket();

      await expect(page).toHaveScreenshot();
    });

    test('Show staking operations into basket', async () => {
      context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      page = await context.newPage();
      loginPage = new BaseLoginPage(page, new LoginPageElements());

      const vaultWallet = await loginPage.createDDPolkadotVaultWallet();
      const basketPage = await vaultWallet.openBasket();
      await basketPage.addStakingOperationsIntoBasket();

      await expect(page).toHaveScreenshot();
    });

    test('Show transfer operations into basket', async () => {
      context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      page = await context.newPage();
      loginPage = new BaseLoginPage(page, new LoginPageElements());

      const vaultWallet = await loginPage.createDDPolkadotVaultWallet();
      const basketPage = await vaultWallet.openBasket();
      await basketPage.addTransferOperationsIntoBasket();

      await expect(page).toHaveScreenshot();
    });

    test('Show proxy operations into basket', async () => {
      context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      page = await context.newPage();
      loginPage = new BaseLoginPage(page, new LoginPageElements());

      const vaultWallet = await loginPage.createDDPolkadotVaultWallet();
      const basketPage = await vaultWallet.openBasket();
      await basketPage.addProxyOperationsIntoBasket();

      await expect(page).toHaveScreenshot();
    });
  },
);
