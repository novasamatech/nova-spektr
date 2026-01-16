import { type BrowserContext, type Page, test as base } from '@playwright/test';
import { step } from 'allure-js-commons';
import * as allure from 'allure-js-commons';

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
  assetsPage: BaseAssetsPage;
  loginPage: BaseLoginPage;
  settingsPage: BaseSettingsPage;
};

type WorkerScopedWorkerFixtures = {
  workerContext: BrowserContext;
  workerPage: Page;
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
      permissions: [],
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
          permissions: [],
        });
        await applyInitFlags(context);
        await use(context);
        await context.close();
      },
      { scope: 'worker' },
    ],

    // Single page per worker - created once, initialized with DB and connections
    workerPage: [
      async ({ workerContext }, use) => {
        const page = await workerContext.newPage();

        // Step 1: Import database if needed
        if (dbFixture !== 'none') {
          const login = new BaseLoginPage(page, loginElements);
          await login.importDatabase(DB_PATHS[dbFixture]);
        }

        // Step 2: Wait for all network connections to be established
        if (dbFixture !== 'none' && waitForConnections) {
          const settings = new BaseSettingsPage(page, settingsElements);
          await settings.waitForNetworkConnections(connectionTimeout);
        }

        // Step 3: Navigate to assets page and wait for it to be ready
        const assets = new BaseAssetsPage(page, assetsElements);
        await assets.gotoMain();

        await use(page);
        await page.close();
      },
      { scope: 'worker' },
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
};

export { expect } from '@playwright/test';
