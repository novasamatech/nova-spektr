import { type BasePageElements } from './BasePageElements';

/**
 * The four cards of `features/dashboard-staking-kpi`, keyed by their
 * aria-label.
 */
export type StakingKpiCard = 'totalStaked' | 'apy' | 'nominations' | 'rewards';

export type RewardsRange = '7d' | '30d' | '90d' | '1y';

export class StakingDashboardPageElements implements BasePageElements {
  url = '/#/dashboard';

  stakingTabLabel = 'Staking';

  // --- KPI row -------------------------------------------------------------
  // Each KpiCard is a role="button" carrying its title as aria-label, which is
  // the only exact hook the row exposes.
  kpiTitles: Record<StakingKpiCard, string> = {
    totalStaked: 'Total staked',
    apy: 'Est. APY',
    nominations: 'Active nominations',
    rewards: 'Rewards',
  };

  unbondingFooterLabel = 'Unbonding';
  withdrawableChipPattern = /\d+ withdrawable/;
  redeemLinkLabel = 'Redeem →';

  apyBreakdownTitle = 'Estimated APY breakdown';
  nominationsBreakdownTitle = 'Active nominations breakdown';
  positionsModalTitle = 'Staking positions';
  /** Green chip of a fully matured unbonding chunk: `{amount} ready`. */
  readyChipPattern = /ready/;

  // --- Positions widget ----------------------------------------------------
  positionsTitle = 'Positions';
  activeStatusLabel = 'Active';
  /** `{active} of {total}` — 16 is the chain-wide nomination cap. */
  validatorsCellPattern = /\d+ of 16/;
  percentPattern = /\d+\.\d%/;
  viewOnlyLabel = 'view only';

  emptyTitle = 'No staking positions yet';
  emptyActionLabel = 'Start staking';
  emptyLearnMoreLabel = 'Learn how staking works';

  // --- Position detail drawer ----------------------------------------------
  drawerStatLabels = ['Staked', 'Status', 'Est. APY', 'Share of chain', 'Unclaimed', 'Validators'];
  watchOnlyNote = 'Watch-only account — data only';
  nominationsSectionTitle = 'Nominations';
  nominationsFooterPattern = /\d+ nominations · \d+ active/;
  /** Every action chip the drawer can offer — none may exist for watch-only. */
  actionChipPattern = /^(Claim|Add stake|Unbond|Change validators)/;

  // --- Rewards chart -------------------------------------------------------
  rewardsAssetSwitchLabel = 'Rewards asset';
  rewardsRangeSwitchLabel = 'Rewards period';
  rangeSummaries: Record<RewardsRange, string> = {
    '7d': 'last 7 days',
    '30d': 'last 30 days',
    '90d': 'last 90 days',
    '1y': 'last 12 months',
  };

  // --- Shared shapes -------------------------------------------------------
  /** `8.1M DOT`, `71.2K KSM`, `12.34 WND` — never an exact live figure. */
  amountPattern = /[\d.,]+\s*[KMBT]?\s*(DOT|KSM|WND)/;
  /** A fiat total with at least one non-zero digit. */
  nonZeroFiatPattern = /\$[\d,.]*[1-9]/;
  emDash = '—';

  // ui-kit `Modal` and `Drawer` render these testIds by default.
  modalTestId = 'Modal';
  drawerTestId = 'Drawer';
  /** Shimmer marker of `shared/ui-kit/Skeleton`. */
  skeletonSelector = '.spektr-skeleton';
  /** Rows of `shared/ui-kit/Table`. */
  tableRowSelector = 'tr.table-row';
  /** Recharts root of the breakdown donut. */
  donutSelector = 'svg.recharts-surface';
}
