import { type Page } from '@playwright/test';
import * as allure from 'allure-js-commons';

import { baseTestConfig } from '../../BaseTestConfig';
import { expect, test } from '../../utils/baseRegularFixture';

test.describe(
  'Watch only wallet onboarding',
  {
    tag: '@regress',
  },
  () => {
    test('Can add watch only wallet', async ({ loginPage, page }) => {
      await allure.feature('Onboarding');
      await allure.story('Onboarding via Watch-only');
      const watchOnlyPage = await loginPage.gotoOnboarding().then((onboarding) => onboarding.clickWatchOnlyButton());
      const watchOnlyAssetsPage = await watchOnlyPage.createWatchOnlyAccount(
        baseTestConfig.test_name,
        baseTestConfig.test_address,
      );
      expect(await page.isVisible(watchOnlyAssetsPage.pageElements.assetsPageLocator)).toBeTruthy();
    });

    test('Link from info button lead to subscan', async ({ loginPage, page, context }) => {
      await allure.feature('Onboarding');
      await allure.story('Onboarding via Watch-only');
      const watchOnlyPage = await loginPage.gotoOnboarding().then((onboarding) => onboarding.clickWatchOnlyButton());
      await watchOnlyPage
        .fillAccountAddress(baseTestConfig.test_address)
        .then((account) => account.clickFirstInfoButton());

      let newPage: Page;

      await allure.step('Click on Subscan link', async () => {
        [newPage] = await Promise.all([
          context.waitForEvent('page'),
          page.getByRole('link', { name: watchOnlyPage.pageElements.subscanLabel }).click(),
        ]);
      });

      await allure.step('Wait for the new page to load', async () => {
        await newPage.waitForLoadState('domcontentloaded');
      });

      await allure.step('Verify the new page URL contains "subscan.io"', async () => {
        expect(newPage.url()).toContain('subscan.io');
      });
    });
  },
);
