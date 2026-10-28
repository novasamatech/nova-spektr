import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';

/**
 * Calls the app builds wrapped in a `batchAll` (unstake, start staking, unlock,
 * delegation, vested transfer).
 */
const BATCH_ALL_WRAPPED_TYPES = new Set<TransactionType>([
  TransactionType.UNSTAKE,
  TransactionType.BOND,
  TransactionType.UNLOCK,
  TransactionType.DELEGATE,
  TransactionType.UNDELEGATE,
  TransactionType.REMOVE_VOTE,
  TransactionType.VESTED_TRANSFER,
]);

/**
 * Batch shapes built by the app. A batch matches a shape when every call in it
 * belongs to that shape — any non-empty mix of the shape's calls, so a
 * remove-vote-only unlock batch or a batch of delegations alone still matches.
 */
const BATCH_SHAPES: Set<TransactionType>[] = [
  new Set([TransactionType.BOND, TransactionType.NOMINATE]),
  new Set([TransactionType.CHILL, TransactionType.UNSTAKE]),
  new Set([TransactionType.PAYOUT_STAKERS_BY_PAGE]),
  new Set([TransactionType.REMOVE_VOTE, TransactionType.UNDELEGATE, TransactionType.UNLOCK]),
  new Set([TransactionType.UNDELEGATE, TransactionType.DELEGATE]),
  new Set([TransactionType.VESTED_TRANSFER]),
  new Set([TransactionType.TRANSFER]),
  new Set([TransactionType.ADD_PROXY, TransactionType.REMOVE_PROXY]),
  new Set([TransactionType.ADD_PROXY, TransactionType.REMARK]),
];

const getBatchTransactions = (batch: Transaction | DecodedTransaction): Transaction[] => {
  return batch.args?.transactions ?? [];
};

export const isWrappedInBatchAll = (type: TransactionType): boolean => {
  return BATCH_ALL_WRAPPED_TYPES.has(type);
};

/**
 * Whether a non-empty list of batch calls matches one of the shapes the app
 * builds (see `BATCH_SHAPES`). A call without a known type never matches.
 */
export const isKnownBatchShape = (transactions: Transaction[]): boolean => {
  if (transactions.length === 0) return false;

  return BATCH_SHAPES.some(shape => transactions.every(tx => shape.has(tx.type)));
};

/**
 * Picks the transaction that represents a batch. Looks at direct children only,
 * never returns a batch and returns `null` for batches the app does not build.
 * Within a known proxy shape the proxy change (add proxy, else remove proxy)
 * represents the batch, so it is named after that change.
 */
export const findCoreBatchAll = (batch: Transaction | DecodedTransaction): Transaction | null => {
  const transactions = getBatchTransactions(batch);

  if (!isKnownBatchShape(transactions)) {
    return null;
  }

  const coreTransaction =
    transactions.find(tx => tx.type === TransactionType.ADD_PROXY) ??
    transactions.find(tx => tx.type === TransactionType.REMOVE_PROXY) ??
    transactions.find(tx => tx.type === TransactionType.UNLOCK) ??
    transactions.find(tx => isWrappedInBatchAll(tx.type)) ??
    transactions.find(tx => tx.type !== TransactionType.BATCH_ALL);

  return coreTransaction ?? null;
};

/**
 * A batch made only of delegate and undelegate calls (at least one of each).
 * Extra or nested calls disqualify the batch, so it stays a plain batch.
 */
export const isEditDelegationTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  if (transaction?.type !== TransactionType.BATCH_ALL) return false;

  const transactions = getBatchTransactions(transaction);
  const isDelegationCall = (tx: Transaction) =>
    tx.type === TransactionType.DELEGATE || tx.type === TransactionType.UNDELEGATE;

  return (
    transactions.length > 0 &&
    transactions.every(isDelegationCall) &&
    transactions.some(tx => tx.type === TransactionType.DELEGATE) &&
    transactions.some(tx => tx.type === TransactionType.UNDELEGATE)
  );
};
