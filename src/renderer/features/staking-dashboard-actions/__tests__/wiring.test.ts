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

import { type Asset, type Chain, type ChainId, type Wallet, StakingType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { type AnyAccount, accountService } from '@/domains/network';
import { type StakingPosition, type UnclaimedPayout, type UnclaimedPayouts, payoutsCacheKey } from '@/domains/staking';
import {
  type ClaimRequestPayload,
  type StakingKpiAction,
  type UnbondRequestPayload,
} from '@/features/dashboard-staking-kpi';
import {
  type ClaimPayload,
  type PositionAction,
  type PositionActionPayload,
} from '@/features/dashboard-staking-positions';
import { type AmountFlowTarget } from '@/features/staking-amount-flow';
import { type ClaimRequest } from '@/features/staking-claim-rewards';
import { createStakingDashboardActions } from '../model/wiring';

const ACTIVE_ERA = 1500;

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

const account = (n: number): AnyAccount =>
  ({
    accountId: accountId(n),
    walletId: n,
    name: `account-${n}`,
    type: 'chain',
    chainId: chainId(1),
  }) as unknown as AnyAccount;

const wallet = (n: number): Wallet => ({ id: n, name: `wallet-${n}`, type: 'wallet_wov' }) as unknown as Wallet;

const position = (n: number, chainIndex: number): StakingPosition =>
  ({
    accountId: accountId(n),
    chainId: chainId(chainIndex),
    stake: { total: '100', active: '100', unlocking: [] },
    status: 'active',
    statusReason: null,
    nominations: [],
    activeValidators: [],
    unbonding: [],
    redeemable: '0',
    totalUnbonding: '0',
  }) as unknown as StakingPosition;

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
const universalAccount = (n: number): AnyAccount => ({ ...account(n), type: 'universal' }) as unknown as AnyAccount;

type Harness = ReturnType<typeof createHarness>;

function createHarness() {
  const kpiClaimRequested = createEvent<ClaimRequestPayload>();
  const kpiUnbondRequested = createEvent<UnbondRequestPayload>();
  const enableActions = createEvent<StakingKpiAction[]>();

  const positionClaimRequested = createEvent<ClaimPayload>();
  const positionAddStakeRequested = createEvent<PositionActionPayload>();
  const positionUnbondRequested = createEvent<PositionActionPayload>();
  const startStakingRequested = createEvent();
  const actionsWired = createEvent<PositionAction[]>();

  const claimDispatched = createEvent<ClaimRequest[]>();
  const rewardsClaimed = createEvent<unknown>();
  const claimFlowFinished = createEvent();

  const amountUnbondRequested = createEvent<AmountFlowTarget>();
  const amountAddStakeRequested = createEvent<AmountFlowTarget>();
  const navigateTo = createEvent<string>();

  const $chains = createStore<Record<ChainId, Chain>>({
    [chainId(1)]: chain(1, 'DOT'),
    [chainId(2)]: chain(2, 'KSM'),
  });
  const $accounts = createStore<AnyAccount[]>([universalAccount(1), universalAccount(2)]);
  const $wallets = createStore<Wallet[]>([wallet(1), wallet(2)]);
  const $positions = createStore<StakingPosition[]>([position(1, 1), position(2, 2)]);
  const $eras = createStore<Record<ChainId, number>>({ [chainId(1)]: ACTIVE_ERA, [chainId(2)]: ACTIVE_ERA });
  const $payoutsCache = createStore<Record<string, UnclaimedPayouts>>({
    [payoutsCacheKey(chainId(1), accountId(1), ACTIVE_ERA)]: {
      total: '300',
      payouts: [payout(10), payout(11, '200')],
    } as unknown as UnclaimedPayouts,
  });
  const $amountFlowEnabled = createStore(true);

  const model = createStakingDashboardActions({
    sources: { $chains, $accounts, $wallets, $positions, $eras, $payoutsCache },
    kpi: {
      claimRequested: kpiClaimRequested,
      unbondRequested: kpiUnbondRequested,
      enableActions,
    },
    positions: {
      claimRequested: positionClaimRequested,
      addStakeRequested: positionAddStakeRequested,
      unbondRequested: positionUnbondRequested,
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
    navigateTo,
  });

  return {
    model,
    $amountFlowEnabled,
    events: {
      kpiClaimRequested,
      kpiUnbondRequested,
      enableActions,
      positionClaimRequested,
      positionAddStakeRequested,
      positionUnbondRequested,
      startStakingRequested,
      actionsWired,
      claimDispatched,
      rewardsClaimed,
      claimFlowFinished,
      amountUnbondRequested,
      amountAddStakeRequested,
      navigateTo,
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

describe('staking dashboard actions wiring', () => {
  describe('claim', () => {
    it('turns a KPI claim payload into a full claim request', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: { requests: [{ accountId: accountId(1), chainId: chainId(1), payouts: [payout(10)] }] },
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

    it('skips an entry whose account this installation does not hold', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: {
          requests: [
            // 7 is an address-book address: tracked, but no local account.
            { accountId: accountId(7), chainId: chainId(1), payouts: [payout(10)] },
            { accountId: accountId(1), chainId: chainId(1), payouts: [payout(11)] },
          ],
        },
      });

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]?.map((request) => request.account.accountId)).toEqual([accountId(1)]);
    });

    it('dispatches nothing at all when nothing resolves', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: { requests: [{ accountId: accountId(7), chainId: chainId(1), payouts: [payout(10)] }] },
      });

      expect(dispatched).toEqual([]);
    });

    it('splits a multi-chain selection into one session per chain', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const dispatched = collect(harness.events.claimDispatched, scope);

      await allSettled(harness.events.kpiClaimRequested, {
        scope,
        params: {
          requests: [
            { accountId: accountId(1), chainId: chainId(1), payouts: [payout(10)] },
            { accountId: accountId(2), chainId: chainId(2), payouts: [payout(20)] },
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
            { accountId: accountId(1), chainId: chainId(1), payouts: [payout(10)] },
            { accountId: accountId(2), chainId: chainId(2), payouts: [payout(20)] },
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

  describe('start staking', () => {
    it('sends the user to the Staking page', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const navigations = collect(harness.events.navigateTo, scope);

      await allSettled(harness.events.startStakingRequested, { scope, params: undefined });

      expect(navigations).toEqual([Paths.STAKING]);
    });
  });

  describe('gating', () => {
    it('announces only the actions that have a destination', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability();
      const positionActions = collect(harness.events.actionsWired, scope);
      const kpiActions = collect(harness.events.enableActions, scope);

      await allSettled(harness.model.wire, { scope, params: undefined });

      const wiredPositions = positionActions.flat();
      const enabledKpi = kpiActions.flat();

      expect(wiredPositions).toEqual(expect.arrayContaining(['claim', 'startStaking', 'addStake', 'unbond']));
      expect(enabledKpi).toEqual(expect.arrayContaining(['claim', 'unbond']));

      // Neither has a flow reachable from the dashboard yet.
      expect(wiredPositions).not.toContain('changeValidators');
      expect(enabledKpi).not.toContain('redeem');
    });

    it('leaves the amount-flow actions gated while the staking flag is off', async () => {
      const harness: Harness = createHarness();
      const scope = await forkWithAccountAvailability([[harness.$amountFlowEnabled, false]]);
      const positionActions = collect(harness.events.actionsWired, scope);
      const kpiActions = collect(harness.events.enableActions, scope);

      await allSettled(harness.model.wire, { scope, params: undefined });

      expect(positionActions.flat()).toEqual(['claim', 'startStaking']);
      expect(kpiActions.flat()).toEqual(['claim']);
    });
  });
});
