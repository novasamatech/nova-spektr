import { type BrowserContext, type Page, test as base } from '@playwright/test';
import { step } from 'allure-js-commons';

import { AssetsPageElements } from '../pages/_elements/AssetsPageElements';
import { LoginPageElements } from '../pages/_elements/LoginPageElements';
import { VaultAssetsPage } from '../pages/assetsPage/VaultAssetsPage';
import { BaseLoginPage } from '../pages/loginPage/BaseLoginPage';

const loginElements = new LoginPageElements();
const assetsElements = new AssetsPageElements();

type FeeTestFixtures = {
  vaultWallet: VaultAssetsPage;
};

type FeeWorkerFixtures = {
  _feeContext: BrowserContext;
  _feePageState: { page: Page | null };
};

function createFeeFixture(dbPath: string) {
  return base.extend<FeeTestFixtures, FeeWorkerFixtures>({
    _feeContext: [
      async ({ browser }, use) => {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          permissions: ['camera'],
        });
        await context.addInitScript(() => {
          localStorage.setItem('assethub_migration_modal_seen_kusama', 'true');
          localStorage.setItem('assethub_migration_modal_seen_polkadot', 'true');
        });
        await use(context);
        await context.close();
      },
      { scope: 'worker' },
    ],

    _feePageState: [
      // eslint-disable-next-line no-empty-pattern
      async ({}, use) => {
        const state: { page: Page | null } = { page: null };
        await use(state);
        await state.page?.close();
      },
      { scope: 'worker' },
    ],

    vaultWallet: [
      async ({ _feeContext, _feePageState }, use) => {
        if (!_feePageState.page) {
          const page = await _feeContext.newPage();
          try {
            await new BaseLoginPage(page, loginElements).importDatabase(dbPath);
            _feePageState.page = page;
          } catch (error) {
            await page.close();
            throw error;
          }
        }

        const assetsPage = new VaultAssetsPage(_feePageState.page, assetsElements);
        await step('Navigate to Assets page', () => assetsPage.gotoMain());
        await use(assetsPage);
      },
      { timeout: 90_000 },
    ],
  });
}

export const test = createFeeFixture('polkadotVaultWallet/pv-root.json');
export const ethTest = createFeeFixture('polkadotVaultWallet/pv-root-eth.json');

export { expect } from '@playwright/test';
