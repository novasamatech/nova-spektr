import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { BaseLoginPage } from './pages/loginPage/BaseLoginPage';
import { LoginPageElements } from './pages/loginPage/LoginPageElements';

jest.setTimeout(60_000);

describe('Basic Playwright Test', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let loginPage: BaseLoginPage;

  beforeAll(async () => {
    // Launch a new browser
    browser = await chromium.launch();
  });

  afterAll(async () => {
    // Close the browser
    await browser.close();
  });

  beforeEach(async () => {
    const context = await browser.newContext();
    page = await context.newPage();
    const pageElements = new LoginPageElements();
    loginPage = new BaseLoginPage(page, pageElements);
  });

  afterEach(async () => {
    // Close the context
    await context.close();
  });

  it('should open a new page', async () => {
    await loginPage.gotoOnboarding();
  });
});
