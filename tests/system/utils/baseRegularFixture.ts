import { type BrowserContext, type Page, test as base } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { step } from 'allure-js-commons';

import { AssetsPageElements } from '../pages/_elements/AssetsPageElements';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { SettingsPageElements } from '../pages/_elements/SettingsPageElements';
import { BaseAssetsPage } from '../pages/assetsPage/BaseAssetsPage';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';
import { BaseSettingsPage } from '../pages/settingsPage/BaseSettingsPage';

const assetsElements = new AssetsPageElements();
const loginElements = new LoginPageElements();
const settingsElements = new SettingsPageElements();

type DbFixture = 'transfers' | 'validations' | 'none';

type TestScopedFixtures = {
  page: Page;
  context: BrowserContext;
  assetsPage: BaseAssetsPage;
  loginPage: BaseLoginPage;
  settingsPage: BaseSettingsPage;
};

type WorkerScopedTestFixtures = {
  workerPage: Page;
  assetsPage: BaseAssetsPage;
  loginPage: BaseLoginPage;
  settingsPage: BaseSettingsPage;
};

type WorkerScopedWorkerFixtures = {
  workerContext: BrowserContext;
  workerPageState: { page: Page | null };
};

const DB_PATHS: Record<Exclude<DbFixture, 'none'>, string> = {
  transfers: 'transfers/transfers_tests_db.json',
  validations: 'validations/validations_tests_db.json',
};

async function applyInitFlags(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem('assethub_migration_modal_seen_kusama', 'true');
    localStorage.setItem('assethub_migration_modal_seen_polkadot', 'true');
  });
}

// =============================================================================
// BASE TEST - Test-scoped fixtures (fresh context/page per test)
// Used for: onboarding tests, tests that need isolated state
// =============================================================================
export const test = base.extend<TestScopedFixtures>({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      permissions: ['camera'],
    });
    await applyInitFlags(context);
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  },

  assetsPage: async ({ page }, use) => {
    await use(new BaseAssetsPage(page, assetsElements));
  },

  loginPage: async ({ page }, use) => {
    await use(new BaseLoginPage(page, loginElements));
  },

  settingsPage: async ({ page }, use) => {
    await use(new BaseSettingsPage(page, settingsElements));
  },
});

// =============================================================================
// WORKER-SCOPED TEST FACTORY - Shared context/page per worker
// Used for: transfers, validations (tests that share initialized state)
// =============================================================================
type WorkerFixtureConfig = {
  dbFixture: DbFixture;
  waitForConnections?: boolean;
  connectionTimeout?: number;
};

function createWorkerScopedFixture(config: WorkerFixtureConfig) {
  const { dbFixture, waitForConnections = true, connectionTimeout = 60_000 } = config;

  return base.extend<WorkerScopedTestFixtures, WorkerScopedWorkerFixtures>({
    workerContext: [
      async ({ browser }, use) => {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          permissions: ['camera'],
        });
        await applyInitFlags(context);
        await use(context);
        await context.close();
      },
      { scope: 'worker' },
    ],

    workerPageState: [
      // eslint-disable-next-line no-empty-pattern
      async ({}, use) => {
        const state: { page: Page | null } = { page: null };
        await use(state);
        await state.page?.close();
      },
      { scope: 'worker' },
    ],

    // Test-scoped: initializes the shared page on first call, retries if previous attempt failed
    workerPage: [
      async ({ workerContext, workerPageState }, use) => {
        if (!workerPageState.page) {
          const page = await workerContext.newPage();

          try {
            if (dbFixture !== 'none') {
              await new BaseLoginPage(page, loginElements).importDatabase(DB_PATHS[dbFixture]);
            }
            if (dbFixture !== 'none' && waitForConnections) {
              await new BaseSettingsPage(page, settingsElements).waitForNetworkConnections(connectionTimeout);
            }
            await new BaseAssetsPage(page, assetsElements).gotoMain();

            workerPageState.page = page;
          } catch (error) {
            await page.close();
            throw error;
          }
        }

        await use(workerPageState.page);
      },
      { timeout: connectionTimeout + 30_000 },
    ],

    // Wraps workerPage in page object, navigates to assets page before each test
    assetsPage: async ({ workerPage }, use) => {
      const assets = new BaseAssetsPage(workerPage, assetsElements);
      await step('Navigate to Assets page', async () => {
        await assets.gotoMain();
      });
      await use(assets);
    },

    loginPage: async ({ workerPage }, use) => {
      await use(new BaseLoginPage(workerPage, loginElements));
    },

    settingsPage: async ({ workerPage }, use) => {
      await use(new BaseSettingsPage(workerPage, settingsElements));
    },
  });
}

// Pre-configured worker-scoped fixtures for specific test suites
export const transfersTest = createWorkerScopedFixture({ dbFixture: 'transfers' });
export const validationsTest = createWorkerScopedFixture({ dbFixture: 'validations' });

// Helper to set up Allure test metadata
export const setupTestMetadata = async (feature: string, story: string): Promise<void> => {
  await allure.feature(feature);
  await allure.story(story);
  await allure.parentSuite('System tests');
  await allure.suite(feature);
  await allure.subSuite(story);
};

export { expect } from '@playwright/test';
