import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Asset, type Chain, type ChainId, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type UnclaimedPayout } from '@/domains/staking';
import { MAX_PAYOUT_CALLS_PER_BATCH } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { type ClaimRequest, type ClaimRewardsConfirm, Step } from '../types';

import { claimRewardsModel } from './claim';
import { confirmModel } from './confirm';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const chainId = (n: number): ChainId => `0x${n.toString(16).padStart(64, '0')}` as ChainId;

const chain = (n = 1) => ({ chainId: chainId(n), name: `chain-${n}`, assets: [] }) as unknown as Chain;
const asset = () => ({ assetId: 0, symbol: 'DOT', precision: 10 }) as unknown as Asset;
const account = (n: number) => ({ accountId: accountId(n), walletId: n }) as unknown as AnyAccount;
const wallet = (n: number) => ({ id: n, name: `wallet-${n}`, type: 'wallet_vlt' }) as unknown as Wallet;

const payout = (era: number, amount = '100'): UnclaimedPayout => ({
  era,
  validator: accountId(900),
  page: 0,
  amount,
});

const request = (n: number, payouts: UnclaimedPayout[], chainIndex = 1): ClaimRequest => ({
  chain: chain(chainIndex),
  asset: asset(),
  account: account(n),
  wallet: wallet(n),
  payouts,
  signingMode: 'local',
});

const confirm = (n: number): ClaimRewardsConfirm => ({
  id: n,
  chain: chain(),
  initiator: account(n),
  signatory: account(n),
  route: [account(n)],
  tx: { chainId: chainId(1), accountId: accountId(n), type: 'payoutStakersByPage', args: {} } as never,
  coreTx: { chainId: chainId(1), accountId: accountId(n), type: 'payoutStakersByPage', args: {} } as never,
  amount: '100',
  payoutCount: 1,
});

/**
 * `walletModel.$wallets` is derived, so it cannot be seeded through fork
 * values. Filling it through the populate effect is the supported route.
 */
const withWallets = async () => {
  const scope = fork({ handlers: new Map().set(walletModel.populate, () => [wallet(1), wallet(2)]) });
  await allSettled(walletModel.populate, { scope });

  return scope;
};

describe('claimRewardsModel · entry', () => {
  it('opens on the confirm step', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });

    expect(scope.getState(claimRewardsModel.$step)).toBe(Step.CONFIRM);
  });

  it('stays closed when there is nothing to claim', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [])] });

    expect(scope.getState(claimRewardsModel.$step)).toBe(Step.NONE);
  });

  it('snapshots the request, merged per account and sorted oldest era first', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, {
      scope,
      params: [request(1, [payout(9)]), request(1, [payout(2)])],
    });

    const requests = scope.getState(claimRewardsModel.$requests);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.payouts.map((p) => p.era)).toEqual([2, 9]);
  });

  it('claims one chain and hands the other back instead of dropping it', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, {
      scope,
      params: [request(1, [payout(5)], 1), request(2, [payout(5)], 2)],
    });

    expect(scope.getState(claimRewardsModel.$requests)).toHaveLength(1);
    expect(scope.getState(claimRewardsModel.$skippedRequests)).toHaveLength(1);
  });

  it('closing the flow clears the snapshot', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });
    await allSettled(claimRewardsModel.flowFinished, { scope });

    expect(scope.getState(claimRewardsModel.$step)).toBe(Step.NONE);
    expect(scope.getState(claimRewardsModel.$requests)).toEqual([]);
  });
});

describe('claimRewardsModel · chunking', () => {
  it('splits an account past the batch cap into several transactions', async () => {
    const scope = fork();
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH + 1 }, (_, index) => payout(index));

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, payouts)] });

    expect(scope.getState(claimRewardsModel.$plans)).toHaveLength(2);
  });

  it('keeps a claim inside the cap as one transaction', async () => {
    const scope = fork();
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH }, (_, index) => payout(index));

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, payouts)] });

    expect(scope.getState(claimRewardsModel.$plans)).toHaveLength(1);
  });

  it('totals the amount across every account as BN', async () => {
    const scope = fork();
    const big = '9007199254740993';

    await allSettled(claimRewardsModel.claimRequested, {
      scope,
      params: [request(1, [payout(1, big)]), request(2, [payout(1, big)])],
    });

    expect(scope.getState(claimRewardsModel.$totalAmount)).toBe('18014398509481986');
  });
});

describe('claimRewardsModel · signing gate', () => {
  it('cannot sign before the node has answered', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });

    // No api in scope, so there is no wrapped transaction, no fee and no
    // validation — exactly the state the confirm opens in.
    expect(scope.getState(claimRewardsModel.$canSign)).toBe(false);
  });

  it('sends one signing payload per confirm', async () => {
    const scope = await withWallets();
    const payloads: unknown[] = [];
    createWatch({ unit: signModel.events.formInitiated, scope, fn: (payload) => payloads.push(payload) });

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });
    await allSettled(confirmModel.init, { scope, params: [confirm(1), confirm(2)] });
    await allSettled(confirmModel.startSigning, { scope });

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ signingPayloads: [{}, {}] });
    expect(scope.getState(claimRewardsModel.$step)).toBe(Step.SIGN);
  });
});

describe('claimRewardsModel · draft mode', () => {
  it('never signs while in draft mode', async () => {
    const scope = await withWallets();
    const payloads: unknown[] = [];
    createWatch({ unit: signModel.events.formInitiated, scope, fn: (payload) => payloads.push(payload) });

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });
    await allSettled(claimRewardsModel.draftModeToggled, { scope, params: true });
    await allSettled(confirmModel.init, { scope, params: [confirm(1)] });
    await allSettled(confirmModel.startSigning, { scope });

    expect(payloads).toEqual([]);
    expect(scope.getState(claimRewardsModel.$step)).toBe(Step.CONFIRM);
  });

  it('is unavailable for a claim that needs several transactions — a draft holds one call', async () => {
    const scope = fork();
    const payouts = Array.from({ length: MAX_PAYOUT_CALLS_PER_BATCH + 1 }, (_, index) => payout(index));

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, payouts)] });

    expect(scope.getState(claimRewardsModel.$canUseDraftMode)).toBe(false);
    expect(scope.getState(claimRewardsModel.$canSaveAsDraft)).toBe(false);
  });

  it('is available for a single-transaction claim', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });

    expect(scope.getState(claimRewardsModel.$canUseDraftMode)).toBe(true);
  });

  it('a new request drops draft mode', async () => {
    const scope = fork();

    await allSettled(claimRewardsModel.draftModeToggled, { scope, params: true });
    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });

    expect(scope.getState(claimRewardsModel.$isDraftMode)).toBe(false);
  });
});

describe('claimRewardsModel · submit', () => {
  const successResult = [{ id: 0, result: ExtrinsicResult.SUCCESS, params: {} as never }];

  it('announces the claim and refreshes the payouts once it lands', async () => {
    const refresh = vi.fn();
    const scope = fork({ handlers: new Map().set(claimRewardsModel.refreshPayouts, refresh) });
    const claimed: unknown[] = [];
    createWatch({ unit: claimRewardsModel.rewardsClaimed, scope, fn: (payload) => claimed.push(payload) });

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5, '250')])] });
    await allSettled(claimRewardsModel.stepChanged, { scope, params: Step.SUBMIT });
    await allSettled(submitModel.done, { scope, params: successResult });

    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({ total: '250', claims: [{ amount: '250' }] });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ignores a submit that belongs to another flow', async () => {
    const refresh = vi.fn();
    const scope = fork({ handlers: new Map().set(claimRewardsModel.refreshPayouts, refresh) });
    const claimed: unknown[] = [];
    createWatch({ unit: claimRewardsModel.rewardsClaimed, scope, fn: (payload) => claimed.push(payload) });

    // Parked on CONFIRM: a signature landing elsewhere is not ours to claim.
    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });
    await allSettled(submitModel.done, { scope, params: successResult });

    expect(claimed).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('says nothing when every extrinsic failed', async () => {
    const scope = fork();
    const claimed: unknown[] = [];
    createWatch({ unit: claimRewardsModel.rewardsClaimed, scope, fn: (payload) => claimed.push(payload) });

    await allSettled(claimRewardsModel.claimRequested, { scope, params: [request(1, [payout(5)])] });
    await allSettled(claimRewardsModel.stepChanged, { scope, params: Step.SUBMIT });
    await allSettled(submitModel.done, {
      scope,
      params: [{ id: 0, result: ExtrinsicResult.ERROR, params: 'boom' }],
    });

    expect(claimed).toEqual([]);
  });
});
