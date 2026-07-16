import { type Chain, type ChainId, type Contact, type Wallet, TransactionType } from '@/shared/core';
import { getNativeAsset } from '@/shared/lib/utils';
import { type AnyAccount, type IdentityMap, accountService } from '@/domains/network';
import {
  TransferTypes,
  XcmTypes,
  findCoreTransaction,
  getTransactionAmount,
  isMultiTransferTransaction,
  isVestedTransferTransaction,
} from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';

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
  wallets: Wallet[];
  accounts: AnyAccount[];
  contacts: Contact[];
  identities: IdentityMap;
};

// Types whose amount the Value column actually renders in the row (single
// calls; multi-transfer batches are matched via isMultiTransferTransaction).
const DISPLAYED_AMOUNT_TYPES = new Set<TransactionType>([
  ...TransferTypes,
  ...XcmTypes,
  TransactionType.VESTED_TRANSFER,
]);

/**
 * The amount the Value column renders for this operation, in asset units, or
 * null when the column shows nothing for it.
 */
const getDisplayedAmount = ({ operation }: OperationWithAccount, chains: SortContext['chains']): number | null => {
  const coreTx = findCoreTransaction(operation.transaction);
  if (!coreTx?.type) return null;

  if (DISPLAYED_AMOUNT_TYPES.has(coreTx.type)) {
    const info = extractTransferAmount(operation, chains[operation.chainId] ?? null);
    if (!info) return null;

    const amount = Number(info.rawAmount) / 10 ** info.assetPrecision;

    return Number.isNaN(amount) ? null : amount;
  }

  // Multi-transfer batches and vested transfers with a cliff or multi-entry
  // schedule (utility.batchAll of vestedTransfer calls) render the summed
  // native-asset amount in the column.
  if (isMultiTransferTransaction(coreTx) || isVestedTransferTransaction(coreTx)) {
    const chain = chains[operation.chainId];
    const nativeAsset = chain ? getNativeAsset(chain.assets) : null;
    const transactions = coreTx.args['transactions'];
    if (!nativeAsset || !Array.isArray(transactions)) return null;

    const total = transactions.reduce((sum, tx) => sum + (Number(getTransactionAmount(tx)) || 0), 0);

    return total / 10 ** nativeAsset.precision;
  }

  return null;
};

/**
 * Value sort key groups by what the user sees: >= 0 — the displayed amount
 * (sorted numerically within the group); -1 — the operation carries some value
 * the column does not render (batch contents, staking/governance amounts,
 * transfer all); -2 — no value at all.
 */
const getValueKey = (item: OperationWithAccount, chains: SortContext['chains']): number => {
  const displayed = getDisplayedAmount(item, chains);
  if (displayed !== null) return displayed;

  return hasTransferAmount(item.operation) ? -1 : -2;
};

// Mirrors NamedAccount in the Submitter column: a wallet-backed account renders
// its resolved wallet name; contact-backed multisigs (walletId -1) resolve
// through contacts/identity down to a short-address fallback.
const getSubmitterKey = ({ account }: OperationWithAccount, context: SortContext): string => {
  const { wallets, accounts, contacts, identities, chains } = context;
  const wallet = wallets.find(w => w.id === account.walletId);

  const name = wallet
    ? accountService.resolveWalletName({ wallet, accounts, contacts, identities, chains })
    : accountService.resolveAccountName({
        accountId: account.accountId,
        chain: accountUtils.isFlexibleMultisigAccount(account) ? chains[account.chainId] : undefined,
        accounts,
        contacts,
        identities,
        chains,
      });

  return name.toLowerCase();
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
      .map(item => ({ item, key: getValueKey(item, context.chains) }))
      .sort((a, b) => (a.key - b.key) * direction || compareNewest(a.item, b.item))
      .map(({ item }) => item);
  }

  const getSortKey = (item: OperationWithAccount): string => {
    if (sort.by === 'type') return getFilterableTxType(item.operation);

    return getSubmitterKey(item, context);
  };

  return items
    .map(item => ({ item, key: getSortKey(item) }))
    .sort((a, b) => a.key.localeCompare(b.key) * direction || compareNewest(a.item, b.item))
    .map(({ item }) => item);
};
