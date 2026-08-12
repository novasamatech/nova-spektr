import { BN, BN_ZERO } from '@polkadot/util';

import { type Address, type Asset, type Chain, type Wallet } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PurposeSplit } from '../balancePurpose';
import { buildRowFiat, groupRows } from '../rows';
import { type AccountRow } from '../types';

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
  vestedHint: BN_ZERO,
});

const makeRow = (overrides: Partial<AccountRow> & { accountId: AccountId }): AccountRow => {
  const chainId = overrides.chain?.chainId ?? '0xchain';
  const symbol = overrides.asset?.symbol ?? 'DOT';

  const chain = (overrides.chain ?? { chainId }) as unknown as Chain;
  const asset = (overrides.asset ?? { symbol }) as unknown as Asset;
  const split = overrides.split ?? makeSplit({ transferable: 0 });

  return {
    id: `${overrides.accountId}-${chainId}-${symbol}`,
    accountId: overrides.accountId,
    groupKey: overrides.groupKey ?? overrides.accountId,
    displayName: overrides.displayName ?? 'Account',
    displayAddress: (overrides.displayAddress ?? 'addr') as unknown as Address,
    shortAddress: overrides.shortAddress ?? 'addr',
    wallet: overrides.wallet ?? null,
    walletTypeBucket: overrides.walletTypeBucket ?? 'vault',
    chain,
    networkName: overrides.networkName ?? 'Polkadot',
    asset,
    split,
    totalBN: overrides.totalBN ?? split.transferable,
    fiat: overrides.fiat ?? { transferable: null, staked: null, governance: null, other: null, total: null },
  };
};

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

describe('groupRows', () => {
  it('groups rows with the same accountId across chains into one group', () => {
    const rows = [
      makeRow({ accountId: ALICE, chain: { chainId: '0x1' } as unknown as Chain }),
      makeRow({ accountId: ALICE, chain: { chainId: '0x2' } as unknown as Chain }),
    ];

    const groups = groupRows(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.chainCount).toEqual(2);
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

  it('counts distinct asset symbols for assetCount', () => {
    const rows = [
      makeRow({
        accountId: ALICE,
        chain: { chainId: '0x1' } as unknown as Chain,
        asset: { symbol: 'DOT' } as unknown as Asset,
      }),
      makeRow({
        accountId: ALICE,
        chain: { chainId: '0x1' } as unknown as Chain,
        asset: { symbol: 'USDT' } as unknown as Asset,
      }),
      makeRow({
        accountId: ALICE,
        chain: { chainId: '0x2' } as unknown as Chain,
        asset: { symbol: 'DOT' } as unknown as Asset,
      }),
    ];

    const groups = groupRows(rows);

    expect(groups[0]!.assetCount).toEqual(2);
    expect(groups[0]!.chainCount).toEqual(2);
  });
});
