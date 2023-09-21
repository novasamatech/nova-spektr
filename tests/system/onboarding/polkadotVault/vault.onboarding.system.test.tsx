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
    const pageElements = new LoginPageElements();
    loginPage = new BaseLoginPage(page, pageElements);

    const polkadotVaultOnboardingPage = await (await loginPage.gotoOnboarding()).clickPolkadotVaultButton();
    await page.waitForSelector(polkadotVaultOnboardingPage.pageElements.accessDeniedText);
    expect(await page.isVisible(polkadotVaultOnboardingPage.pageElements.accessDeniedText)).toBeTruthy();
  });
});
