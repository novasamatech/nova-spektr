import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';

import {
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxyType,
  type Wallet,
  TransactionType,
} from '@/shared/core';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import { type DateRange } from '@/shared/ui-kit';
import { type MultisigOperation } from '@/domains/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';

import { type OperationSection, getOperationSection } from './operations-sections';

export interface OperationsFilterCriteria {
  network: string[];
  type: string[];
  proxyType: string[];
  status: OperationSection[];
  dateRange?: DateRange;
  searchQuery: string;
}

export type OperationsFilterTab = 'pending' | 'history' | 'hidden';

export interface OperationsFilterContext {
  filters: OperationsFilterCriteria;
  tab: OperationsFilterTab;
  hiddenIds: string[];
  multisigWallets: Pick<Wallet, 'id' | 'name'>[];
  chains: Record<ChainId, Chain>;
  // Any non-search filter active → tabs collapse to "All operations".
  isScopeMerged: boolean;
}

export function findAccountForOperation(
  operation: MultisigOperation,
  multisigAccounts: (MultisigAccount | FlexibleMultisigAccount)[],
): MultisigAccount | FlexibleMultisigAccount | undefined {
  if (operation.proxiedAccountId) {
    return multisigAccounts.find(
      a =>
        accountUtils.isFlexibleMultisigAccount(a) &&
        a.accountId === operation.proxiedAccountId &&
        a.multisigAccountId === operation.multisigAccountId,
    );
  }

  return multisigAccounts.find(a => {
    if (accountUtils.isMultisigAccount(a)) {
      return a.accountId === operation.multisigAccountId;
    }
    if (accountUtils.isFlexibleMultisigAccount(a)) {
      return a.multisigAccountId === operation.multisigAccountId;
    }
    return false;
  });
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

export const matchesStatus = (operation: MultisigOperation, statuses: OperationSection[]) =>
  statuses.length === 0 || statuses.includes(getOperationSection(operation));

export const matchesNetwork = (operation: MultisigOperation, networkIds: string[]) => {
  if (networkIds.length === 0) return true;
  const xcmDestination = operation.transaction?.args.destinationChain;
  return networkIds.includes(operation.chainId) || networkIds.includes(xcmDestination);
};

export const matchesTxType = (operation: MultisigOperation, typeIds: string[]) =>
  typeIds.length === 0 || typeIds.includes(getFilterableTxType(operation));

export const matchesProxyType = (proxyTypeIds: string[], account: MultisigAccount | FlexibleMultisigAccount) => {
  if (proxyTypeIds.length === 0) return true;
  let operationProxyType: ProxyType | null = null;
  if (accountUtils.isFlexibleMultisigAccount(account)) {
    operationProxyType = account.proxyType;
  }
  return nonNullable(operationProxyType) && proxyTypeIds.includes(operationProxyType);
};

export const matchesDateRange = (operation: MultisigOperation, dateRange: OperationsFilterCriteria['dateRange']) => {
  if (!dateRange?.from && !dateRange?.to) return true;
  const { from, to } = dateRange;
  const txDate = new Date(operation.timestamp);

  if (from && to) {
    return isWithinInterval(txDate, { start: startOfDay(from), end: endOfDay(to) });
  }
  if (from) {
    return isAfter(txDate, startOfDay(from)) || txDate.getTime() === startOfDay(from).getTime();
  }
  return true;
};

export const matchesSearch = (
  operation: MultisigOperation,
  searchQuery: string | undefined,
  chains: Record<ChainId, Chain>,
  account: MultisigAccount | FlexibleMultisigAccount,
  multisigWallets: Pick<Wallet, 'id' | 'name'>[],
) => {
  const query = searchQuery?.trim().toLowerCase();
  if (!query) return true;

  const wallet = multisigWallets.find(w => w.id === account.walletId);
  const walletName = (wallet?.name ?? '').toLowerCase();
  const isFlex = accountUtils.isFlexibleMultisigAccount(account);
  const addressPrefix = isFlex ? chains[operation.chainId]?.addressPrefix : undefined;
  const accountAddress = toAddress(operation.multisigAccountId, { prefix: addressPrefix }).toLowerCase();

  return (
    walletName.includes(query) || accountAddress.includes(query) || operation.callHash.toLowerCase().includes(query)
  );
};

export const filterOperation = (
  operation: MultisigOperation,
  account: MultisigAccount | FlexibleMultisigAccount,
  context: OperationsFilterContext,
) => {
  const { filters, tab, hiddenIds, multisigWallets, chains } = context;

  const isHidden = hiddenIds.includes(operation.id);
  if (context.isScopeMerged) {
    // merged scope spans all statuses but never surfaces hidden ops outside the Hidden tab
    if (tab === 'hidden' ? !isHidden : isHidden) return false;
  } else {
    if (!matchesTab(operation, tab, hiddenIds)) return false;
  }
  if (!matchesStatus(operation, filters.status)) return false;
  if (!matchesNetwork(operation, filters.network)) return false;
  if (!matchesTxType(operation, filters.type)) return false;
  if (!matchesProxyType(filters.proxyType, account)) return false;
  if (!matchesDateRange(operation, filters.dateRange)) return false;
  if (!matchesSearch(operation, filters.searchQuery, chains, account, multisigWallets)) return false;

  return true;
};
