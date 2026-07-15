import { type BrowserContext, type Page, test as base } from '@playwright/test';
import { step } from 'allure-js-commons';

import { DashboardPageElements } from '../pages/_elements/DashboardPageElements';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { BaseDashboardPage } from '../pages/dashboardPage/BaseDashboardPage';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';

import { applyInitFlags } from './baseRegularFixture';

export type DashboardWalletConfig = {
  name: string;
  address: string;
};

type WalletSession = {
  context: BrowserContext;
  page: Page;
};

type TestScopedFixtures = {
  dashboardWallet: DashboardWalletConfig;
  dashboardPage: BaseDashboardPage;
};

type WorkerScopedFixtures = {
  dashboardSessions: Map<string, WalletSession>;
};

const dashboardElements = new DashboardPageElements();
const loginElements = new LoginPageElements();

/**
 * Dashboard suites onboard a watch-only wallet once per worker and share the
 * page between tests. Each wallet gets an isolated browser context (the
 * dashboard aggregates every wallet in a profile, so wallets must not mix).
 * Configure the wallet per describe block via `test.use({ dashboardWallet })`.
 */
export const dashboardTest = base.extend<TestScopedFixtures, WorkerScopedFixtures>({
  dashboardWallet: [{ name: '', address: '' }, { option: true }],

  dashboardSessions: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const sessions = new Map<string, WalletSession>();
      await use(sessions);
      for (const session of sessions.values()) {
        await session.context.close();
      }
    },
    { scope: 'worker' },
  ],

  // Onboards the watch-only wallet on first use per worker, then navigates to the dashboard
  dashboardPage: [
    async ({ browser, dashboardSessions, dashboardWallet }, use) => {
      if (!dashboardWallet.address) {
        throw new Error('Provide a wallet via test.use({ dashboardWallet: { name, address } })');
      }

      let session = dashboardSessions.get(dashboardWallet.address);
      if (!session) {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          permissions: ['camera'],
        });

        try {
          await applyInitFlags(context);
          const page = await context.newPage();

          await step(`Onboard watch-only wallet "${dashboardWallet.name}"`, async () => {
            const loginPage = new BaseLoginPage(page, loginElements);
            await loginPage.gotoOnboarding();
            const watchOnlyPage = await loginPage.clickWatchOnlyButton();
            await watchOnlyPage.createWatchOnlyAccount(dashboardWallet.name, dashboardWallet.address);
          });

          session = { context, page };
          dashboardSessions.set(dashboardWallet.address, session);
        } catch (error) {
          await context.close();
          throw error;
        }
      }

      const dashboard = new BaseDashboardPage(session.page, dashboardElements);
      await dashboard.gotoDashboard();
      await use(dashboard);
    },
    { timeout: 120_000 },
  ],
});

export { expect } from '@playwright/test';
