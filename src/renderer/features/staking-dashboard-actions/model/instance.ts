import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { ZERO_BALANCE } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { era, payouts } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { stakingPositions } from '@/aggregates/staking-positions';
import { walletSelect } from '@/aggregates/wallet-select';
import { dashboardStakingKpiActions } from '@/features/dashboard-staking-kpi';
import { positionActions } from '@/features/dashboard-staking-positions';
import { createDraftModel } from '@/features/drafts';
import { stakingAmountFlow } from '@/features/staking-amount-flow';
import { claimRewardsModel } from '@/features/staking-claim-rewards';
import { stakingConfirmFlow } from '@/features/staking-confirm-flow';
import { stakingNewPositionFlow } from '@/features/staking-new-position-flow';
import { stakingPayeeFlow } from '@/features/staking-payee-flow';

import { type DraftToastOperation, createDraftToast } from './draft-toast';
import { createStakingDashboardActions } from './wiring';

/** Both flow-backed groups of chips follow the same dev flag. */
const $stakingEnabled = $features.map(({ staking }) => staking);

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
    $selectedWalletId: walletSelect.$selectedWalletId,
    $positions: stakingPositions.$positions,
    $eras: era.eraResource.$cache,
    $payoutsCache: payouts.payoutsResource.$cache,
  },
  kpi: {
    claimRequested: dashboardStakingKpiActions.claimRequested,
    redeemRequested: dashboardStakingKpiActions.redeemRequested,
    unbondRequested: dashboardStakingKpiActions.unbondRequested,
    enableActions: dashboardStakingKpiActions.enableActions,
    claimBlocked: dashboardStakingKpiActions.claimBlocked,
  },
  positions: {
    claimRequested: positionActions.events.claimRequested,
    addStakeRequested: positionActions.events.addStakeRequested,
    unbondRequested: positionActions.events.unbondRequested,
    changeRewardDestinationRequested: positionActions.events.changeRewardDestinationRequested,
    nominationsChangeRequested: positionActions.events.nominationsChangeRequested,
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
    $enabled: $stakingEnabled,
  },
  confirmFlow: {
    changeValidatorsRequested: stakingConfirmFlow.changeValidatorsRequested,
    redeemRequested: stakingConfirmFlow.redeemRequested,
    $enabled: $stakingEnabled,
  },
  newPositionFlow: {
    newPositionRequested: stakingNewPositionFlow.newPositionRequested,
    $enabled: $stakingEnabled,
  },
  payeeFlow: {
    changeRewardDestinationRequested: stakingPayeeFlow.changeRewardDestinationRequested,
    $enabled: $stakingEnabled,
  },
});

/**
 * Both of these flows serve exactly one operation, so their "mode" is a
 * constant.
 */
const $claimOperation = createStore<DraftToastOperation | null>('claim');
const $newPositionOperation = createStore<DraftToastOperation | null>('newPosition');
const $payeeOperation = createStore<DraftToastOperation | null>('changeRewardDestination');
/** `set_payee` moves nothing; the toast line names no amount for it. */
const $payeeAmount = createStore(ZERO_BALANCE);

export const draftToast = createDraftToast({
  flows: [
    {
      saveAsDraftRequested: claimRewardsModel.saveAsDraftRequested,
      flowStarted: claimRewardsModel.claimRequested,
      $initiatedDraft: claimRewardsModel.$initiatedDraft,
      $operation: $claimOperation,
      $chain: claimRewardsModel.$chain,
      $asset: claimRewardsModel.$asset,
      $amount: claimRewardsModel.$totalAmount,
      $initiator: claimRewardsModel.$initiator,
      $draftSigningPath: claimRewardsModel.$draftSigningPath,
    },
    {
      saveAsDraftRequested: stakingAmountFlow.saveAsDraftRequested,
      flowStarted: stakingAmountFlow.flowStarted,
      $initiatedDraft: stakingAmountFlow.$initiatedDraft,
      $operation: stakingAmountFlow.$mode,
      $chain: stakingAmountFlow.$chain,
      $asset: stakingAmountFlow.$asset,
      $amount: stakingAmountFlow.$amountPlanck.map((amount) => amount.toString()),
      $initiator: stakingAmountFlow.$initiator,
      $draftSigningPath: stakingAmountFlow.$draftSigningPath,
    },
    {
      saveAsDraftRequested: stakingNewPositionFlow.saveAsDraftRequested,
      flowStarted: stakingNewPositionFlow.newPositionRequested,
      $initiatedDraft: stakingNewPositionFlow.$initiatedDraft,
      $operation: $newPositionOperation,
      $chain: stakingNewPositionFlow.$chain,
      $asset: stakingNewPositionFlow.$asset,
      $amount: stakingNewPositionFlow.$amountPlanck.map((amount) => amount.toString()),
      $initiator: stakingNewPositionFlow.$initiator,
      $draftSigningPath: stakingNewPositionFlow.$draftSigningPath,
    },
    {
      saveAsDraftRequested: stakingConfirmFlow.saveAsDraftRequested,
      flowStarted: stakingConfirmFlow.flowStarted,
      $initiatedDraft: stakingConfirmFlow.$initiatedDraft,
      $operation: stakingConfirmFlow.$mode,
      $chain: stakingConfirmFlow.$chain,
      $asset: stakingConfirmFlow.$asset,
      $amount: stakingConfirmFlow.$amount,
      $initiator: stakingConfirmFlow.$initiator,
      $draftSigningPath: stakingConfirmFlow.$draftSigningPath,
    },
    {
      saveAsDraftRequested: stakingPayeeFlow.saveAsDraftRequested,
      flowStarted: stakingPayeeFlow.flowStarted,
      $initiatedDraft: stakingPayeeFlow.$initiatedDraft,
      $operation: $payeeOperation,
      $chain: stakingPayeeFlow.$chain,
      $asset: stakingPayeeFlow.$asset,
      $amount: $payeeAmount,
      $initiator: stakingPayeeFlow.$initiator,
      $draftSigningPath: stakingPayeeFlow.$draftSigningPath,
    },
  ],
  $accounts: accounts.$list,
  $wallets: walletModel.$wallets,
  draftCreated: createDraftModel.draftCreated,
});
