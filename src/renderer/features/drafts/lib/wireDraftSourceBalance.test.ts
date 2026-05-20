import { BN_ZERO } from '@polkadot/util';
import { type Event, allSettled, createStore, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type Asset, type Balance, type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { balanceModel } from '@/entities/balance';
import { balanceSubModel } from '@/features/assets-balances';

import { wireDraftSourceBalance } from './wireDraftSourceBalance';

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });

const NATIVE_ASSET: Asset = {
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  type: 'native',
} as unknown as Asset;

const NON_NATIVE_ASSET: Asset = {
  assetId: 1984,
  symbol: 'USDT',
  precision: 6,
  type: 'statemine',
} as unknown as Asset;

const CHAIN: Chain = {
  chainId: '0xaaaa',
  name: 'TestNet',
  assets: [NATIVE_ASSET, NON_NATIVE_ASSET],
} as unknown as Chain;

const balanceFor = (accountId: AccountId, asset: Asset): Balance =>
  ({
    id: `${accountId} ${CHAIN.chainId} ${asset.assetId}` as Balance['id'],
    accountId,
    chainId: CHAIN.chainId,
    assetId: asset.assetId,
    assetType: 'native',
    free: BN_ZERO,
    frozen: BN_ZERO,
    reserved: BN_ZERO,
    locked: [],
    providers: 0,
    consumers: 0,
    sufficients: 0,
    ed: BN_ZERO,
    transferableMode: 'legacy',
  }) as unknown as Balance;

// Two module-level wirings: default-asset and asset-override.
const $draftPathDefault = createStore<PathNode[]>([]);
const $chainDefault = createStore<Chain | null>(null);
const $isDraftModeDefault = createStore(false);
const $resultDefault = wireDraftSourceBalance({
  $draftPath: $draftPathDefault,
  $chain: $chainDefault,
  $isDraftMode: $isDraftModeDefault,
});

const $draftPathOverride = createStore<PathNode[]>([]);
const $chainOverride = createStore<Chain | null>(null);
const $isDraftModeOverride = createStore(false);
const $assetOverride = createStore<Asset | null>(null);
const $resultOverride = wireDraftSourceBalance({
  $draftPath: $draftPathOverride,
  $chain: $chainOverride,
  $isDraftMode: $isDraftModeOverride,
  $asset: $assetOverride,
});

// `.watch` is blocked by `effector/no-watch`; collect payloads in a store instead.
const payloadsStore = <T>(event: Event<T>) => createStore<T[]>([]).on(event, (s, p) => [...s, p]);

const $fetchPayloads = payloadsStore(balanceSubModel.fetchAccountIds);

describe('wireDraftSourceBalance · gating', () => {
  it('returns null when isDraftMode is false', () => {
    const scope = fork({
      values: new Map()
        .set($draftPathDefault, [signer(acc(1))])
        .set($chainDefault, CHAIN)
        .set($isDraftModeDefault, false),
    });
    expect(scope.getState($resultDefault)).toBe(null);
  });

  it('returns null when path is empty', () => {
    const scope = fork({
      values: new Map().set($draftPathDefault, []).set($chainDefault, CHAIN).set($isDraftModeDefault, true),
    });
    expect(scope.getState($resultDefault)).toBe(null);
  });

  it('returns null when chain is null', () => {
    const scope = fork({
      values: new Map()
        .set($draftPathDefault, [signer(acc(1))])
        .set($chainDefault, null)
        .set($isDraftModeDefault, true),
    });
    expect(scope.getState($resultDefault)).toBe(null);
  });
});

describe('wireDraftSourceBalance · balance derivation', () => {
  it('reads path[0] (source), not the signer leaf, with the native asset by default', () => {
    const sourceId = acc(1);
    const signerId = acc(42);
    const sourceBalance = balanceFor(sourceId, NATIVE_ASSET);
    const scope = fork({
      values: new Map()
        .set($draftPathDefault, [multisig(sourceId), signer(signerId)])
        .set($chainDefault, CHAIN)
        .set($isDraftModeDefault, true)
        .set(balanceModel.__test.$balanceMap, { [sourceBalance.id]: sourceBalance }),
    });
    expect(scope.getState($resultDefault)?.accountId).toBe(sourceId);
  });

  it('returns null when balance is seeded for the signer leaf but not the source', () => {
    const sourceId = acc(1);
    const signerId = acc(42);
    const signerBalance = balanceFor(signerId, NATIVE_ASSET);
    const scope = fork({
      values: new Map()
        .set($draftPathDefault, [multisig(sourceId), signer(signerId)])
        .set($chainDefault, CHAIN)
        .set($isDraftModeDefault, true)
        .set(balanceModel.__test.$balanceMap, { [signerBalance.id]: signerBalance }),
    });
    expect(scope.getState($resultDefault)).toBe(null);
  });

  it('honors the $asset override', () => {
    const accountId = acc(7);
    const balance = balanceFor(accountId, NON_NATIVE_ASSET);
    const scope = fork({
      values: new Map()
        .set($draftPathOverride, [signer(accountId)])
        .set($chainOverride, CHAIN)
        .set($isDraftModeOverride, true)
        .set($assetOverride, NON_NATIVE_ASSET)
        .set(balanceModel.__test.$balanceMap, { [balance.id]: balance }),
    });
    expect(scope.getState($resultOverride)?.assetId).toBe(NON_NATIVE_ASSET.assetId);
  });

  it('returns null when no balance exists for the source on the chain', () => {
    const scope = fork({
      values: new Map()
        .set($draftPathDefault, [signer(acc(99))])
        .set($chainDefault, CHAIN)
        .set($isDraftModeDefault, true)
        .set(balanceModel.__test.$balanceMap, {}),
    });
    expect(scope.getState($resultDefault)).toBe(null);
  });
});

describe('wireDraftSourceBalance · fetch trigger', () => {
  it('requests a balance fetch when path becomes non-empty in draft mode', async () => {
    const scope = fork();
    await allSettled($isDraftModeDefault, { scope, params: true });
    await allSettled($chainDefault, { scope, params: CHAIN });
    await allSettled($draftPathDefault, { scope, params: [signer(acc(123))] });

    const calls = scope.getState($fetchPayloads);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls.at(-1)).toEqual([{ accountId: acc(123), chain: CHAIN }]);
  });

  it('does not request a fetch when draft mode is off', async () => {
    const scope = fork();
    await allSettled($isDraftModeDefault, { scope, params: false });
    await allSettled($chainDefault, { scope, params: CHAIN });
    await allSettled($draftPathDefault, { scope, params: [signer(acc(123))] });

    expect(scope.getState($fetchPayloads)).toEqual([]);
  });
});
