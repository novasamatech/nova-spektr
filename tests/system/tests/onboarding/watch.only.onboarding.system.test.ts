import { baseTestConfig } from '../../BaseTestConfig';
import { expect, test } from '../../utils/baseRegularFixture';

test.describe(
  'Watch only wallet onboarding',
  {
    tag: '@regress',
  },
  () => {
    test('Can add watch only wallet', async ({ loginPage, page }) => {
      const watchOnlyPage = await loginPage.gotoOnboarding().then((onboarding) => onboarding.clickWatchOnlyButton());
      const watchOnlyAssetsPage = await watchOnlyPage.createWatchOnlyAccount(
        baseTestConfig.test_name,
        baseTestConfig.test_address,
      );
      expect(await page.isVisible(watchOnlyAssetsPage.pageElements.assetsPageLocator)).toBeTruthy();
    });

    test('Link from info button lead to subscan', async ({ loginPage, page, context }) => {
      const watchOnlyPage = await loginPage.gotoOnboarding().then((onboarding) => onboarding.clickWatchOnlyButton());
      await watchOnlyPage
        .fillAccountAddress(baseTestConfig.test_address)
        .then((account) => account.clickFirstInfoButton());
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('link', { name: watchOnlyPage.pageElements.subscanLabel }).click(),
      ]);
      await newPage.waitForLoadState('load');

      expect(newPage.url()).toContain('subscan.io');
    });
  },
);
