import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';

import { BaseLoginPage } from '../../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../../pages/_elements/LoginPageElements';
import { baseTestConfig } from '../../BaseTestConfig';

test.setTimeout(60_000);

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

  test.afterEach(async () => {
    await context.close();
  });

  test('User can login in Matrix from Settings page', async () => {
    const assetsPage = await loginPage.createBaseWatchOnlyWallet();
    const settingsPage = await assetsPage.goToSettingsPage();
    const matrixSettings = await settingsPage.clickOnMatrixElementMenu();
    await matrixSettings.matrixAuthentificate(baseTestConfig.matrix_username_1, baseTestConfig.matrix_password_1);

    await page.waitForSelector(matrixSettings.pageElements.logedIn);
    expect(await page.isVisible(matrixSettings.pageElements.logedIn)).toBeTruthy();
  });

  test('User can login in Matrix from Multisig creation flow', async () => {
    const assetsPage = await loginPage.createBaseWatchOnlyWallet();
    const walletModalWindow = await assetsPage.openWalletManagement();
    const matrixSettings = await (await walletModalWindow.clickOnAddButton()).clickOnMultisigButtonWithoutAuth();
    await matrixSettings.matrixAuthentificate(baseTestConfig.matrix_username_1, baseTestConfig.matrix_password_1);

    await page.waitForSelector(matrixSettings.pageElements.multisigLoggednInd);
    expect(await page.isVisible(matrixSettings.pageElements.multisigLoggednInd)).toBeTruthy();
  });
});
