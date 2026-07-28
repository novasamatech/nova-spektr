import { type BrowserContext, type Page, test as base } from '@playwright/test';
import { step } from 'allure-js-commons';

import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { StakingDashboardPageElements } from '../pages/_elements/StakingDashboardPageElements';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';
import { StakingDashboardPage } from '../pages/stakingDashboardPage/StakingDashboardPage';

import { applyInitFlags } from './baseRegularFixture';

export type StakingWalletConfig = {
  name: string;
  address: string;
};

type WalletSession = {
  context: BrowserContext;
  page: Page;
};

type TestScopedFixtures = {
  stakingWallet: StakingWalletConfig;
  stakingDashboardPage: StakingDashboardPage;
};

type WorkerScopedFixtures = {
  stakingSessions: Map<string, WalletSession>;
};

const stakingElements = new StakingDashboardPageElements();
const loginElements = new LoginPageElements();

/**
 * Mirrors `dashboardFixture`: one watch-only wallet per browser context,
 * onboarded once per worker and shared between the tests of a describe block.
 * The dashboard aggregates every wallet of a profile, so two staking wallets
 * must never share a context — hence the per-address session map.
 *
 * Configure the wallet per describe block via `test.use({ stakingWallet: {
 * name, address } })`.
 */
export const stakingDashboardTest = base.extend<TestScopedFixtures, WorkerScopedFixtures>({
  stakingWallet: [{ name: '', address: '' }, { option: true }],

  stakingSessions: [
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

  stakingDashboardPage: [
    async ({ browser, stakingSessions, stakingWallet }, use) => {
      if (!stakingWallet.address) {
        throw new Error('Provide a wallet via test.use({ stakingWallet: { name, address } })');
      }

      let session = stakingSessions.get(stakingWallet.address);
      if (!session) {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          permissions: ['camera'],
        });

        try {
          await applyInitFlags(context);
          const page = await context.newPage();

          await step(`Onboard watch-only wallet "${stakingWallet.name}"`, async () => {
            const loginPage = new BaseLoginPage(page, loginElements);
            await loginPage.gotoOnboarding();
            const watchOnlyPage = await loginPage.clickWatchOnlyButton();
            await watchOnlyPage.createWatchOnlyAccount(stakingWallet.name, stakingWallet.address);
          });

          session = { context, page };
          stakingSessions.set(stakingWallet.address, session);
        } catch (error) {
          await context.close();
          throw error;
        }
      }

      const staking = new StakingDashboardPage(session.page, stakingElements);
      await staking.gotoStakingTab();
      await use(staking);
    },
    { timeout: 120_000 },
  ],
});

export { expect } from '@playwright/test';
