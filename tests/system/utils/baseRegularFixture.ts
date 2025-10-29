import { type BrowserContext, type Page, test as base } from '@playwright/test';

import { AssetsPageElements } from '../pages/_elements/AssetsPageElements';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { BaseAssetsPage } from '../pages/assetsPage/BaseAssetsPage';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';

type TestFixtures = {
  page: Page;
  loginPage: BaseLoginPage;
  assetsPage: BaseAssetsPage;
};

type WorkerFixtures = {
  sharedContext: BrowserContext;
  appBootstrapped: void;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });

      await context.addInitScript(() => {
        const flags: Record<string, string> = {
          assethub_migration_modal_seen_kusama: 'true',
          assethub_migration_modal_seen_polkadot: 'true',
        };
        for (const [k, v] of Object.entries(flags)) localStorage.setItem(k, v);
      });

      await use(context);
      await context.close();
    },
    { scope: 'worker' } as const,
  ],

  appBootstrapped: [
    async ({ sharedContext }, use) => {
      const tmp = await sharedContext.newPage();
      const login = new BaseLoginPage(tmp, new LoginPageElements());

      await login.importDatabase('validations/validations_tests_db.json');

      await tmp.close();
      await use(undefined);
    },
    { scope: 'worker' } as const,
  ],

  page: async ({ sharedContext }, use) => {
    const page = await sharedContext.newPage();
    await use(page);
    await page.close();
  },

  loginPage: async ({ page }, use) => {
    await use(new BaseLoginPage(page, new LoginPageElements()));
  },

  assetsPage: async ({ page, appBootstrapped: _bootstrapped }, use) => {
    const assets = new BaseAssetsPage(page, new AssetsPageElements());
    await assets.gotoMain();
    await use(assets);
  },
});

export { expect } from '@playwright/test';
