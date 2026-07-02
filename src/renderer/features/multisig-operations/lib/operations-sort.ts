import { type Chain, type ChainId, type Wallet } from '@/shared/core';

import { getFilterableTxType } from './operations-filter';
import { extractTransferAmount } from './transfer-amount-extractor';
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

const getValueKey = ({ operation }: OperationWithAccount, chains: SortContext['chains']): number => {
  const info = extractTransferAmount(operation, chains[operation.chainId] ?? null);
  if (!info) return -1;

  const value = Number(info.rawAmount) / 10 ** info.assetPrecision;

  return Number.isNaN(value) ? -1 : value;
};

const getSubmitterKey = ({ operation, account }: OperationWithAccount, wallets: SortContext['multisigWallets']) => {
  const wallet = wallets.find(w => w.id === account.walletId);

  return (wallet?.name ?? operation.multisigAccountId).toLowerCase();
};

export const sortOperations = (
  items: OperationWithAccount[],
  sort: OperationsSort,
  context: SortContext,
): OperationWithAccount[] => {
  if (!sort) return items;

  const direction = sort.direction === 'desc' ? -1 : 1;
  const getSortKey = (item: OperationWithAccount): string | number => {
    if (sort.by === 'type') return getFilterableTxType(item.operation);
    if (sort.by === 'value') return getValueKey(item, context.chains);

    return getSubmitterKey(item, context.multisigWallets);
  };

  return items
    .map(item => ({ item, key: getSortKey(item) }))
    .sort((a, b) => {
      if (typeof a.key === 'string' && typeof b.key === 'string') {
        return a.key.localeCompare(b.key) * direction;
      }

      return a.key < b.key ? -direction : a.key > b.key ? direction : 0;
    })
    .map(({ item }) => item);
};
