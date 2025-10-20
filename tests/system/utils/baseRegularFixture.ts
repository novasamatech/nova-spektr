import { type Browser, type BrowserContext, type Page, test as base, chromium } from '@playwright/test';

import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';

type BaseFixture = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  loginPage: BaseLoginPage;
};

export const test = base.extend<BaseFixture>({
  // eslint-disable-next-line no-empty-pattern
  browser: async ({}: any, use: (arg0: Browser) => any) => {
    const browser = await chromium.launch();
    await use(browser);
    await browser.close();
  },

  context: async ({ browser }, use) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
    await context.addInitScript(() => {
      const flags = {
        assethub_migration_modal_seen_kusama: 'true',
        assethub_migration_modal_seen_polkadot: 'true',
      };

      for (const [key, value] of Object.entries(flags)) {
        window.localStorage.setItem(key, value);
      }
    });
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new BaseLoginPage(page, new LoginPageElements());
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
