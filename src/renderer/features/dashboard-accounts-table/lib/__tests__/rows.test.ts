import { BN, BN_ZERO } from '@polkadot/util';

import { type Asset, type Balance, type Chain, type Wallet } from '@/shared/core';
import { toAccountId, toAddress, toShortAddress } from '@/shared/lib/utils';
import { type PurposeSplit } from '../balancePurpose';
import { type BuildAccountRowInput, buildAccountRow, buildRowFiat, groupRows } from '../rows';

import { makeRow } from './fixtures';

const ALICE = toAccountId('0x' + '11'.repeat(32));
const BOB = toAccountId('0x' + '22'.repeat(32));

const makeSplit = (params: {
  transferable: number;
  staked?: number | null;
  governance?: number | null;
  other?: number;
}): PurposeSplit => ({
  transferable: new BN(params.transferable),
  // `== null` deliberately treats undefined and null the same
  staked: params.staked == null ? null : new BN(params.staked),
  // `== null` deliberately treats undefined and null the same
  governance: params.governance == null ? null : new BN(params.governance),
  other: new BN(params.other ?? 0),
});

describe('buildRowFiat', () => {
  it('returns all-null buckets when price is null', () => {
    const split = makeSplit({ transferable: 50_000_000_000, staked: 20_000_000_000, other: 10_000_000_000 });

    const fiat = buildRowFiat(split, null, 10);

    expect(fiat).toEqual({ transferable: null, staked: null, governance: null, other: null, total: null });
  });

  it('keeps null staked/governance null and excludes them from total', () => {
    // precision 10: transferable 5 tokens, other 1 token; staked/governance not applicable
    const split = makeSplit({ transferable: 50_000_000_000, other: 10_000_000_000 });

    const fiat = buildRowFiat(split, 4, 10);

    expect(fiat.staked).toBeNull();
    expect(fiat.governance).toBeNull();
    expect(fiat.transferable).toEqual(20);
    expect(fiat.other).toEqual(4);
    expect(fiat.total).toEqual(24);
  });

  it('computes exact fiat for every bucket when all are priced', () => {
    // precision 10: transferable 5, staked 2, governance 1, other 1 tokens; price 4
    const split = makeSplit({
      transferable: 50_000_000_000,
      staked: 20_000_000_000,
      governance: 10_000_000_000,
      other: 10_000_000_000,
    });

    const fiat = buildRowFiat(split, 4, 10);

    expect(fiat).toEqual({ transferable: 20, staked: 8, governance: 4, other: 4, total: 36 });
  });
});

describe('buildAccountRow', () => {
  // No `type: NATIVE` on purpose — getNativeAsset falls back to the first
  // asset, which mirrors chains where the native asset carries no marker.
  const dotAsset = { assetId: 0, symbol: 'DOT', precision: 10, priceId: 'polkadot' } as unknown as Asset;
  const usdtAsset = { assetId: 1, symbol: 'USDT', precision: 6 } as unknown as Asset;

  const chain = {
    chainId: '0x01',
    name: 'Polkadot Asset Hub',
    parentId: '0x00',
    addressPrefix: 0,
    assets: [dotAsset, usdtAsset],
  } as unknown as Chain;

  const makeBalance = (params: { free: number; frozen?: number; assetId?: number }): Balance =>
    ({
      accountId: ALICE,
      chainId: '0x01',
      assetId: params.assetId ?? 0,
      free: new BN(params.free),
      reserved: BN_ZERO,
      frozen: new BN(params.frozen ?? 0),
      locked: [],
      transferableMode: 'legacy',
    }) as unknown as Balance;

  const makeInput = (overrides: Partial<BuildAccountRowInput> = {}): BuildAccountRowInput => ({
    balance: makeBalance({ free: 50_000_000_000 }),
    chain,
    networkChain: { chainId: '0xrelay', name: 'Polkadot' } as unknown as Chain,
    asset: dotAsset,
    displayName: 'Alice',
    wallet: null,
    isStakingCell: false,
    stakingPending: false,
    stakeActive: null,
    price: null,
    ...overrides,
  });

  it('builds a priced row with fiat for every applicable bucket', () => {
    // precision 10: 5 DOT transferable, price 4
    const row = buildAccountRow(makeInput({ price: 4 }));

    expect(row).not.toBeNull();
    expect(row!.split.transferable.toString()).toEqual('50000000000');
    expect(row!.totalBN.toString()).toEqual('50000000000');
    expect(row!.fiat.transferable).toEqual(20);
    expect(row!.fiat.total).toEqual(20);
    expect(row!.displayName).toEqual('Alice');
    expect(row!.networkName).toEqual('Polkadot');
  });

  it('reports all-null fiat for an unpriced row', () => {
    const row = buildAccountRow(makeInput({ price: null }));

    expect(row!.fiat).toEqual({ transferable: null, staked: null, governance: null, other: null, total: null });
  });

  it('keeps staked null while staking data is pending, even on a staking cell', () => {
    const row = buildAccountRow(makeInput({ isStakingCell: true, stakingPending: true, stakeActive: '10000000000' }));

    expect(row!.split.staked).toBeNull();
  });

  it('takes staked from the ledger on a loaded staking cell', () => {
    // legacy: transferable = free − frozen = 20e9; pot = 30e9; ledger 20e9
    const row = buildAccountRow(
      makeInput({
        balance: makeBalance({ free: 50_000_000_000, frozen: 30_000_000_000 }),
        isStakingCell: true,
        stakeActive: '20000000000',
      }),
    );

    expect(row!.split.staked?.toString()).toEqual('20000000000');
  });

  it('reports staked 0 (not null) on a loaded staking cell without a position', () => {
    const row = buildAccountRow(makeInput({ isStakingCell: true, stakeActive: null }));

    expect(row!.split.staked?.toString()).toEqual('0');
  });

  it('keeps staked null on a non-staking cell even when a ledger amount is passed', () => {
    const row = buildAccountRow(makeInput({ isStakingCell: false, stakeActive: '10000000000' }));

    expect(row!.split.staked).toBeNull();
  });

  it('keeps governance null for a non-native asset', () => {
    const row = buildAccountRow(makeInput({ balance: makeBalance({ free: 5_000_000, assetId: 1 }), asset: usdtAsset }));

    expect(row!.split.governance).toBeNull();
  });

  it('reports governance applicable (0, not null) for the native asset', () => {
    const row = buildAccountRow(makeInput());

    expect(row!.split.governance?.toString()).toEqual('0');
  });

  it('returns null for a zero-total balance', () => {
    expect(buildAccountRow(makeInput({ balance: makeBalance({ free: 0 }) }))).toBeNull();
  });

  it('formats id, groupKey and addresses, falling back to the short address for the name', () => {
    const row = buildAccountRow(makeInput({ displayName: null }));
    const expectedAddress = toAddress(ALICE, { prefix: 0 });

    expect(row!.id).toEqual(`${ALICE}-0x01-0`);
    expect(row!.accountId).toEqual(ALICE);
    expect(row!.groupKey).toEqual(ALICE);
    expect(row!.displayAddress).toEqual(expectedAddress);
    expect(row!.shortAddress).toEqual(toShortAddress(expectedAddress, 6));
    expect(row!.displayName).toEqual(row!.shortAddress);
    expect(row!.walletTypeBucket).toEqual('contact');
  });
});

describe('groupRows', () => {
  it('groups rows with the same accountId across chains into one group', () => {
    const rows = [
      makeRow({ accountId: ALICE, chain: { chainId: '0x1' } as unknown as Chain }),
      makeRow({ accountId: ALICE, chain: { chainId: '0x2' } as unknown as Chain }),
    ];

    const groups = groupRows(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.rows).toHaveLength(2);
  });

  it('produces one group per distinct accountId, in first-seen order, taking metadata from the first row', () => {
    const bobFirstWallet = { id: 1, name: 'Bob first wallet' } as unknown as Wallet;
    const bobSecondWallet = { id: 2, name: 'Bob second wallet' } as unknown as Wallet;

    const rows = [
      makeRow({
        accountId: BOB,
        chain: { chainId: '0x1' } as unknown as Chain,
        displayName: 'Bob first row',
        wallet: bobFirstWallet,
        walletTypeBucket: 'multisig',
      }),
      makeRow({ accountId: ALICE }),
      makeRow({
        accountId: BOB,
        chain: { chainId: '0x2' } as unknown as Chain,
        displayName: 'Bob second row',
        wallet: bobSecondWallet,
        walletTypeBucket: 'watchOnly',
      }),
    ];

    const groups = groupRows(rows);

    expect(groups.map((g) => g.accountId)).toEqual([BOB, ALICE]);
    expect(groups[0]!.name).toEqual('Bob first row');
    expect(groups[0]!.wallet).toBe(bobFirstWallet);
    expect(groups[0]!.walletTypeBucket).toEqual('multisig');
  });

  it('sums only priced rows into subtotalFiat, ignoring unpriced rows', () => {
    const priced = makeRow({
      accountId: ALICE,
      chain: { chainId: '0x1' } as unknown as Chain,
      fiat: { transferable: 10, staked: null, governance: null, other: 0, total: 10 },
    });
    const unpriced = makeRow({
      accountId: ALICE,
      chain: { chainId: '0x2' } as unknown as Chain,
      fiat: { transferable: null, staked: null, governance: null, other: null, total: null },
    });

    const groups = groupRows([priced, unpriced]);

    expect(groups[0]!.subtotalFiat).toEqual(10);
  });

  it('reports subtotalFiat null when every row in the group is unpriced', () => {
    const rows = [
      makeRow({ accountId: ALICE, chain: { chainId: '0x1' } as unknown as Chain }),
      makeRow({ accountId: ALICE, chain: { chainId: '0x2' } as unknown as Chain }),
    ];

    const groups = groupRows(rows);

    expect(groups[0]!.subtotalFiat).toBeNull();
  });
});
