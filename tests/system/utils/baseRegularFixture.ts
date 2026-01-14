import { type BrowserContext, type Page, test as base } from '@playwright/test';

import { AssetsPageElements } from '../pages/_elements/AssetsPageElements';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { BaseAssetsPage } from '../pages/assetsPage/BaseAssetsPage';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';

type TestFixtures = {
  page: Page;
  loginPage: BaseLoginPage;

  transfersPage: BaseAssetsPage;

  xcmTransfersPage: BaseAssetsPage;

  validationsPage: BaseAssetsPage;
};

type WorkerFixtures = {
  sharedContext: BrowserContext;
  validationsContext: BrowserContext;
  transfersContext: BrowserContext;
};

async function applyInitFlags(context: BrowserContext) {
  await context.addInitScript(() => {
    const flags: Record<string, string> = {
      assethub_migration_modal_seen_kusama: 'true',
      assethub_migration_modal_seen_polkadot: 'true',
    };
    for (const [k, v] of Object.entries(flags)) localStorage.setItem(k, v);
  });
}

async function bootstrapDb(context: BrowserContext, dbPath: string) {
  const tmp = await context.newPage();
  const login = new BaseLoginPage(tmp, new LoginPageElements());
  await login.importDatabase(dbPath);
  await tmp.close();
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      await applyInitFlags(context);

      await use(context);
      await context.close();
    },
    { scope: 'worker' } as const,
  ],

  validationsContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      await applyInitFlags(context);
      await bootstrapDb(context, 'validations/validations_tests_db.json');

      await use(context);
      await context.close();
    },
    { scope: 'worker' } as const,
  ],

  transfersContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: [] });
      await applyInitFlags(context);
      await bootstrapDb(context, 'transfers/transfers_tests_db.json');

      await use(context);
      await context.close();
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

  validationsPage: async ({ validationsContext }, use) => {
    const page = await validationsContext.newPage();
    const assets = new BaseAssetsPage(page, new AssetsPageElements());
    await assets.gotoMain();

    await use(assets);

    await page.close();
  },

  transfersPage: async ({ transfersContext }, use) => {
    const page = await transfersContext.newPage();
    const assets = new BaseAssetsPage(page, new AssetsPageElements());
    await assets.gotoMain();

    await use(assets);

    await page.close();
  },

  xcmTransfersPage: async ({ transfersContext }, use) => {
    const page = await transfersContext.newPage();
    const assets = new BaseAssetsPage(page, new AssetsPageElements());
    await assets.gotoMain();

    await use(assets);

    await page.close();
  },
});

export { expect } from '@playwright/test';
