import { endOfDay, isAfter, isWithinInterval } from 'date-fns';

import {
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxyType,
  TransactionType,
} from '@/shared/core';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { type DateRange } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';

export interface OperationsFilterCriteria {
  account: string[];
  network: string[];
  type: string[];
  proxyType: string[];
  dateRange?: DateRange;
  searchQuery: string;
}

export type OperationsFilterTab = 'pending' | 'history' | 'hidden';

export interface OperationsFilterContext {
  filters: OperationsFilterCriteria;
  tab: OperationsFilterTab;
  hiddenIds: string[];
  multisigAccountsMap: Record<string, MultisigAccount | FlexibleMultisigAccount>;
  walletNameByAccountId: Record<string, string>;
  chains: Record<ChainId, Chain>;
}

export const getFilterableTxType = (operation: MultisigOperation): TransactionType | 'UNKNOWN_TYPE' => {
  if (!operation.transaction?.type) {
    return 'UNKNOWN_TYPE';
  }

  if (TransferTypes.includes(operation.transaction.type)) {
    return TransactionType.TRANSFER;
  }
  if (XcmTypes.includes(operation.transaction.type)) {
    return TransactionType.XCM_LIMITED_TRANSFER;
  }

  if (operation.transaction.type === TransactionType.BATCH_ALL) {
    const txMatch = findCoreBatchAll(operation.transaction);

    return txMatch?.type || 'UNKNOWN_TYPE';
  }

  return operation.transaction.type;
};

export const matchesTab = (operation: MultisigOperation, tab: OperationsFilterTab, hiddenIds: string[]) => {
  const isHiddenOperation = hiddenIds.includes(operation.id);

  switch (tab) {
    case 'hidden':
      return isHiddenOperation;
    case 'pending':
      return !isHiddenOperation && operation.status === 'pending';
    case 'history':
      return !isHiddenOperation && ['executed', 'cancelled', 'error'].includes(operation.status);
  }
};

export const matchesAccount = (operation: MultisigOperation, accountIds: string[]) =>
  accountIds.length === 0 || accountIds.includes(operation.multisigAccountId);

export const matchesNetwork = (operation: MultisigOperation, networkIds: string[]) => {
  if (networkIds.length === 0) return true;
  const xcmDestination = operation.transaction?.args.destinationChain;
  return networkIds.includes(operation.chainId) || networkIds.includes(xcmDestination);
};

export const matchesTxType = (operation: MultisigOperation, typeIds: string[]) =>
  typeIds.length === 0 || typeIds.includes(getFilterableTxType(operation));

export const matchesProxyType = (
  operation: MultisigOperation,
  proxyTypeIds: string[],
  multisigAccountsMap: Record<string, MultisigAccount | FlexibleMultisigAccount>,
) => {
  if (proxyTypeIds.length === 0) return true;
  const multisigAccount = multisigAccountsMap[operation.multisigAccountId];
  let operationProxyType: ProxyType | null = null;
  if (multisigAccount && accountUtils.isFlexibleMultisigAccount(multisigAccount)) {
    operationProxyType = multisigAccount.proxyType;
  }
  return nonNullable(operationProxyType) && proxyTypeIds.includes(operationProxyType);
};

const toLocalDate = (d: Date) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export const matchesDateRange = (operation: MultisigOperation, dateRange: OperationsFilterCriteria['dateRange']) => {
  if (!dateRange?.from && !dateRange?.to) return true;
  const { from, to } = dateRange;
  const txDate = new Date(operation.timestamp);

  if (from && to) {
    const fromLocal = toLocalDate(from);
    const toLocal = toLocalDate(to);
    return isWithinInterval(txDate, { start: fromLocal, end: endOfDay(toLocal) });
  }
  if (from) {
    const fromLocal = toLocalDate(from);
    return isAfter(txDate, fromLocal) || txDate.getTime() === fromLocal.getTime();
  }
  return true;
};

export const matchesSearch = (
  operation: MultisigOperation,
  searchQuery: string | undefined,
  walletNameByAccountId: Record<string, string>,
  chains: Record<ChainId, Chain>,
  multisigAccountsMap: Record<string, MultisigAccount | FlexibleMultisigAccount>,
) => {
  const query = searchQuery?.trim().toLowerCase();
  if (!query) return true;
  const walletName = (walletNameByAccountId[operation.multisigAccountId] ?? '').toLowerCase();
  const multisigAccount = multisigAccountsMap[operation.multisigAccountId];
  const isFlexibleMultisigAccount = multisigAccount && accountUtils.isFlexibleMultisigAccount(multisigAccount);
  const addressPrefix = isFlexibleMultisigAccount ? chains[operation.chainId]?.addressPrefix : undefined;
  const accountAddress = toAddress(operation.multisigAccountId, { prefix: addressPrefix }).toLowerCase();

  return (
    walletName.includes(query) || accountAddress.includes(query) || operation.callHash.toLowerCase().includes(query)
  );
};

export const filterOperation = (operation: MultisigOperation, context: OperationsFilterContext) => {
  const { filters, tab, hiddenIds, multisigAccountsMap, walletNameByAccountId, chains } = context;

  if (!matchesTab(operation, tab, hiddenIds)) return false;
  if (!matchesAccount(operation, filters.account)) return false;
  if (!matchesNetwork(operation, filters.network)) return false;
  if (!matchesTxType(operation, filters.type)) return false;
  if (!matchesProxyType(operation, filters.proxyType, multisigAccountsMap)) return false;
  if (!matchesDateRange(operation, filters.dateRange)) return false;
  if (!matchesSearch(operation, filters.searchQuery, walletNameByAccountId, chains, multisigAccountsMap)) return false;

  return true;
};
