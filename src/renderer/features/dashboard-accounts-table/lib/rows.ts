import { BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type Asset, type Balance, type Chain, type Wallet } from '@/shared/core';
import { getNativeAsset, toAddress, toShortAddress, totalAmountBN } from '@/shared/lib/utils';

import { type PurposeSplit, splitBalanceByPurpose } from './balancePurpose';
import { type AccountGroup, type AccountRow, type NumericKey } from './types';
import { getWalletTypeBucket } from './walletTypeBucket';

/**
 * Planck → whole tokens at full precision. Mirrors
 * `dashboard-staking-kpi/lib/csv.ts#toTokens` — same BigNumber primitive, same
 * shape — kept feature-local rather than shared since fiat math tolerates the
 * `Number()` precision loss the CSV export explicitly avoids.
 */
const toTokens = (amount: string, precision: number): string => {
  return new BigNumber(amount || '0').shiftedBy(-precision).toFixed();
};

export const buildRowFiat = (
  split: PurposeSplit,
  price: number | null,
  precision: number,
): Record<NumericKey, number | null> => {
  if (price === null) {
    return { transferable: null, staked: null, governance: null, other: null, total: null };
  }

  const toFiat = (bn: BN) => Number(toTokens(bn.toString(), precision)) * price;

  const transferable = toFiat(split.transferable);
  const staked = split.staked === null ? null : toFiat(split.staked);
  const governance = split.governance === null ? null : toFiat(split.governance);
  const other = toFiat(split.other);
  const total = transferable + (staked ?? 0) + (governance ?? 0) + other;

  return { transferable, staked, governance, other, total };
};

export type BuildAccountRowInput = {
  balance: Balance;
  chain: Chain;
  /**
   * Relay name via `chain.parentId` — resolved by the caller, who owns the
   * chains map
   */
  networkName: string;
  asset: Asset;
  /** Resolved display name; null falls back to the short address */
  displayName: string | null;
  wallet: Wallet | null;
  /** Whether the staking ledger applies to this (chain, asset) cell */
  isStakingCell: boolean;
  /** Staking data has not loaded yet — staked renders "—", never 0 */
  stakingPending: boolean;
  /** Ledger `active` in planck; null when the account has no position */
  stakeActive: string | null;
  price: number | null;
};

/**
 * Pure assembly of one table row from one balance record. Returns null for a
 * zero-total balance — those produce no row. The caller resolves everything
 * that needs a store (chain, asset, name, wallet, position, price); all
 * derivation lives here.
 */
export const buildAccountRow = (input: BuildAccountRowInput): AccountRow | null => {
  const { balance, chain, networkName, asset, displayName, wallet, isStakingCell, stakingPending, stakeActive, price } =
    input;

  if (totalAmountBN(balance).isZero()) return null;

  // Governance (conviction) locks can only exist on the chain's native asset.
  const isNativeAsset = asset.assetId === getNativeAsset(chain.assets).assetId;
  // "—" while staking data is still loading: null, never 0
  const stakedActive = !isStakingCell || stakingPending ? null : new BN(stakeActive ?? '0');

  const split = splitBalanceByPurpose(balance, stakedActive, isNativeAsset);
  const fiat = buildRowFiat(split, price, asset.precision);

  const displayAddress = toAddress(balance.accountId, { prefix: chain.addressPrefix });
  const shortAddress = toShortAddress(displayAddress, 6);

  return {
    id: `${balance.accountId}-${balance.chainId}-${balance.assetId}`,
    accountId: balance.accountId,
    groupKey: balance.accountId,
    // Rendered group headers must use <NamedAccount title={row.displayName}> so the
    // displayed string and the searched string never diverge (search-patterns rule).
    displayName: displayName ?? shortAddress,
    displayAddress,
    shortAddress,
    wallet,
    walletTypeBucket: getWalletTypeBucket(wallet),
    chain,
    networkName,
    asset,
    split,
    totalBN: split.transferable
      .add(split.staked ?? BN_ZERO)
      .add(split.governance ?? BN_ZERO)
      .add(split.other),
    fiat,
  };
};

export const groupRows = (rows: AccountRow[]): AccountGroup[] => {
  const groups = new Map<string, AccountRow[]>();
  for (const row of rows) {
    const list = groups.get(row.groupKey) ?? [];
    list.push(row);
    groups.set(row.groupKey, list);
  }

  return [...groups.entries()].map(([key, accountRows]) => {
    // accountRows is never empty: an entry only exists because at least one row was pushed to it.
    const firstRow = accountRows[0]!;
    const priced = accountRows.map((row) => row.fiat.total).filter((value): value is number => value !== null);

    return {
      key,
      accountId: firstRow.accountId,
      name: firstRow.displayName,
      wallet: firstRow.wallet,
      walletTypeBucket: firstRow.walletTypeBucket,
      rows: accountRows,
      subtotalFiat: priced.length > 0 ? priced.reduce((a, b) => a + b, 0) : null,
      chainCount: new Set(accountRows.map((row) => row.chain.chainId)).size,
      assetCount: new Set(accountRows.map((row) => row.asset.symbol)).size,
    };
  });
};
