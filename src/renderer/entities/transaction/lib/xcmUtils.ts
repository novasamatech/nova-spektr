import { getXcmTransactionBeneficiaries } from '@/shared/api/xcm';
import { type DecodedTransaction, type Transaction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { isProxyTransaction } from './common/utils';

export { getXcmTransactionBeneficiaries };

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
 * Extracts the beneficiary account ID from an XCM transaction, looking through
 * a proxy wrapper. For TYPE_AND_THEN transactions that is the first deposit of
 * the customXcmOnDest program. `undefined` for a non-XCM transaction or when
 * the beneficiary can't be read.
 */
export const getXcmTransactionBeneficiary = (tx: Transaction | DecodedTransaction): AccountId | undefined => {
  const coreTx = getCoreTransaction(tx);
  if (!coreTx) return undefined;

  return getXcmTransactionBeneficiaries(coreTx)?.[0];
};
