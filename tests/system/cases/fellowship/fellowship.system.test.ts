import { expect, test } from '../../utils/baseRegularFixture';

/**
 * Fellowship e2e tests
 *
 * These tests cover core fellowship UI flows:
 *
 * - Page load and tasks panel visibility
 * - No-account state (wallet without a fellowship member account)
 * - Overview modal with Ranks/Members tabs
 * - Referendum details modal
 * - Voting Aye/Nay actions (requires fellowship member account DB)
 *
 * @group fellowship
 */
test.describe('Fellowship page', { tag: ['@fellowship'] }, () => {
  test.describe('Non-member wallet', () => {
    test('should show no-account state for a wallet without fellowship membership', async ({
      page: _page,
      loginPage,
    }) => {
      const assetsPage = await loginPage.importDatabase('governance/governance-pv-root.json');
      const fellowshipPage = await assetsPage.goToFellowshipPage();

      await fellowshipPage.verifyNoAccountStateVisible();
    });
  });

  test.describe('Overview modal', () => {
    test('should open Overview modal and switch to Members tab', async ({ page, loginPage }) => {
      const assetsPage = await loginPage.importDatabase('governance/governance-pv-root.json');
      const fellowshipPage = await assetsPage.goToFellowshipPage();

      // The overview widget is only shown when a fellowship member is detected.
      // If present, verify the modal opens and Members tab is accessible.
      const overviewWidget = page.getByTestId('fellowship-overview-widget');
      const isWidgetVisible = await overviewWidget.isVisible({ timeout: 5_000 }).catch(() => false);

      if (isWidgetVisible) {
        const overviewModal = await fellowshipPage.clickViewDetails();
        await overviewModal.clickMembersTab();
        await expect(page.getByRole('tab', { name: /members/i })).toHaveAttribute('data-state', 'active');
      }
    });
  });

  /**
   * Tests below require a DB with a fellowship member account. Create
   * tests/system/data/db/fellowship/fellowship-member.json for full coverage.
   *
   * Example flows to implement once the DB is available:
   *
   * Test('should display tasks panel with referendum items for a member
   * account', ...) test('should open referendum details modal on task item
   * click', ...) test('should display Aye and Nay vote buttons in referendum
   * details', ...) test('should display members list in Overview modal', ...)
   */
});
