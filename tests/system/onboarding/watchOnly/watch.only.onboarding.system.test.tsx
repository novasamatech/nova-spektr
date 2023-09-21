import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';
import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';
import { baseTestConfig } from '../../BaseTestConfig';

test.describe('Watch only wallet onboarding', () => {
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

  test('Can add watch only wallet', async () => {
    const watchOnlyPage = await (await loginPage.gotoOnboarding()).clickWatchOnlyButton();
    const watchOnlyAssetsPage = await watchOnlyPage.createWatchOnlyAccount(
      baseTestConfig.test_name,
      baseTestConfig.test_address,
    );
    expect(await page.isVisible('text=Assets')).toBeTruthy();
  });

  test('Link from info button lead to subscan', async () => {
    const watchOnlyPage = await (await loginPage.gotoOnboarding()).clickWatchOnlyButton();
    await (await watchOnlyPage.fillAccountAddress(baseTestConfig.test_address)).clickInfoButton();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: watchOnlyPage.pageElements.subscanLabel }).click(),
    ]);
    await newPage.waitForLoadState('load');

    expect(await newPage.url()).toContain('subscan.io');
  });
});
