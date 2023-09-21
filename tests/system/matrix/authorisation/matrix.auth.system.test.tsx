import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';
import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';

test.describe('Login in Matrix', () => {
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

  test.beforeEach(async () => {
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    const pageElements = new LoginPageElements();
    loginPage = new BaseLoginPage(page, pageElements);
  });

  test('User can login in Matrix from Settings page', async () => {
    const assetsPage = await loginPage.createBaseWatchOnlyWallet();
    expect(await page.isVisible('text=Add Watch-only wallet')).toBeTruthy();
  });
});
