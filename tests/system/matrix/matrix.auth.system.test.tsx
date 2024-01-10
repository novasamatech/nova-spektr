import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { test, expect } from '@playwright/test';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { baseTestConfig } from '../BaseTestConfig';
import { MatrixModalWindow } from '../pages/modals/MatrixModalWindow';

const timeout = 60_000;
test.setTimeout(timeout);

test.describe('Matrix Login', () => {
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
    loginPage = new BaseLoginPage(page, new LoginPageElements());
  });

  test.afterEach(async () => {
    await context.close();
  });

  const loginAndCheckVisibility = async (matrixSettings: MatrixModalWindow, loggedInElement) => {
    await matrixSettings.matrixAuthentificate(baseTestConfig.matrix_username_1, baseTestConfig.matrix_password_1);
    await page.waitForSelector(loggedInElement);
    expect(await page.isVisible(loggedInElement)).toBeTruthy();
  };

  test('User can login in Matrix from Settings page', async () => {
    const assetsPage = await loginPage.createBaseWatchOnlyWallet();
    const settingsPage = await assetsPage.goToSettingsPage();
    const matrixSettings = await settingsPage.clickOnMatrixElementMenu();
    await loginAndCheckVisibility(matrixSettings, matrixSettings.pageElements.logedIn);
  });

  test('User can login in Matrix from Multisig creation flow', async () => {
    const assetsPage = await loginPage.createBaseWatchOnlyWallet();
    await assetsPage.openWalletManagement();
    await page.waitForTimeout(2000);
    const walletModalWindow = await assetsPage.openWalletManagement();
    const matrixSettings = await (await walletModalWindow.clickOnAddButton()).clickOnMultisigButtonWithoutAuth();
    await loginAndCheckVisibility(matrixSettings, matrixSettings.pageElements.multisigLoggednInd);
  });
});
