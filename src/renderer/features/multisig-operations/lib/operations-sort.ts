import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { findCoreTransaction, getTransactionAmount } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { type OperationWithAccount } from '../model/context';

import { getFilterableTxType } from './operations-filter';

export type SortKey = 'type' | 'value' | 'submitter';
export type SortDirection = 'asc' | 'desc';
export type OperationsSort = { by: SortKey; direction: SortDirection } | null;

export const nextSortState = (current: OperationsSort, key: SortKey): OperationsSort => {
  if (!current || current.by !== key) return { by: key, direction: 'asc' };
  if (current.direction === 'asc') return { by: key, direction: 'desc' };

  return null;
};

export type SortContext = {
  chains: Record<ChainId, Chain>;
  multisigWallets: Pick<Wallet, 'id' | 'name'>[];
};

const getValueKey = ({ operation, account }: OperationWithAccount, chains: SortContext['chains']): number => {
  const coreTx = accountUtils.isFlexibleMultisigAccount(account)
    ? findCoreTransaction(operation.transaction)
    : operation.transaction;
  const amount = coreTx ? getTransactionAmount(coreTx) : null;
  if (!amount) return -1;

  const chain = chains[operation.chainId];
  const precision = chain?.assets.at(0)?.precision ?? 0;

  return Number(amount) / 10 ** precision;
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
  const key = (item: OperationWithAccount): string | number => {
    if (sort.by === 'type') return getFilterableTxType(item.operation);
    if (sort.by === 'value') return getValueKey(item, context.chains);

    return getSubmitterKey(item, context.multisigWallets);
  };

  return items
    .map(item => ({ item, key: key(item) }))
    .sort((a, b) => (a.key < b.key ? -direction : a.key > b.key ? direction : 0))
    .map(({ item }) => item);
};
