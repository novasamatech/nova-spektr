import { $features } from '@/shared/config/features';
import { accounts } from '@/domains/network';
import { era, payouts } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { stakingPositions } from '@/aggregates/staking-positions';
import { dashboardStakingKpiActions } from '@/features/dashboard-staking-kpi';
import { positionActions } from '@/features/dashboard-staking-positions';
import { createDraftModel } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { stakingAmountFlow } from '@/features/staking-amount-flow';
import { claimRewardsModel } from '@/features/staking-claim-rewards';

import { createDraftToast } from './draft-toast';
import { createStakingDashboardActions } from './wiring';

/**
 * The single instance, bound to the real units.
 *
 * Kept out of the feature's `index.tsx` so the toast view can reach it without
 * importing the barrel that renders the toast — the load-time cycle that leaves
 * a factory observably `undefined` during init.
 */
export const stakingDashboardActions = createStakingDashboardActions({
  sources: {
    $chains: networkModel.$chains,
    $accounts: accounts.$list,
    $wallets: walletModel.$wallets,
    $positions: stakingPositions.$positions,
    $eras: era.eraResource.$cache,
    $payoutsCache: payouts.payoutsResource.$cache,
  },
  kpi: {
    claimRequested: dashboardStakingKpiActions.claimRequested,
    unbondRequested: dashboardStakingKpiActions.unbondRequested,
    enableActions: dashboardStakingKpiActions.enableActions,
  },
  positions: {
    claimRequested: positionActions.events.claimRequested,
    addStakeRequested: positionActions.events.addStakeRequested,
    unbondRequested: positionActions.events.unbondRequested,
    startStakingRequested: positionActions.events.startStakingRequested,
    actionsWired: positionActions.actionsWired,
  },
  claimFlow: {
    claimRequested: claimRewardsModel.claimRequested,
    rewardsClaimed: claimRewardsModel.rewardsClaimed,
    flowFinished: claimRewardsModel.flowFinished,
  },
  amountFlow: {
    unbondRequested: stakingAmountFlow.unbondRequested,
    addStakeRequested: stakingAmountFlow.addStakeRequested,
    $enabled: $features.map(({ staking }) => staking),
  },
  navigateTo: navigationModel.events.navigateTo,
});

export const draftToast = createDraftToast({
  claimFlow: {
    saveAsDraftRequested: claimRewardsModel.saveAsDraftRequested,
    claimRequested: claimRewardsModel.claimRequested,
    $initiatedDraft: claimRewardsModel.$initiatedDraft,
    $chain: claimRewardsModel.$chain,
    $asset: claimRewardsModel.$asset,
    $totalAmount: claimRewardsModel.$totalAmount,
    $initiator: claimRewardsModel.$initiator,
    $draftSigningPath: claimRewardsModel.$draftSigningPath,
  },
  amountFlow: {
    saveAsDraftRequested: stakingAmountFlow.saveAsDraftRequested,
    flowStarted: stakingAmountFlow.flowStarted,
    $initiatedDraft: stakingAmountFlow.$initiatedDraft,
    $mode: stakingAmountFlow.$mode,
    $chain: stakingAmountFlow.$chain,
    $asset: stakingAmountFlow.$asset,
    $amountPlanck: stakingAmountFlow.$amountPlanck,
    $initiator: stakingAmountFlow.$initiator,
    $draftSigningPath: stakingAmountFlow.$draftSigningPath,
  },
  $accounts: accounts.$list,
  $wallets: walletModel.$wallets,
  draftCreated: createDraftModel.draftCreated,
});
