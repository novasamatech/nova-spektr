import { extractAccountIdFromLocation, extractBeneficiariesFromXcmInstructions } from '@/shared/api/xcm';
import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { isProxyTransaction, isXcmTransaction } from './common/utils';

/** XCM calls whose recipients live in the `customXcmOnDest` program. */
const XCM_PROGRAM_TYPES = [
  TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN,
  TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN,
];

/** XTokens calls: the recipient is a junction of the `dest` location. */
const XTOKENS_TYPES = [
  TransactionType.XTOKENS_TRANSFER,
  TransactionType.XTOKENS_TRANSFER_MULTIASSET,
  TransactionType.XTOKENS_TRANSFER_MULTIASSETS,
];

/**
 * Gets the core transaction from a potentially wrapped transaction
 */
const getCoreTransaction = (tx: Transaction | DecodedTransaction): Transaction | DecodedTransaction | undefined => {
  if (isProxyTransaction(tx)) {
    return tx.args.transaction;
  }
  return tx;
};

/**
 * A beneficiary is either a plain address / account id (transactions built in
 * the app) or a versioned location — decoded call data stringifies it.
 */
const getLocationAccountId = (value: unknown): AccountId | undefined => {
  if (typeof value === 'string' && validateAddress(value)) return toAccountId(value);

  return extractAccountIdFromLocation(value);
};

/**
 * Every account an XCM transfer pays. `[]` for a non-XCM transaction, `null`
 * when the transaction is an XCM transfer but its recipients can't be read.
 */
export const getXcmTransactionBeneficiaries = (tx: Transaction | DecodedTransaction): AccountId[] | null => {
  if (!isXcmTransaction(tx) || !tx.type) return [];

  if (XCM_PROGRAM_TYPES.includes(tx.type)) {
    return extractBeneficiariesFromXcmInstructions(tx.args.customXcmOnDest);
  }

  const beneficiary = getLocationAccountId(XTOKENS_TYPES.includes(tx.type) ? tx.args.dest : tx.args.beneficiary);

  return beneficiary ? [beneficiary] : null;
};

/**
 * Extracts the beneficiary account ID from an XCM transaction, looking through
 * a proxy wrapper. For TYPE_AND_THEN transactions that is the first deposit of
 * the customXcmOnDest program.
 */
export const getXcmTransactionBeneficiary = (tx: Transaction | DecodedTransaction): AccountId | undefined => {
  const coreTx = getCoreTransaction(tx);
  if (!coreTx) return undefined;

  return getXcmTransactionBeneficiaries(coreTx)?.[0];
};
