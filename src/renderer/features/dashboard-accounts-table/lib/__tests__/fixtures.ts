import { type Address, type Asset, type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountRow } from '../types';

/**
 * Shared row builder for lib tests (rows/filters/sorting). Only the fields each
 * suite actually reads need overriding; everything else falls back to a neutral
 * default. Structural `as unknown as` casts for the branded/opaque fields
 * (`Chain`, `Asset`, `Address`, `split`, `totalBN`) live here so individual
 * test files stay cast-free.
 */
export const makeRow = (overrides: Partial<AccountRow> & { accountId: AccountId }): AccountRow => {
  const chainId = overrides.chain?.chainId ?? '0xchain';
  const symbol = overrides.asset?.symbol ?? 'DOT';

  const chain = (overrides.chain ?? { chainId, name: 'Polkadot' }) as unknown as Chain;
  const asset = (overrides.asset ?? { symbol }) as unknown as Asset;

  return {
    id: overrides.id ?? `${overrides.accountId}-${chainId}-${symbol}`,
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
    split: overrides.split ?? ({} as AccountRow['split']),
    totalBN: overrides.totalBN ?? ({} as AccountRow['totalBN']),
    fiat: overrides.fiat ?? { transferable: null, staked: null, governance: null, other: null, total: null },
  };
};
