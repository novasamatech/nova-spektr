import { type Event, type EventCallable, type Store, createEffect, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { type AnyAccount } from '@/domains/network';
import { type StakingPosition, type UnclaimedPayouts } from '@/domains/staking';
import {
  type ClaimRequestPayload,
  type RedeemRequestPayload,
  type StakingKpiAction,
  type UnbondRequestPayload,
} from '@/features/dashboard-staking-kpi';
import {
  type ClaimPayload,
  type NominationsChangePayload,
  type PositionAction,
  type PositionActionPayload,
} from '@/features/dashboard-staking-positions';
import { type AmountFlowTarget } from '@/features/staking-amount-flow';
import { type ClaimRequest } from '@/features/staking-claim-rewards';
import { type ChangeValidatorsTarget, type RedeemTarget } from '@/features/staking-confirm-flow';
import {
  groupRequestsByChain,
  readPayouts,
  resolveAmountFlowTarget,
  resolveClaimRequests,
  resolveRedeemTarget,
} from '../lib/resolve';

/**
 * Every unit this module talks to, injected rather than imported.
 *
 * The wiring is the one place in the app that knows both the dashboard's
 * emitters and the staking flows' entry points, and it is worth being able to
 * test that knowledge without dragging either side's UI into a test run. The
 * feature's `index.tsx` binds the real units; a test binds stand-ins.
 */
export type StakingDashboardActionsDeps = {
  sources: {
    $chains: Store<Record<ChainId, Chain>>;
    $accounts: Store<AnyAccount[]>;
    $wallets: Store<Wallet[]>;
    $positions: Store<StakingPosition[]>;
    /** Active era per chain — half of the unclaimed-payout cache key. */
    $eras: Store<Record<ChainId, number>>;
    $payoutsCache: Store<Record<string, UnclaimedPayouts>>;
  };
  kpi: {
    claimRequested: Event<ClaimRequestPayload>;
    redeemRequested: Event<RedeemRequestPayload>;
    unbondRequested: Event<UnbondRequestPayload>;
    enableActions: EventCallable<StakingKpiAction[]>;
  };
  positions: {
    claimRequested: Event<ClaimPayload>;
    addStakeRequested: Event<PositionActionPayload>;
    unbondRequested: Event<PositionActionPayload>;
    nominationsChangeRequested: Event<NominationsChangePayload>;
    startStakingRequested: Event<void>;
    actionsWired: EventCallable<PositionAction[]>;
  };
  claimFlow: {
    claimRequested: EventCallable<ClaimRequest[]>;
    /** A claim that landed on chain. */
    rewardsClaimed: Event<unknown>;
    flowFinished: Event<void>;
  };
  amountFlow: {
    unbondRequested: EventCallable<AmountFlowTarget>;
    addStakeRequested: EventCallable<AmountFlowTarget>;
    /** The amount flow lives behind the `staking` flag; its chips follow it. */
    $enabled: Store<boolean>;
  };
  confirmFlow: {
    changeValidatorsRequested: EventCallable<ChangeValidatorsTarget>;
    redeemRequested: EventCallable<RedeemTarget>;
    /** Behind the same `staking` flag as the amount flow. */
    $enabled: Store<boolean>;
  };
  navigateTo: EventCallable<string>;
};

/** What the position drawer's Claim chip leaves out: the payouts themselves. */
function buildPositionClaimRequest(
  payload: ClaimPayload,
  eras: Record<ChainId, number>,
  cache: Record<string, UnclaimedPayouts>,
): ClaimRequest | null {
  const { chain, asset, account, wallet, position } = payload;
  if (nullable(account) || nullable(wallet)) return null;

  const payouts = readPayouts(position.accountId, chain.chainId, eras, cache);
  if (payouts.length === 0) return null;

  return { chain, asset, account, wallet, payouts };
}

export const createStakingDashboardActions = ({
  sources,
  kpi,
  positions,
  claimFlow,
  amountFlow,
  confirmFlow,
  navigateTo,
}: StakingDashboardActionsDeps) => {
  /** Fired once by the host, so gating is observable inside a forked scope. */
  const wire = createEvent();

  // --- claim ---------------------------------------------------------------
  //
  // The claim flow signs on one network at a time. A KPI selection spanning two
  // chains is therefore two sessions, run back to back: the first group is
  // dispatched now, the rest wait in a queue that only advances once a claim
  // has actually landed. Cancelling means cancelling — the queue is dropped
  // rather than re-opening a modal the user just dismissed.

  /**
   * Every dispatch goes through an effect, never straight into the flow.
   *
   * The queue advances on `flowFinished`, and the flow resets its own selection
   * and step on that very event; handing it a new request inside the same tick
   * would race those resets. An effect puts the new session in a later tick,
   * after the old one has finished tearing itself down.
   */
  const dispatchClaimFx = createEffect((requests: ClaimRequest[]) => requests);

  sample({
    clock: dispatchClaimFx.doneData,
    target: claimFlow.claimRequested,
  });

  /** Chain groups still owed to the user, in the order they were resolved. */
  const $claimQueue = createStore<ClaimRequest[][]>([]);

  /** Whether the running session put anything on chain. */
  const $claimLanded = createStore(false)
    .on(claimFlow.rewardsClaimed, () => true)
    .reset(dispatchClaimFx.doneData);

  const claimGroups = sample({
    clock: kpi.claimRequested,
    source: {
      chains: sources.$chains,
      accounts: sources.$accounts,
      wallets: sources.$wallets,
    },
    fn: (resolution, { requests }) => groupRequestsByChain(resolveClaimRequests(requests, resolution)),
  });

  sample({
    clock: claimGroups,
    fn: (groups) => groups.slice(1),
    target: $claimQueue,
  });

  sample({
    clock: claimGroups.filterMap((groups) => groups.at(0)),
    target: dispatchClaimFx,
  });

  const positionClaim = sample({
    clock: positions.claimRequested,
    source: { eras: sources.$eras, cache: sources.$payoutsCache },
    fn: ({ eras, cache }, payload) => buildPositionClaimRequest(payload, eras, cache),
  }).filterMap((request) => request ?? undefined);

  // A position is one chain by construction, so it never queues anything — but
  // it must still clear whatever a previous KPI selection left behind.
  sample({
    clock: positionClaim,
    fn: () => [],
    target: $claimQueue,
  });

  sample({
    clock: positionClaim,
    fn: (request) => [request],
    target: dispatchClaimFx,
  });

  const claimSessionEnded = sample({
    clock: claimFlow.flowFinished,
    source: { queue: $claimQueue, landed: $claimLanded },
  });

  sample({
    clock: claimSessionEnded,
    fn: ({ queue, landed }) => (landed ? queue.slice(1) : []),
    target: $claimQueue,
  });

  sample({
    clock: claimSessionEnded.filterMap(({ queue, landed }) => (landed ? queue.at(0) : undefined)),
    target: dispatchClaimFx,
  });

  // --- amount flow ---------------------------------------------------------
  //
  // `PositionActionPayload` is a structural superset of `AmountFlowTarget`, so
  // the drawer's chips need no mapping at all — the payload the user pressed on
  // is the payload the flow opens with.

  sample({ clock: positions.unbondRequested, target: amountFlow.unbondRequested });
  sample({ clock: positions.addStakeRequested, target: amountFlow.addStakeRequested });

  const kpiUnbondTarget = sample({
    clock: kpi.unbondRequested,
    source: {
      chains: sources.$chains,
      accounts: sources.$accounts,
      wallets: sources.$wallets,
      positions: sources.$positions,
    },
    fn: ({ positions: allPositions, ...resolution }, payload) =>
      resolveAmountFlowTarget(payload, allPositions, resolution),
  }).filterMap((target) => target ?? undefined);

  sample({ clock: kpiUnbondTarget, target: amountFlow.unbondRequested });

  // --- confirm flow --------------------------------------------------------
  //
  // `NominationsChangePayload` is a structural superset of
  // `ChangeValidatorsTarget`, so the picker's submit needs no mapping: the set
  // the user built is the set the confirm opens with.

  sample({ clock: positions.nominationsChangeRequested, target: confirmFlow.changeValidatorsRequested });

  const kpiRedeemTarget = sample({
    clock: kpi.redeemRequested,
    source: {
      chains: sources.$chains,
      accounts: sources.$accounts,
      wallets: sources.$wallets,
      positions: sources.$positions,
    },
    fn: ({ positions: allPositions, ...resolution }, payload) => resolveRedeemTarget(payload, allPositions, resolution),
  }).filterMap((target) => target ?? undefined);

  sample({ clock: kpiRedeemTarget, target: confirmFlow.redeemRequested });

  // --- start staking -------------------------------------------------------
  //
  // A real destination rather than a modal of its own: bonding a new stash is
  // the Staking page's job, and sending the user there is an honest hand-off.

  sample({
    clock: positions.startStakingRequested,
    fn: () => Paths.STAKING,
    target: navigateTo,
  });

  // --- gating --------------------------------------------------------------
  //
  // Only what is genuinely routed. Every dashboard staking action now has a
  // destination; the two flow-backed groups still follow their feature flag, so
  // a chip whose flow is switched off keeps rendering disabled with the "not
  // connected yet" tooltip rather than firing into the void.

  sample({
    clock: wire,
    fn: (): PositionAction[] => ['claim', 'startStaking'],
    target: positions.actionsWired,
  });

  sample({
    clock: wire,
    fn: (): StakingKpiAction[] => ['claim'],
    target: kpi.enableActions,
  });

  const amountFlowReady = sample({
    clock: [wire, amountFlow.$enabled],
    source: amountFlow.$enabled,
  }).filter({ fn: (enabled) => enabled });

  sample({
    clock: amountFlowReady,
    fn: (): PositionAction[] => ['addStake', 'unbond'],
    target: positions.actionsWired,
  });

  sample({
    clock: amountFlowReady,
    fn: (): StakingKpiAction[] => ['unbond'],
    target: kpi.enableActions,
  });

  const confirmFlowReady = sample({
    clock: [wire, confirmFlow.$enabled],
    source: confirmFlow.$enabled,
  }).filter({ fn: (enabled) => enabled });

  sample({
    clock: confirmFlowReady,
    fn: (): PositionAction[] => ['changeValidators'],
    target: positions.actionsWired,
  });

  sample({
    clock: confirmFlowReady,
    fn: (): StakingKpiAction[] => ['redeem'],
    target: kpi.enableActions,
  });

  return {
    wire,
    $claimQueue,
  };
};
