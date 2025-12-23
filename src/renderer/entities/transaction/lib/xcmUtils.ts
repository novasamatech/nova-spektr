import { extractBeneficiaryFromXcmInstructions } from '@/shared/api/xcm';
import { type DecodedTransaction, type Transaction } from '@/shared/core';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';

import { isProxyTransaction, isXcmTransaction } from './common/utils';

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
 * Extracts the beneficiary account ID from an XCM transaction. For
 * TYPE_AND_THEN transactions, extracts from customXcmOnDest XCM instructions.
 * For other XCM transactions, uses the beneficiary field if available.
 */
export const getXcmTransactionBeneficiary = (tx: Transaction | DecodedTransaction): AccountId | undefined => {
  const coreTx = getCoreTransaction(tx);
  if (!coreTx) return undefined;

  const isXcm = isXcmTransaction(coreTx);
  if (!isXcm) return undefined;

  // For XCM transactions with beneficiary field, use beneficiary (not dest)
  if (coreTx.args.beneficiary) {
    const beneficiary = pjsSchema.accountId.safeParse(coreTx.args.beneficiary);
    if (beneficiary.success) {
      return beneficiary.data;
    }
  }

  try {
    if (typeof coreTx.args.customXcmOnDest !== 'string') return undefined;

    return extractBeneficiaryFromXcmInstructions(coreTx.args.customXcmOnDest);
  } catch {
    console.error('Error extracting beneficiary from XCM instructions', coreTx.args.customXcmOnDest);
    return undefined;
  }
};
