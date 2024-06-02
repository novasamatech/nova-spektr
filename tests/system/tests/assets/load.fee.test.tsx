import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';

import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';
import { readConfig } from '../../utils/readConfig';
import { chainsList } from '../../data/chains/chainsList';
import { VaultAssetsPage } from '../../pages/assetsPage/VaultAssetsPage';

test.describe('Load fee tests', () => {
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
      await loginPage.gotoOnboarding()
      vaultWallet = await loginPage.createVaultAllWallet();
    });
  
    test.afterAll(async () => {
      await browser.close();
    });
  
    chainsList.forEach((chain) => {
      test(`Can load fee for network ${chain.name}`, async () => {
        test.slow()
        const assetsPage = await vaultWallet.gotoMain();
  
        await assetsPage.checkTransferFee(chain);
      });
    });
  });
