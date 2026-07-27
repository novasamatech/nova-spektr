import { BN } from '@polkadot/util';
import { allSettled, createEvent, createStore, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type Asset, type Chain, type ChainId, type Wallet, StakingType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { type AmountFlowMode } from '@/features/staking-amount-flow';
import { createDraftToast } from '../model/draft-toast';

const accountId = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const chainId = (n: number): ChainId => `0x${n.toString(16).padStart(64, '0')}` as ChainId;

const asset = (): Asset =>
  ({ assetId: 0, symbol: 'DOT', precision: 10, staking: StakingType.RELAYCHAIN }) as unknown as Asset;

const chain = (): Chain => ({ chainId: chainId(1), name: 'Polkadot AH', assets: [asset()] }) as unknown as Chain;

const account = (n: number): AnyAccount =>
  ({ accountId: accountId(n), walletId: n, type: 'universal', name: `account-${n}` }) as unknown as AnyAccount;

const wallet = (n: number): Wallet => ({ id: n, name: `Cold storage ${n}` }) as unknown as Wallet;

const path = (n: number): PathNode[] => [{ kind: 'signer', accountId: accountId(n) }];

function createHarness() {
  const claimSaveAsDraftRequested = createEvent();
  const claimRequested = createEvent();
  const $claimInitiatedDraft = createStore(false);

  const amountSaveAsDraftRequested = createEvent();
  const amountFlowStarted = createEvent();
  const $amountInitiatedDraft = createStore(false);
  const $mode = createStore<AmountFlowMode | null>('unbond');

  const draftCreated = createEvent();
  const rewardsClaimed = createEvent();

  const model = createDraftToast({
    claimFlow: {
      saveAsDraftRequested: claimSaveAsDraftRequested,
      claimRequested,
      $initiatedDraft: $claimInitiatedDraft,
      $chain: createStore<Chain | null>(chain()),
      $asset: createStore<Asset | null>(asset()),
      $totalAmount: createStore('8900000000000'),
      $initiator: createStore<AnyAccount | null>(account(1)),
      $draftSigningPath: createStore(path(1)),
    },
    amountFlow: {
      saveAsDraftRequested: amountSaveAsDraftRequested,
      flowStarted: amountFlowStarted,
      $initiatedDraft: $amountInitiatedDraft,
      $mode,
      $chain: createStore<Chain | null>(chain()),
      $asset: createStore<Asset | null>(asset()),
      $amountPlanck: createStore(new BN('1230000000000')),
      $initiator: createStore<AnyAccount | null>(account(2)),
      $draftSigningPath: createStore(path(2)),
    },
    $accounts: createStore([account(1), account(2)]),
    $wallets: createStore([wallet(1), wallet(2)]),
    draftCreated,
  });

  return {
    model,
    $claimInitiatedDraft,
    $amountInitiatedDraft,
    events: {
      claimSaveAsDraftRequested,
      claimRequested,
      amountSaveAsDraftRequested,
      amountFlowStarted,
      draftCreated,
      rewardsClaimed,
    },
  };
}

describe('draft-confirmation toast', () => {
  it('announces a claim draft with the line frame F10 asks for', async () => {
    const harness = createHarness();
    const scope = fork({ values: [[harness.$claimInitiatedDraft, true]] });

    await allSettled(harness.events.claimSaveAsDraftRequested, { scope, params: undefined });
    await allSettled(harness.events.draftCreated, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toEqual({
      operation: 'claim',
      chain: expect.objectContaining({ name: 'Polkadot AH' }),
      asset: expect.objectContaining({ symbol: 'DOT' }),
      amount: '8900000000000',
      signerAccountId: accountId(1),
      signerWallet: expect.objectContaining({ name: 'Cold storage 1' }),
    });
  });

  it('carries the amount flow’s mode and its own amount', async () => {
    const harness = createHarness();
    const scope = fork({ values: [[harness.$amountInitiatedDraft, true]] });

    await allSettled(harness.events.amountSaveAsDraftRequested, { scope, params: undefined });
    await allSettled(harness.events.draftCreated, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toMatchObject({
      operation: 'unbond',
      amount: '1230000000000',
      signerAccountId: accountId(2),
    });
  });

  it('stays silent for a signed submission', async () => {
    const harness = createHarness();
    const scope = fork();

    // Confirm → sign → submit: nothing ever asks for a draft, and
    // `createDraftModel.draftCreated` never fires.
    await allSettled(harness.events.rewardsClaimed, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toBeNull();
  });

  it('stays silent for a draft this app created somewhere else', async () => {
    const harness = createHarness();
    // No staking flow marked itself as the draft's initiator.
    const scope = fork();

    await allSettled(harness.events.draftCreated, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toBeNull();
  });

  it('announces once, then clears itself', async () => {
    const harness = createHarness();
    const scope = fork({ values: [[harness.$claimInitiatedDraft, true]] });

    await allSettled(harness.events.claimSaveAsDraftRequested, { scope, params: undefined });
    await allSettled(harness.events.draftCreated, { scope, params: undefined });
    await allSettled(harness.model.toastShown, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toBeNull();

    // A second unrelated draft must not re-announce the one already shown.
    await allSettled(harness.events.draftCreated, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toBeNull();
  });

  it('forgets a save that never produced a draft when the flow reopens', async () => {
    const harness = createHarness();
    const scope = fork({ values: [[harness.$claimInitiatedDraft, true]] });

    await allSettled(harness.events.claimSaveAsDraftRequested, { scope, params: undefined });
    // The save failed; the user starts the flow again and this time signs it.
    await allSettled(harness.events.claimRequested, { scope, params: undefined });
    await allSettled(harness.events.draftCreated, { scope, params: undefined });

    expect(scope.getState(harness.model.$toast)).toBeNull();
  });
});
