import { type Event, type EventCallable, type Store, createEffect, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
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
  type ResolutionSources,
  groupRequestsByChain,
  readPayouts,
  resolveAmountFlowTarget,
  resolveClaimPayer,
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
    claimBlocked: EventCallable<{ chainId: ChainId; chainName: string }[]>;
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
  newPositionFlow: {
    /** Takes nothing: the button carries no account and the flow asks itself. */
    newPositionRequested: EventCallable<void>;
    /** Behind the same `staking` flag as the other two flows. */
    $enabled: Store<boolean>;
  };
};

/**
 * What the position drawer's Claim chip leaves out: the payouts themselves and
 * the payer.
 *
 * The payer is resolved exactly the way the Rewards modal resolves one —
 * `resolveClaimPayer` prefers the position's own account when it can sign, and
 * otherwise falls back to any signer of ours on the chain, because a payout is
 * permissionless and lands on the nominator's payee whoever submits it. Bailing
 * on a position without a local account (the old rule) made the chip a silent
 * no-op for exactly the address-book positions the modal claims fine.
 */
function buildPositionClaimRequest(
  payload: ClaimPayload,
  eras: Record<ChainId, number>,
  cache: Record<string, UnclaimedPayouts>,
  sources: ResolutionSources,
): ClaimRequest | null {
  const { chain, asset, position } = payload;

  const payer = resolveClaimPayer([position.accountId], chain, sources);
  if (nullable(payer)) return null;

  const payouts = readPayouts(position.accountId, chain.chainId, eras, cache);
  if (payouts.length === 0) return null;

  // `signingMode` comes from the resolved payer, not from `payload.signingMode`:
  // payouts are permissionless, so the payer's mode wins — a contact position
  // arrives as `draft`, yet the substituted payer can sign, and the flow should
  // open ready to do exactly that.
  return { chain, asset, account: payer.account, wallet: payer.wallet, payouts, signingMode: 'local' };
}

export const createStakingDashboardActions = ({
  sources,
  kpi,
  positions,
  claimFlow,
  amountFlow,
  confirmFlow,
  newPositionFlow,
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

  const claimResolution = sample({
    clock: kpi.claimRequested,
    source: {
      chains: sources.$chains,
      accounts: sources.$accounts,
      wallets: sources.$wallets,
    },
    fn: (resolution, { requests }) => resolveClaimRequests(requests, resolution),
  });

  const claimGroups = claimResolution.map(({ requests }) => groupRequestsByChain(requests));

  /**
   * Chains the user asked about and this installation cannot sign on.
   *
   * Announced rather than dropped: the previous code turned an unresolvable
   * selection into an empty list, and an empty list into no clock tick at all,
   * so the button fired an event nobody could act on and nothing was ever
   * said.
   */
  const claimUnsigned = claimResolution.filterMap(({ requests, skipped }) =>
    requests.length === 0 && skipped.length > 0 ? skipped : undefined,
  );

  sample({
    clock: claimUnsigned,
    fn: (skipped) => skipped.map(({ chainId, chainName }) => ({ chainId, chainName })),
    target: kpi.claimBlocked,
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
    source: {
      chains: sources.$chains,
      accounts: sources.$accounts,
      wallets: sources.$wallets,
      eras: sources.$eras,
      cache: sources.$payoutsCache,
    },
    fn: ({ eras, cache, ...resolution }, payload) => buildPositionClaimRequest(payload, eras, cache, resolution),
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
  // Assembled here like everything else. This used to navigate to the Staking
  // page — the last action on the dashboard that took the user off it.

  sample({
    clock: positions.startStakingRequested,
    target: newPositionFlow.newPositionRequested,
  });

  // --- gating --------------------------------------------------------------
  //
  // Only what is genuinely routed. Every dashboard staking action now has a
  // destination; the flow-backed groups follow their feature flag, so a chip
  // whose flow is switched off keeps rendering disabled with the "not connected
  // yet" tooltip rather than firing into the void.

  sample({
    clock: wire,
    fn: (): PositionAction[] => ['claim'],
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

  const newPositionFlowReady = sample({
    clock: [wire, newPositionFlow.$enabled],
    source: newPositionFlow.$enabled,
  }).filter({ fn: (enabled) => enabled });

  sample({
    clock: newPositionFlowReady,
    fn: (): PositionAction[] => ['startStaking'],
    target: positions.actionsWired,
  });

  return {
    wire,
    $claimQueue,
  };
};
