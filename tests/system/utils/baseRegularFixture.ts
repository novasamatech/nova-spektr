import { type BrowserContext, type Page, test as base } from '@playwright/test';
import { step } from 'allure-js-commons';

import { AssetsPageElements } from '../pages/_elements/AssetsPageElements';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { SettingsPageElements } from '../pages/_elements/SettingsPageElements';
import { BaseAssetsPage } from '../pages/assetsPage/BaseAssetsPage';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';
import { BaseSettingsPage } from '../pages/settingsPage/BaseSettingsPage';

// Shared element instances (stateless, reusable)
const assetsElements = new AssetsPageElements();
const loginElements = new LoginPageElements();
const settingsElements = new SettingsPageElements();

type DbFixture = 'transfers' | 'validations' | 'none';

type TestFixtures = {
  assetsPage: BaseAssetsPage;
  loginPage: BaseLoginPage;
  settingsPage: BaseSettingsPage;
};

type WorkerFixtures = {
  workerContext: BrowserContext;
  workerPage: Page;
};

type FixtureConfig = {
  dbFixture: DbFixture;
  /**
   * Whether to wait for network connections before running tests (default:
   * true)
   */
  waitForConnections?: boolean;
  /** Timeout for waiting for network connections in ms (default: 60000) */
  connectionTimeout?: number;
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

// Factory to create test fixture with specific database and options
function createTestFixture(config: FixtureConfig) {
  const { dbFixture, waitForConnections = true, connectionTimeout = 60_000 } = config;

  return base.extend<TestFixtures, WorkerFixtures>({
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

// Base test without database (for onboarding tests)
export const test = createTestFixture({ dbFixture: 'none', waitForConnections: false });

// Pre-configured fixtures for specific test suites (with connection waiting enabled)
export const transfersTest = createTestFixture({ dbFixture: 'transfers' });
export const validationsTest = createTestFixture({ dbFixture: 'validations' });

export { expect } from '@playwright/test';
