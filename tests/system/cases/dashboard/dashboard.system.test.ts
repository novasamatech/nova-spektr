import { setupTestMetadata } from '../../utils/baseRegularFixture';
import { dashboardTest as test, expect } from '../../utils/dashboardFixture';

// Live-chain suite: balances and prices stream in after onboarding (block
// polling is 60s), hence the generous per-test timeouts. Opt out of full
// parallelism so tests reuse the worker page sequentially.
test.describe.configure({ mode: 'default' });

const TEST_TIMEOUT = 240_000;
const LIVE_DATA_TIMEOUT = 120_000;

const TREASURY_WALLET = {
  name: 'treasury_wallet',
  // Polkadot Treasury: priced balances across chains
  address: '13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB',
};

test.describe('Dashboard Portfolio Overview (Treasury watch-only)', { tag: '@dashboard' }, () => {
  test.use({ dashboardWallet: TREASURY_WALLET });

  test.beforeEach(async () => {
    await setupTestMetadata('Dashboard', 'Portfolio Overview');
  });

  test('S1: renders fiat total, view toggle, distribution chips and holdings list', async ({ dashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);
    const page = dashboardPage.getPage();

    await expect(dashboardPage.getBalanceTypeChip('transferable')).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(page.getByText(dashboardPage.pageElements.distributionLabel)).toBeVisible();
    await expect(
      page.getByRole('button', { name: dashboardPage.pageElements.assetsToggleLabel, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: dashboardPage.pageElements.networksToggleLabel, exact: true }),
    ).toBeVisible();

    // non-zero fiat total right below the widget title
    await expect(dashboardPage.getPortfolioTotal()).toContainText(/\$[0-9,.]*[1-9]/, { timeout: LIVE_DATA_TIMEOUT });

    const firstRow = dashboardPage.getHoldingRows().first();
    await expect(firstRow).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(firstRow).toContainText(/\d+\.\d%/); // share percent
  });

  test('S2: balance type chip cross-filters holdings and "Show all" resets', async ({ dashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);
    const chip = dashboardPage.getBalanceTypeChip('transferable');
    const showAll = dashboardPage.getShowAllButton();

    await expect(chip).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(showAll).toHaveCSS('opacity', '0');

    await dashboardPage.clickBalanceTypeChip('transferable');
    await expect(chip).toHaveClass(/bg-hover/);
    await expect(showAll).toHaveCSS('opacity', '1');

    await dashboardPage.clickShowAll();
    await expect(chip).not.toHaveClass(/bg-hover/);
    await expect(showAll).toHaveCSS('opacity', '0');
  });

  test('S3: Assets/Networks toggle switches the holdings list', async ({ dashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);
    const page = dashboardPage.getPage();

    await expect(dashboardPage.getHoldingRows().first()).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(page.getByText(dashboardPage.pageElements.holdingsByAssetLabel)).toBeVisible();

    await dashboardPage.switchHoldingsView('networks');
    await expect(page.getByText(dashboardPage.pageElements.holdingsByChainLabel)).toBeVisible();
    await expect(page.getByText(dashboardPage.pageElements.holdingsByAssetLabel)).toBeHidden();

    await dashboardPage.switchHoldingsView('assets');
    await expect(page.getByText(dashboardPage.pageElements.holdingsByAssetLabel)).toBeVisible();
  });

  test('S4: holdings row opens the asset details modal', async ({ dashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);

    await expect(dashboardPage.getHoldingRows().first()).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });

    const detailsModal = await dashboardPage.openFirstHoldingDetails();
    const dialog = detailsModal.getDialog();

    await expect(dialog).toContainText(detailsModal.pageElements.titlePattern);
    await expect(dialog).toContainText(detailsModal.pageElements.addressColumn);
    await expect(dialog).toContainText(detailsModal.pageElements.holdingsColumn);
    await expect(dialog).toContainText(detailsModal.pageElements.allocationColumn);

    await detailsModal.close();
    await expect(dialog).toBeHidden();
  });
});
