import { StakingDashboardPageElements } from '../../pages/_elements/StakingDashboardPageElements';
import { setupTestMetadata } from '../../utils/baseRegularFixture';
import { expect, stakingDashboardTest as test } from '../../utils/stakingDashboardFixture';

// Live-chain suite: ledgers, exposures, era timing and prices all stream in
// after onboarding, hence the generous per-test timeouts. Opt out of full
// parallelism so the tests of a describe block reuse the worker page.
test.describe.configure({ mode: 'default' });

const TEST_TIMEOUT = 240_000;
const LIVE_DATA_TIMEOUT = 120_000;

const elements = new StakingDashboardPageElements();

/**
 * Real, publicly known Polkadot Asset Hub stashes. Balances drift every era, so
 * every assertion below is on a _shape_ — a formatted amount, a status pill,
 * the `N of 16` nomination cap — never on a figure.
 */
const NOMINATOR_WALLET = {
  name: 'staking_nominator',
  // Large active nominator: 16 nominations (the chain cap), nothing unbonding.
  address: '13Xo4xYdMRQQoWD7TA9yCDHG1BXqQFvnjeGvU6LHhRhUsBhQ',
};

const UNBONDING_WALLET = {
  name: 'staking_unbonding',
  // Active nominator holding one long-matured unlocking chunk — redeemable.
  address: '12G1TaAHobt2qZ1zAPVmF122NrTMCDpC4nXuubddkQjTiScD',
};

const NON_STAKING_WALLET = {
  name: 'treasury_wallet',
  // Polkadot Treasury — funded, priced, and stakes nothing on any Asset Hub.
  address: '13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB',
};

test.describe('Staking dashboard — populated (watch-only nominator)', { tag: '@staking' }, () => {
  test.use({ stakingWallet: NOMINATOR_WALLET });

  test.beforeEach(async () => {
    await setupTestMetadata('Staking dashboard', 'Populated');
  });

  test('S1: KPI cards and the positions table describe the live position', async ({ stakingDashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);

    // --- Total staked: a fiat headline over a per-asset subline
    await expect(stakingDashboardPage.getKpiSubline('totalStaked')).toContainText(elements.amountPattern, {
      timeout: LIVE_DATA_TIMEOUT,
    });
    await expect(stakingDashboardPage.getKpiValue('totalStaked')).toContainText(elements.nonZeroFiatPattern, {
      timeout: LIVE_DATA_TIMEOUT,
    });

    // --- Est. APY: a percentage, not the em dash
    await expect(stakingDashboardPage.getKpiValue('apy')).toContainText(elements.percentPattern, {
      timeout: LIVE_DATA_TIMEOUT,
    });
    await expect(stakingDashboardPage.getKpiSubline('apy')).toContainText(/stake-weighted · [1-9]\d* earning position/);

    // --- Active nominations: a non-zero count over a non-zero position count
    await expect(stakingDashboardPage.getKpiValue('nominations')).toHaveText(/^[1-9]\d*$/, {
      timeout: LIVE_DATA_TIMEOUT,
    });
    await expect(stakingDashboardPage.getKpiSubline('nominations')).toContainText(/validators · [1-9]\d* position/);

    // --- Rewards card renders its window subline
    await expect(stakingDashboardPage.getKpiSubline('rewards')).toContainText(/\d+d$/);

    // --- Positions table
    const row = stakingDashboardPage.getPositionRows().first();
    await expect(row).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(row).toContainText(elements.amountPattern);
    await expect(row).toContainText(elements.activeStatusLabel);
    await expect(row).toContainText(elements.validatorsCellPattern);
    await expect(row).toContainText(elements.percentPattern);
    // A watch-only wallet marks its rows as view-only.
    await expect(row).toContainText(elements.viewOnlyLabel);
  });

  test('S2: position row opens the detail drawer with no actions for watch-only', async ({ stakingDashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);

    await expect(stakingDashboardPage.getPositionRows().first()).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });

    const drawer = await stakingDashboardPage.openPositionRow(0);

    // --- stats grid repeats every column of the row the user clicked
    for (const label of elements.drawerStatLabels) {
      await expect(drawer.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(drawer).toContainText(elements.validatorsCellPattern);
    await expect(drawer).toContainText(elements.amountPattern);

    // --- watch-only is stated, not implied
    await expect(drawer.getByText(elements.viewOnlyLabel, { exact: true })).toBeVisible();
    await expect(drawer.getByText(elements.watchOnlyNote)).toBeVisible();

    // --- and carries NO action chips at all. This is the design requirement:
    // actions are absent by design, never rendered disabled.
    await expect(drawer.getByRole('button', { name: elements.actionChipPattern })).toHaveCount(0);

    // --- nominations table
    await expect(drawer.getByText(elements.nominationsSectionTitle, { exact: true })).toBeVisible();
    await expect(drawer.locator(elements.tableRowSelector).first()).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(drawer).toContainText(elements.nominationsFooterPattern);

    await stakingDashboardPage.closeOverlay(drawer);
  });

  test('S3: rewards chart renders its controls and follows range/asset switches', async ({ stakingDashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);

    const panel = stakingDashboardPage.getPanel();
    const rangeSwitch = stakingDashboardPage.getRewardsRangeSwitch();
    const assetSwitch = stakingDashboardPage.getRewardsAssetSwitch();

    await expect(rangeSwitch).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(assetSwitch).toBeVisible();
    // The summary line names the active range; history itself may legitimately
    // be empty, so the bars are never asserted.
    await expect(panel).toContainText(elements.rangeSummaries['30d'], { timeout: LIVE_DATA_TIMEOUT });

    await stakingDashboardPage.selectRewardsRange('90d');
    await expect(rangeSwitch.getByRole('button', { name: '90d', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel).toContainText(elements.rangeSummaries['90d']);
    await expect(panel).not.toContainText(elements.rangeSummaries['30d']);

    const assetButtons = assetSwitch.getByRole('button');
    const assetCount = await assetButtons.count();
    expect(assetCount).toBeGreaterThan(0);

    if (assetCount > 1) {
      const label = await stakingDashboardPage.selectRewardsAsset(1);
      await expect(assetButtons.nth(1)).toHaveAttribute('aria-pressed', 'true');
      expect(label.length).toBeGreaterThan(0);
    }

    // Both switches survived: the card re-parameterised instead of erroring out.
    await expect(rangeSwitch).toBeVisible();
    await expect(assetSwitch).toBeVisible();
    await expect(panel).toContainText(elements.rangeSummaries['90d']);
  });

  test('S4: Est. APY and Active nominations cards open the breakdown modal', async ({ stakingDashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);

    await expect(stakingDashboardPage.getKpiValue('apy')).toContainText(elements.percentPattern, {
      timeout: LIVE_DATA_TIMEOUT,
    });

    const modal = stakingDashboardPage.getModal();

    await stakingDashboardPage.clickKpiCard('apy');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(elements.apyBreakdownTitle);
    await expect(modal.locator(elements.donutSelector)).toBeVisible();
    // One row per position: "<chain> · <amount>".
    await expect(modal).toContainText(new RegExp(`· ${elements.amountPattern.source}`));
    await stakingDashboardPage.closeOverlay(modal);

    await stakingDashboardPage.clickKpiCard('nominations');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(elements.nominationsBreakdownTitle);
    await expect(modal.locator(elements.donutSelector)).toBeVisible();
    await expect(modal).toContainText(/[1-9]\d* validators?/);
    await stakingDashboardPage.closeOverlay(modal);
  });
});

test.describe('Staking dashboard — matured unbonding chunk (watch-only)', { tag: '@staking' }, () => {
  test.use({ stakingWallet: UNBONDING_WALLET });

  test.beforeEach(async () => {
    await setupTestMetadata('Staking dashboard', 'Unbonding');
  });

  test('S5: Total staked footer surfaces the withdrawable chunk and its drill-down', async ({
    stakingDashboardPage,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    const footer = stakingDashboardPage.getKpiFooter('totalStaked');

    await expect(footer).toBeVisible({ timeout: LIVE_DATA_TIMEOUT });
    await expect(footer).toContainText(elements.unbondingFooterLabel);
    await expect(footer).toContainText(elements.amountPattern);
    await expect(footer).toContainText(elements.withdrawableChipPattern);
    await expect(footer.getByRole('button', { name: elements.redeemLinkLabel })).toBeVisible();

    await stakingDashboardPage.clickRedeemLink();

    const modal = stakingDashboardPage.getModal();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(elements.positionsModalTitle);
    await expect(modal).toContainText(elements.unbondingFooterLabel); // "Unbonding" column
    await expect(modal.locator(elements.donutSelector)).toBeVisible();
    await expect(modal.locator(elements.tableRowSelector).first()).toBeVisible();
    // The matured chunk shows up as a "ready" chip rather than a countdown.
    await expect(modal).toContainText(elements.readyChipPattern);

    await stakingDashboardPage.closeOverlay(modal);
  });
});

test.describe('Staking dashboard — empty state (watch-only)', { tag: '@staking' }, () => {
  test.use({ stakingWallet: NON_STAKING_WALLET });

  test.beforeEach(async () => {
    await setupTestMetadata('Staking dashboard', 'Empty state');
  });

  test('S6: an address that stakes nothing shows zeros and the empty panel', async ({ stakingDashboardPage }) => {
    test.setTimeout(TEST_TIMEOUT);

    const panel = stakingDashboardPage.getPanel();

    // --- resolved, not loading: an em dash is an answer, a shimmer is not
    await expect(stakingDashboardPage.getKpiValue('apy')).toHaveText(elements.emDash, { timeout: LIVE_DATA_TIMEOUT });
    await expect(stakingDashboardPage.getKpiSubline('totalStaked')).toHaveText(elements.emDash);
    await expect(stakingDashboardPage.getKpiValue('totalStaked')).toContainText('0');
    await expect(stakingDashboardPage.getKpiSubline('nominations')).toContainText(/validators · 0 position/);

    for (const card of ['totalStaked', 'apy', 'nominations', 'rewards'] as const) {
      await expect(stakingDashboardPage.getKpiSkeletons(card)).toHaveCount(0);
    }

    // --- nothing to act on, so no call-to-action strips
    await expect(stakingDashboardPage.getKpiCard('totalStaked')).not.toContainText(elements.unbondingFooterLabel);

    // --- empty panel with its CTA
    await expect(panel.getByText(elements.emptyTitle, { exact: true })).toBeVisible();
    // `exact` matters: the dnd-kit widget wrapper is itself a role="button"
    // whose accessible name swallows every label inside the widget.
    await expect(panel.getByRole('button', { name: elements.emptyActionLabel, exact: true })).toBeVisible();
    await expect(panel.getByText(elements.emptyLearnMoreLabel, { exact: true })).toBeVisible();
    await expect(stakingDashboardPage.getPositionRows()).toHaveCount(0);
  });
});
