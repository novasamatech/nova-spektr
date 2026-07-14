import { type Chain, type ChainId, type Wallet, TransactionType } from '@/shared/core';
import { TransferTypes, XcmTypes, findCoreTransaction } from '@/entities/transaction';

import { getFilterableTxType } from './operations-filter';
import { extractTransferAmount, hasTransferAmount } from './transfer-amount-extractor';
import { type OperationWithAccount } from './types';

export type SortKey = 'type' | 'value' | 'submitter';
export type SortDirection = 'asc' | 'desc';
export type OperationsSort = { by: SortKey; direction: SortDirection } | null;

export const getNextSortState = (current: OperationsSort, key: SortKey): OperationsSort => {
  if (!current || current.by !== key) return { by: key, direction: 'asc' };
  if (current.direction === 'asc') return { by: key, direction: 'desc' };

  return null;
};

export type SortContext = {
  chains: Record<ChainId, Chain>;
  multisigWallets: Pick<Wallet, 'id' | 'name'>[];
};

// Types whose amount the Value column actually renders in the row.
const DISPLAYED_AMOUNT_TYPES = new Set<TransactionType>([
  ...TransferTypes,
  ...XcmTypes,
  TransactionType.VESTED_TRANSFER,
]);

type ValueRank = { tier: number; amount: number };

/**
 * Ranks an operation for the Value sort so the list groups by what the user
 * sees: tier 2 — the Value column shows the amount (sorted numerically within
 * the tier); tier 1 — the operation carries some extractable value that the
 * column does not render (batches, staking/governance amounts, transfer all);
 * tier 0 — no value at all.
 */
const getValueRank = ({ operation }: OperationWithAccount, chains: SortContext['chains']): ValueRank => {
  const coreTx = findCoreTransaction(operation.transaction);
  const info = extractTransferAmount(operation, chains[operation.chainId] ?? null);

  if (info && coreTx?.type && DISPLAYED_AMOUNT_TYPES.has(coreTx.type)) {
    const amount = Number(info.rawAmount) / 10 ** info.assetPrecision;

    return { tier: 2, amount: Number.isNaN(amount) ? 0 : amount };
  }

  return { tier: info || hasTransferAmount(operation) ? 1 : 0, amount: 0 };
};

const getSubmitterKey = ({ operation, account }: OperationWithAccount, wallets: SortContext['multisigWallets']) => {
  const wallet = wallets.find(w => w.id === account.walletId);

  return (wallet?.name ?? operation.multisigAccountId).toLowerCase();
};

const compareNewest = (a: OperationWithAccount, b: OperationWithAccount): number => {
  return (
    b.operation.timestamp - a.operation.timestamp ||
    b.operation.blockCreated - a.operation.blockCreated ||
    b.operation.indexCreated - a.operation.indexCreated
  );
};

const sortByNewest = (items: OperationWithAccount[]): OperationWithAccount[] => {
  return items.toSorted(compareNewest);
};

export const sortOperations = (
  items: OperationWithAccount[],
  sort: OperationsSort,
  context: SortContext,
): OperationWithAccount[] => {
  if (!sort) return sortByNewest(items);

  const direction = sort.direction === 'desc' ? -1 : 1;

  if (sort.by === 'value') {
    return items
      .map(item => ({ item, rank: getValueRank(item, context.chains) }))
      .sort((a, b) => {
        const byRank = (a.rank.tier - b.rank.tier || a.rank.amount - b.rank.amount) * direction;

        return byRank || compareNewest(a.item, b.item);
      })
      .map(({ item }) => item);
  }

  const getSortKey = (item: OperationWithAccount): string => {
    if (sort.by === 'type') return getFilterableTxType(item.operation);

    return getSubmitterKey(item, context.multisigWallets);
  };

  return items
    .map(item => ({ item, key: getSortKey(item) }))
    .sort((a, b) => a.key.localeCompare(b.key) * direction || compareNewest(a.item, b.item))
    .map(({ item }) => item);
};
