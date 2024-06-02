import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';

import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';

test.describe('Polkadot Vault onboarding', () => {
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

  test('Show access denied if no permissions', async () => {
    context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
    page = await context.newPage();
    loginPage = new BaseLoginPage(page, new LoginPageElements());

    const polkadotVaultOnboardingPage = await loginPage
      .gotoOnboarding()
      .then((onboarding) => onboarding.clickPolkadotVaultButton());
    const { accessDeniedText } = polkadotVaultOnboardingPage.pageElements;
    await page.waitForSelector(accessDeniedText);
    expect(await page.isVisible(accessDeniedText));
  });

  test('Default settings for assets page', async () => {
    test.slow();
    context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
    page = await context.newPage();
    loginPage = new BaseLoginPage(page, new LoginPageElements());

    const vaultWallet = await loginPage.createVaultAllWallet();
    const assetsPage = await vaultWallet.gotoMain();
    const settingsWidget = await assetsPage.openSettingsWidget();
    const hideZeroBalancesStatus = await settingsWidget.getHideZeroBalancesStatus();
    const pageViewStatus = await settingsWidget.getpageViewStatus();

    expect(hideZeroBalancesStatus).toBe(false);
    expect(pageViewStatus).toBe(settingsWidget.pageElements.tokenCentric);
  });
});
