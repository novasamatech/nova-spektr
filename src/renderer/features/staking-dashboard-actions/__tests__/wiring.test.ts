import {
  type EventCallable,
  type Store,
  type StoreWritable,
  allSettled,
  createEvent,
  createStore,
  createWatch,
  fork,
} from 'effector';
import { describe, expect, it } from 'vitest';

import {
  type Asset,
  type Chain,
  type ChainId,
  type Validator,
  type Wallet,
  SigningType,
  StakingType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { type StakingPosition, type UnclaimedPayout, type UnclaimedPayouts, payoutsCacheKey } from '@/domains/staking';
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
import { createStakingDashboardActions } from '../model/wiring';

const ACTIVE_ERA = 1500;
const REDEEMABLE = '12500000000';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const chainId = (n: number): ChainId => `0x${n.toString(16).padStart(64, '0')}` as ChainId;

// `staking: 'relaychain'` is what `getRelaychainAsset` picks the staking asset by.
const asset = (symbol = 'DOT'): Asset =>
  ({ assetId: 0, symbol, precision: 10, name: symbol, staking: StakingType.RELAYCHAIN }) as unknown as Asset;

const chain = (n: number, symbol = 'DOT'): Chain =>
  ({
    chainId: chainId(n),
    name: `chain-${n}`,
    assets: [asset(symbol)],
  }) as unknown as Chain;

const account = (n: number, signingType: SigningType = SigningType.POLKADOT_VAULT): AnyAccount =>
  ({
    accountId: accountId(n),
    walletId: n,
    name: `account-${n}`,
    type: 'chain',
    chainId: chainId(1),
    signingType,
  }) as unknown as AnyAccount;

const wallet = (n: number): Wallet => ({ id: n, name: `wallet-${n}`, type: 'wallet_wov' }) as unknown as Wallet;

const position = (n: number, chainIndex: number, redeemable = '0'): StakingPosition =>
  ({
    accountId: accountId(n),
    chainId: chainId(chainIndex),
    stake: { total: '100', active: '100', unlocking: [] },
    status: 'active',
    statusReason: null,
    nominations: [],
    activeValidators: [],
    unbonding: [],
    redeemable,
    totalUnbonding: '0',
  }) as unknown as StakingPosition;

const validator = (n: number): Validator =>
  ({ accountId: accountId(n), chainId: chainId(1), totalStake: '1', ownStake: '1' }) as unknown as Validator;

const payout = (era: number, amount = '100'): UnclaimedPayout => ({
  era,
  validator: accountId(900),
  page: 0,
  amount,
});

/**
 * Every account is available on every chain here.
 *
 * `accountService.isAccountAvailableOnChain` is exercised by its own suite;
 * what these tests are about is whether a _missing_ account is skipped, and a
 * stand-in that answers "yes" for the ones that do exist keeps that the only
 * variable.
 */
const universalAccount = (n: number, signingType?: SigningType): AnyAccount =>
  ({ ...account(n, signingType), type: 'universal' }) as unknown as AnyAccount;

type Harness = ReturnType<typeof createHarness>;

/** The accounts this installation holds. Overridden where signing is the topic. */
type HarnessOptions = { accounts?: AnyAccount[] };

function createHarness({ accounts = [universalAccount(1), universalAccount(2)] }: HarnessOptions = {}) {
  const kpiClaimRequested = createEvent<ClaimRequestPayload>();
  const kpiRedeemRequested = createEvent<RedeemRequestPayload>();
  const kpiUnbondRequested = createEvent<UnbondRequestPayload>();
  const enableActions = createEvent<StakingKpiAction[]>();

  const positionClaimRequested = createEvent<ClaimPayload>();
  const positionAddStakeRequested = createEvent<PositionActionPayload>();
  const positionUnbondRequested = createEvent<PositionActionPayload>();
  const nominationsChangeRequested = createEvent<NominationsChangePayload>();
  const startStakingRequested = createEvent();
  const actionsWired = createEvent<PositionAction[]>();

  const claimDispatched = createEvent<ClaimRequest[]>();
  const rewardsClaimed = createEvent<unknown>();
  const claimFlowFinished = createEvent();

  const amountUnbondRequested = createEvent<AmountFlowTarget>();
  const amountAddStakeRequested = createEvent<AmountFlowTarget>();
  const confirmChangeValidatorsRequested = createEvent<ChangeValidatorsTarget>();
  const confirmRedeemRequested = createEvent<RedeemTarget>();
  const newPositionRequested = createEvent();

  const $chains = createStore<Record<ChainId, Chain>>({
    [chainId(1)]: chain(1, 'DOT'),
    [chainId(2)]: chain(2, 'KSM'),
  });
  const $accounts = createStore<AnyAccount[]>(accounts);
  const $wallets = createStore<Wallet[]>([wallet(1), wallet(2)]);
  // Account 1 has something withdrawable, account 2 has not — the two halves of
  // the redeem routing.
  const $positions = createStore<StakingPosition[]>([position(1, 1, REDEEMABLE), position(2, 2)]);
  const $eras = createStore<Record<ChainId, number>>({ [chainId(1)]: ACTIVE_ERA, [chainId(2)]: ACTIVE_ERA });
  const $payoutsCache = createStore<Record<string, UnclaimedPayouts>>({
    [payoutsCacheKey(chainId(1), accountId(1), ACTIVE_ERA)]: {
      total: '300',
      payouts: [payout(10), payout(11, '200')],
    } as unknown as UnclaimedPayouts,
    // 7 is an address-book address: tracked and earning, but no local account.
    [payoutsCacheKey(chainId(1), accountId(7), ACTIVE_ERA)]: {
      total: '100',
      payouts: [payout(12)],
    } as unknown as UnclaimedPayouts,
  });
  const $amountFlowEnabled = createStore(true);
  const claimBlocked = createEvent<{ chainId: ChainId; chainName: string }[]>();

  const $confirmFlowEnabled = createStore(true);
  const $newPositionFlowEnabled = createStore(true);

  const model = createStakingDashboardActions({
    sources: { $chains, $accounts, $wallets, $positions, $eras, $payoutsCache },
    kpi: {
      claimRequested: kpiClaimRequested,
      redeemRequested: kpiRedeemRequested,
      unbondRequested: kpiUnbondRequested,
      enableActions,
      claimBlocked,
    },
    positions: {
      claimRequested: positionClaimRequested,
      addStakeRequested: positionAddStakeRequested,
      unbondRequested: positionUnbondRequested,
      nominationsChangeRequested,
      startStakingRequested,
      actionsWired,
    },
    claimFlow: {
      claimRequested: claimDispatched,
      rewardsClaimed,
      flowFinished: claimFlowFinished,
    },
    amountFlow: {
      unbondRequested: amountUnbondRequested,
      addStakeRequested: amountAddStakeRequested,
      $enabled: $amountFlowEnabled,
    },
    confirmFlow: {
      changeValidatorsRequested: confirmChangeValidatorsRequested,
      redeemRequested: confirmRedeemRequested,
      $enabled: $confirmFlowEnabled,
    },
    newPositionFlow: {
      newPositionRequested,
      $enabled: $newPositionFlowEnabled,
    },
  });

  return {
    model,
    $amountFlowEnabled,
    $confirmFlowEnabled,
    $newPositionFlowEnabled,
    events: {
      kpiClaimRequested,
      kpiRedeemRequested,
      kpiUnbondRequested,
      enableActions,
      claimBlocked,
      positionClaimRequested,
      positionAddStakeRequested,
      positionUnbondRequested,
      nominationsChangeRequested,
      startStakingRequested,
      actionsWired,
      claimDispatched,
      rewardsClaimed,
      claimFlowFinished,
      amountUnbondRequested,
      amountAddStakeRequested,
      confirmChangeValidatorsRequested,
      confirmRedeemRequested,
      newPositionRequested,
    },
  };
}

/**
 * `isAccountAvailableOnChain` delegates the type-specific answer to a DI
 * `anyOf`, and `$handlers` resolves to its _scoped_ value once a scope is
 * active — a fork with nothing seeded reads as "every account is available
 * nowhere". The handler therefore has to be registered inside the scope, not
 * globally.
 */
async function forkWithAccountAvailability(values?: [StoreWritable<boolean>, boolean][]) {
  const scope = values ? fork({ values }) : fork();

  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: {
      body: ({ account, chain }) => (accountService.isChainAccount(account) ? account.chainId === chain.chainId : true),
      available: () => true,
    },
  });

  return scope;
}

function collect<T>(unit: EventCallable<T> | Store<T>, scope: ReturnType<typeof fork>): T[] {
  const seen: T[] = [];
  createWatch({ unit, scope, fn: (value) => seen.push(value) });

  return seen;
}

const positionPayload = (n: number, chainIndex: number): PositionActionPayload => ({
  position: position(n, chainIndex),
  chain: chain(chainIndex),
  asset: asset(),
  account: universalAccount(n),
  wallet: wallet(n),
  signingMode: 'direct' as never,
});

/** An address-book position: tracked, earning, but no local account behind it. */
const contactPositionPayload = (n: number, chainIndex: number): PositionActionPayload => ({
  ...positionPayload(n, chainIndex),
  account: null,
  wallet: null,
});

describe('staking dashboard actions wiring', () => {
  describe('claim', () => {
    it('turns a KPI claim payload into a full claim request', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: { requests: [{ nominators: [accountId(1)], chainId: chainId(1), payouts: [payout(10)] }] },
      });

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]).toEqual([
        {
          chain: expect.objectContaining({ chainId: chainId(1) }),
          asset: expect.objectContaining({ symbol: 'DOT' }),
          account: expect.objectContaining({ accountId: accountId(1) }),
          wallet: expect.objectContaining({ id: 1 }),
          payouts: [payout(10)],
        },
      ]);
    });

    it('claims for an address-book nominator with an account of ours', async () => {
      // A payout names the validator and is permissionless: the reward reaches
      // the nominator's own payee whoever pays the fee. Refusing to claim for a
      // tracked address would abandon money we are able to collect.
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        // 7 is an address-book address: tracked, but no local account.
        params: { requests: [{ nominators: [accountId(7)], chainId: chainId(1), payouts: [payout(10)] }] },
      });

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]?.[0]?.account.accountId).toBe(accountId(1));
    });

    it('prefers the nominator itself when we hold it', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: {
          requests: [{ nominators: [accountId(7), accountId(1)], chainId: chainId(1), payouts: [payout(10)] }],
        },
      });

      expect(dispatched[0]?.[0]?.account.accountId).toBe(accountId(1));
    });

    it('passes over a watch-only nominator and pays with a signer of ours', async () => {
      // A watched address earns rewards like any other, and the payout call is
      // permissionless — the only thing it cannot do is pay the fee.
      const harness: Harness = createHarness({
        accounts: [universalAccount(1, SigningType.WATCH_ONLY), universalAccount(2)],
      });
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: { requests: [{ nominators: [accountId(1)], chainId: chainId(1), payouts: [payout(10)] }] },
      });

      expect(dispatched[0]?.[0]?.account.accountId).toBe(accountId(2));
    });

    it('pays with a multisig account — the signing-path graph reaches its signatories', async () => {
      // The stricter, wallet-shaped form of this rule used to refuse anything
      // that could not sign _directly_, hiding claims the flow completes fine.
      const harness: Harness = createHarness({ accounts: [universalAccount(1, SigningType.MULTISIG)] });
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: { requests: [{ nominators: [accountId(1)], chainId: chainId(1), payouts: [payout(10)] }] },
      });

      expect(dispatched[0]?.[0]?.account.accountId).toBe(accountId(1));
    });

    it('reports the chain instead of claiming when nothing here can sign', async () => {
      const harness: Harness = createHarness({
        accounts: [universalAccount(1, SigningType.WATCH_ONLY), universalAccount(2, SigningType.WATCH_ONLY)],
      });
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);
      const blocked = collect(harness.events.claimBlocked, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: { requests: [{ nominators: [accountId(1)], chainId: chainId(1), payouts: [payout(10)] }] },
      });

      expect(dispatched).toEqual([]);
      expect(blocked).toEqual([[{ chainId: chainId(1), chainName: 'chain-1' }]]);
    });

    it('splits a multi-chain selection into one session per chain', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: {
          requests: [
            { nominators: [accountId(1)], chainId: chainId(1), payouts: [payout(10)] },
            { nominators: [accountId(2)], chainId: chainId(2), payouts: [payout(20)] },
          ],
        },
      });

      // First chain now, the rest queued — the flow signs one network at a time.
      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]?.[0]?.chain.chainId).toBe(chainId(1));
      expect(scope.getState(harness.model.$claimQueue)).toHaveLength(1);

      await allSettled(harness.events.rewardsClaimed, { scope, params: undefined });
      await allSettled(harness.events.claimFlowFinished, { scope, params: undefined });

      expect(dispatched).toHaveLength(2);
      expect(dispatched[1]?.[0]?.chain.chainId).toBe(chainId(2));
      expect(scope.getState(harness.model.$claimQueue)).toEqual([]);
    });

    it('drops the queue when the session is cancelled instead of claimed', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: {
          requests: [
            { nominators: [accountId(1)], chainId: chainId(1), payouts: [payout(10)] },
            { nominators: [accountId(2)], chainId: chainId(2), payouts: [payout(20)] },
          ],
        },
      });

      await allSettled(harness.events.claimFlowFinished, { scope, params: undefined });

      expect(dispatched).toHaveLength(1);
      expect(scope.getState(harness.model.$claimQueue)).toEqual([]);
    });

    it('fills a position claim with the payouts the cache holds', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.positionClaimRequested, {
        scope,
        params: { ...positionPayload(1, 1), amount: '300' },
      });

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]?.[0]?.payouts).toEqual([payout(10), payout(11, '200')]);
      // The position's own account can sign, so it stays the payer.
      expect(dispatched[0]?.[0]?.account.accountId).toBe(accountId(1));
      expect(dispatched[0]?.[0]?.wallet.id).toBe(1);
    });

    it('claims a contact position with a signer of ours — modal parity', async () => {
      // The drawer used to bail on `account: null`, making the chip a silent
      // no-op for exactly the address-book positions the Rewards modal claims.
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.positionClaimRequested, {
        scope,
        params: { ...contactPositionPayload(7, 1), amount: '100' },
      });

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]?.[0]?.account.accountId).toBe(accountId(1));
      expect(dispatched[0]?.[0]?.wallet.id).toBe(1);
      expect(dispatched[0]?.[0]?.payouts).toEqual([payout(12)]);
    });

    it('does not dispatch a position claim when nothing here can sign on the chain', async () => {
      const harness: Harness = createHarness({
        accounts: [universalAccount(1, SigningType.WATCH_ONLY), universalAccount(2, SigningType.WATCH_ONLY)],
      });
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.positionClaimRequested, {
        scope,
        params: { ...contactPositionPayload(7, 1), amount: '100' },
      });

      expect(dispatched).toEqual([]);
    });

    it('does not dispatch a position claim with no payouts behind it', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      // Account 2 has no cache entry — the chip's figure came from somewhere
      // else, and an empty batch would fail on chain.
      await allSettled(harness.events.positionClaimRequested, {
        scope,
        params: { ...positionPayload(2, 2), amount: '0' },
      });

      expect(dispatched).toEqual([]);
    });
  });

  describe('amount flow', () => {
    it('forwards an unbond payload unchanged', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.amountUnbondRequested, scope);
      const payload = positionPayload(1, 1);

      await allSettled(harness.events.positionUnbondRequested, { scope, params: payload });

      expect(forwarded).toEqual([payload]);
    });

    it('forwards an add-stake payload unchanged', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.amountAddStakeRequested, scope);
      const payload = positionPayload(1, 1);

      await allSettled(harness.events.positionAddStakeRequested, { scope, params: payload });

      expect(forwarded).toEqual([payload]);
    });

    it('resolves a KPI unbond request into a full amount-flow target', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.amountUnbondRequested, scope);

      await allSettled(harness.events.kpiUnbondRequested, {
        scope,
        params: { accountId: accountId(1), chainId: chainId(1) },
      });

      expect(forwarded).toHaveLength(1);
      expect(forwarded[0]).toMatchObject({
        chain: expect.objectContaining({ chainId: chainId(1) }),
        account: expect.objectContaining({ accountId: accountId(1) }),
        wallet: expect.objectContaining({ id: 1 }),
        position: expect.objectContaining({ accountId: accountId(1) }),
      });
    });

    it('skips a KPI unbond request with no position behind it', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.amountUnbondRequested, scope);

      await allSettled(harness.events.kpiUnbondRequested, {
        scope,
        params: { accountId: accountId(7), chainId: chainId(1) },
      });

      expect(forwarded).toEqual([]);
    });
  });

  describe('confirm flow', () => {
    it('forwards a picked validator set unchanged', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.confirmChangeValidatorsRequested, scope);
      const payload = { ...positionPayload(1, 1), validators: [validator(11), validator(12)] };

      await allSettled(harness.events.nominationsChangeRequested, { scope, params: payload });

      expect(forwarded).toEqual([payload]);
    });

    it('resolves a KPI redeem request and leads with the position’s redeemable', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.confirmRedeemRequested, scope);

      // The request carries a stale figure; the position is the fresher source.
      await allSettled(harness.events.kpiRedeemRequested, {
        scope,
        params: { accountId: accountId(1), chainId: chainId(1), amount: '1' },
      });

      expect(forwarded).toHaveLength(1);
      expect(forwarded[0]).toMatchObject({
        amount: REDEEMABLE,
        chain: expect.objectContaining({ chainId: chainId(1) }),
        account: expect.objectContaining({ accountId: accountId(1) }),
        wallet: expect.objectContaining({ id: 1 }),
        position: expect.objectContaining({ accountId: accountId(1) }),
      });
    });

    it('skips a redeem request whose position has nothing unlocked', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.confirmRedeemRequested, scope);

      await allSettled(harness.events.kpiRedeemRequested, {
        scope,
        params: { accountId: accountId(2), chainId: chainId(2), amount: '900' },
      });

      expect(forwarded).toEqual([]);
    });

    it('skips a redeem request with no position behind it', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const forwarded = collect(harness.events.confirmRedeemRequested, scope);

      await allSettled(harness.events.kpiRedeemRequested, {
        scope,
        params: { accountId: accountId(7), chainId: chainId(1), amount: '900' },
      });

      expect(forwarded).toEqual([]);
    });
  });

  describe('start staking', () => {
    // It used to navigate to the Staking page — the last dashboard action that
    // took the user off the dashboard.
    it('opens the new-position flow in place', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const opened = collect(harness.events.newPositionRequested, scope);

      await allSettled(harness.events.startStakingRequested, { scope, params: undefined });

      expect(opened).toHaveLength(1);
    });
  });

  describe('gating', () => {
    it('announces every action that has a destination', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const positionActions = collect(harness.events.actionsWired, scope);
      const kpiActions = collect(harness.events.enableActions, scope);

      await allSettled(harness.model.wire, { scope, params: undefined });

      expect(positionActions.flat()).toEqual(
        expect.arrayContaining(['claim', 'startStaking', 'addStake', 'unbond', 'changeValidators']),
      );
      expect(kpiActions.flat()).toEqual(expect.arrayContaining(['claim', 'unbond', 'redeem']));
    });

    it('leaves the amount-flow actions gated while the staking flag is off', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability([[harness.$amountFlowEnabled, false]]);
      const positionActions = collect(harness.events.actionsWired, scope);

      await allSettled(harness.model.wire, { scope, params: undefined });

      expect(positionActions.flat()).not.toContain('unbond');
      expect(positionActions.flat()).not.toContain('addStake');
    });

    it('leaves start staking gated while its flow is off', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability([[harness.$newPositionFlowEnabled, false]]);
      const positionActions = collect(harness.events.actionsWired, scope);

      await allSettled(harness.model.wire, { scope, params: undefined });

      expect(positionActions.flat()).not.toContain('startStaking');
    });

    it('leaves the confirm-flow actions gated while the staking flag is off', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability([[harness.$confirmFlowEnabled, false]]);
      const positionActions = collect(harness.events.actionsWired, scope);
      const kpiActions = collect(harness.events.enableActions, scope);

      await allSettled(harness.model.wire, { scope, params: undefined });

      expect(positionActions.flat()).not.toContain('changeValidators');
      expect(kpiActions.flat()).not.toContain('redeem');
    });
  });
});
