import { BN, BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { type Asset, type Balance, type Chain, type ChainId } from '@/shared/core';
import { getRoundedValue, transferableAmountBN, vestedLockedAmountBN } from '@/shared/lib/utils';

export type RowAllocation = {
  transferablePct: number;
  lockedPct: number;
  reservedPct: number;
  /**
   * The share held by the vesting lock. Carved _out_ of `lockedPct`, exactly as
   * the portfolio-wide bars do it (`computeBalanceAllocation`) — the two are
   * one click apart and must not disagree about what "Locked" means.
   */
  vestedPct: number;
};

type Totals = { transferable: BigNumber; reserved: BigNumber; vested: BigNumber; total: BigNumber };

const emptyTotals = (): Totals => ({
  transferable: new BigNumber(0),
  reserved: new BigNumber(0),
  vested: new BigNumber(0),
  total: new BigNumber(0),
});

/** One balance's fiat figures, folded into the totals of the row it belongs to. */
function addBalance(totals: Totals, balance: Balance, asset: Asset, price: number): Totals {
  const transferable = transferableAmountBN(balance);
  const locked = BN.max(BN_ZERO, balance.free.sub(transferable));
  const vested = BN.min(vestedLockedAmountBN(balance), locked);

  const toFiat = (amount: BN) => new BigNumber(getRoundedValue(amount.toString(), price, asset.precision));

  return {
    transferable: totals.transferable.plus(toFiat(transferable)),
    reserved: totals.reserved.plus(toFiat(balance.reserved)),
    vested: totals.vested.plus(toFiat(vested)),
    total: totals.total.plus(toFiat(balance.free.add(balance.reserved))),
  };
}

type PriceMap = Record<string, Record<string, { price: number; change: number }>>;

type AssetAllocParams = {
  accountIds: string[];
  priceId: string;
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceMap;
  currency: { coingeckoId: string };
};

type ChainAllocParams = {
  assetIds: number[];
  chainId: ChainId;
  accountIds: string[];
  balanceMap: Record<string, Balance>;
  chains: Record<string, Chain>;
  prices: PriceMap;
  currency: { coingeckoId: string };
};

function toAllocation({ transferable, reserved, vested, total }: Totals): RowAllocation | null {
  if (total.isZero()) return null;

  // locked = total - transferable - reserved - vested, clamped to zero
  const lockedFiat = BigNumber.max(0, total.minus(transferable).minus(reserved).minus(vested));

  return {
    transferablePct: transferable.div(total).multipliedBy(100).toNumber(),
    lockedPct: lockedFiat.div(total).multipliedBy(100).toNumber(),
    reservedPct: reserved.div(total).multipliedBy(100).toNumber(),
    vestedPct: vested.div(total).multipliedBy(100).toNumber(),
  };
}

export function computeAssetRowAllocations(params: AssetAllocParams): Map<string, RowAllocation> {
  const { accountIds, priceId, balanceMap, chains, prices, currency } = params;
  const result = new Map<string, RowAllocation>();

  const accountIdSet = new Set(accountIds);

  // Group balances by accountId, filtering to matching priceId
  const grouped = new Map<string, Totals>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;

    const chain = chains[balance.chainId];
    if (!chain) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset?.priceId || asset.priceId !== priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    const totals = grouped.get(balance.accountId) ?? emptyTotals();
    grouped.set(balance.accountId, addBalance(totals, balance, asset, priceItem.price));
  }

  for (const [accountId, totals] of grouped) {
    const alloc = toAllocation(totals);
    if (alloc) result.set(accountId, alloc);
  }

  return result;
}

export function computeChainRowAllocations(params: ChainAllocParams): Map<number, RowAllocation> {
  const { assetIds, chainId, accountIds, balanceMap, chains, prices, currency } = params;
  const result = new Map<number, RowAllocation>();

  const accountIdSet = new Set(accountIds);
  const assetIdSet = new Set(assetIds);
  const chain = chains[chainId];
  if (!chain) return result;

  const grouped = new Map<number, Totals>();

  for (const balance of Object.values(balanceMap)) {
    if (!accountIdSet.has(balance.accountId)) continue;
    if (balance.chainId !== chainId) continue;
    if (!assetIdSet.has(balance.assetId)) continue;

    const asset = chain.assets.find((a) => a.assetId === balance.assetId);
    if (!asset?.priceId) continue;

    const priceItem = prices[asset.priceId]?.[currency.coingeckoId];
    if (!priceItem) continue;

    const totals = grouped.get(balance.assetId) ?? emptyTotals();
    grouped.set(balance.assetId, addBalance(totals, balance, asset, priceItem.price));
  }

  for (const [assetId, totals] of grouped) {
    const alloc = toAllocation(totals);
    if (alloc) result.set(assetId, alloc);
  }

  return result;
}
