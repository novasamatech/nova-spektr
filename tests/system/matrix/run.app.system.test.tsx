import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../pages/loginPage/LoginPageElements';

test.setTimeout(60_000);

test.describe('Basic Playwright Test', () => {
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
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    const pageElements = new LoginPageElements();
    loginPage = new BaseLoginPage(page, pageElements);
  });

  test('should open a new page', async () => {
    await (await loginPage.gotoOnboarding()).clickWatchOnlyButton();
    await page.click('text=Add Watch-only wallet');
    expect(await page.isVisible('text=Add Watch-only wallet')).toBeTruthy();
  });
});
