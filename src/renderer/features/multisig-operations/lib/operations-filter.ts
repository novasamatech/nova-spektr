import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';

import {
  type Chain,
  type ChainId,
  type Contact,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxyType,
  type Wallet,
  TransactionType,
} from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DateRange } from '@/shared/ui-kit';
import { type AnyAccount, type IdentityMap, type MultisigOperation, accountService } from '@/domains/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { type OperationSearchRow } from '@/aggregates/operations-search';

import { type StatusFilterValue, getOperationSection } from './operations-sections';

export interface OperationsFilterCriteria {
  network: string[];
  type: string[];
  proxyType: string[];
  status: StatusFilterValue[];
  dateRange?: DateRange;
  searchQuery: string;
  needsMySignature: boolean;
}

export type OperationsFilterTab = 'pending' | 'history' | 'hidden';

export interface OperationsFilterContext {
  filters: OperationsFilterCriteria;
  tab: OperationsFilterTab;
  hiddenIds: string[];
  // Ids matching the search query, or `null` when there is no query. Computed
  // once for the whole list (see `buildOperationSearchRow`) rather than per
  // operation, because resolving display names is shared work.
  searchMatchedIds: Set<string> | null;
  // Ids of operations a local signatory can still act on, or `null` when the
  // "Needs my signature" toggle is off. Computed once for the whole list (see
  // `multisigOperationService.needsUserSignature`) so `filterOperation` needs
  // no wallets/chains.
  needsMySignatureIds: Set<string> | null;
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

export const matchesStatus = (operation: MultisigOperation, statuses: StatusFilterValue[], hiddenIds: string[]) => {
  if (statuses.length === 0) return true;

  // A hidden operation matches only the dedicated `hidden` status; an
  // operation never matches `drafts` (drafts are not operations).
  const section = hiddenIds.includes(operation.id) ? 'hidden' : getOperationSection(operation);

  return statuses.includes(section);
};

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

/**
 * Whether the filter narrows the list in any way: a search query, the
 * needs-my-signature toggle, a network/type/proxy-type selection, a date range,
 * or a status selection other than `in_progress`. Selecting only `in_progress`
 * matches the default view, so it narrows nothing.
 */
export const hasNarrowingFilter = (filters: OperationsFilterCriteria): boolean => {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.needsMySignature ||
    filters.network.length > 0 ||
    filters.type.length > 0 ||
    filters.proxyType.length > 0 ||
    nonNullable(filters.dateRange?.from) ||
    nonNullable(filters.dateRange?.to) ||
    filters.status.some(status => status !== 'in_progress')
  );
};

/**
 * Whether the In-progress group stays in the list even with no rows in it. The
 * merged "All operations" scope replaces the tabs, so it counts as the pending
 * view here; `hasNarrowingFilter` alone decides whether the list is narrowed —
 * a filter or search that matches nothing shows the filtered empty state
 * instead of an empty group.
 */
export const shouldAlwaysShowInProgress = ({
  tab,
  isScopeMerged,
  filter,
}: {
  tab: OperationsFilterTab;
  isScopeMerged: boolean;
  filter: OperationsFilterCriteria;
}): boolean => {
  // `isScopeMerged` is not redundant with the tab: the context model forces the tab to 'pending'
  // on the filter change that merges the scope, but that sample runs after the sectioning combine
  // has already recomputed once in the same tick with the old tab.
  return (tab === 'pending' || isScopeMerged) && !hasNarrowingFilter(filter);
};

type WalletSearchSources = {
  accounts: AnyAccount[];
  contacts: Contact[];
  identities: IdentityMap;
  chains: Record<string, Chain>;
};

export type WalletSearchEntry = Pick<Wallet, 'id' | 'name'>;

/**
 * Builds search entries with the wallet names an operation card actually
 * displays (resolved via custom name → contact → identity), not the raw stored
 * `wallet.name`.
 */
export const getWalletSearchEntries = (wallets: Wallet[], sources: WalletSearchSources): WalletSearchEntry[] => {
  return wallets.map(wallet => ({
    id: wallet.id,
    name: accountService.resolveWalletName({ wallet, ...sources }),
  }));
};

export const buildOperationSearchRow = (
  operation: MultisigOperation,
  account: MultisigAccount | FlexibleMultisigAccount,
  chains: Record<ChainId, Chain>,
  walletNames: Map<Wallet['id'], string>,
  resolveWalletName: (accountId: AccountId, chain?: Chain | null) => string | null,
): OperationSearchRow => {
  const isFlex = accountUtils.isFlexibleMultisigAccount(account);
  const initiatorChain = chains[operation.chainId] ?? null;

  return {
    id: operation.id,
    accounts: [
      {
        // Submitter column. Not `operation.multisigAccountId`: for a flexible
        // multisig that is the underlying multisig, while the row renders the
        // proxied facade. Only a flexible multisig is chain-bound.
        accountId: account.accountId,
        chain: isFlex ? (chains[account.chainId] ?? null) : null,
        walletName: walletNames.get(account.walletId) ?? null,
      },
      {
        // Initiator (row cell and expanded Depositor row) resolves by account
        // with the wallet name as fallback — search matches exactly that name.
        accountId: operation.depositor,
        chain: initiatorChain,
        walletName: resolveWalletName(operation.depositor, initiatorChain),
        walletNameAs: 'fallback',
      },
    ],
    // Rendered, but fetched only for operations that already passed the filter —
    // matching on it here would be circular.
    description: null,
    callHash: operation.callHash,
  };
};

export const filterOperation = (
  operation: MultisigOperation,
  account: MultisigAccount | FlexibleMultisigAccount,
  context: OperationsFilterContext,
) => {
  const { filters, tab, hiddenIds, searchMatchedIds, needsMySignatureIds } = context;

  if (context.isScopeMerged) {
    const isHidden = hiddenIds.includes(operation.id);
    if (tab === 'hidden') {
      // deep link into a hidden operation keeps the Hidden tab even while merged
      if (!isHidden) return false;
    } else if (isHidden && !filters.status.includes('hidden')) {
      // merged scope surfaces hidden ops only when the Status filter asks for them
      return false;
    }
  } else {
    if (!matchesTab(operation, tab, hiddenIds)) return false;
  }
  if (!matchesStatus(operation, filters.status, hiddenIds)) return false;
  if (!matchesNetwork(operation, filters.network)) return false;
  if (!matchesTxType(operation, filters.type)) return false;
  if (!matchesProxyType(filters.proxyType, account)) return false;
  if (!matchesDateRange(operation, filters.dateRange)) return false;
  if (searchMatchedIds !== null && !searchMatchedIds.has(operation.id)) return false;
  if (needsMySignatureIds !== null && !needsMySignatureIds.has(operation.id)) return false;

  return true;
};
