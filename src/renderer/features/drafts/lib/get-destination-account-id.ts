import { type DecodedTransaction } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { getXcmTransactionBeneficiary, isTransferTransaction, isXcmTransaction } from '@/entities/transaction';

export const getDestinationAccountId = (coreTx: DecodedTransaction | null): AccountId | null => {
  if (!coreTx) return null;

  if (isXcmTransaction(coreTx)) {
    return getXcmTransactionBeneficiary(coreTx) ?? null;
  }

  if (!isTransferTransaction(coreTx) || !coreTx.args?.dest) return null;

  try {
    return toAccountId(coreTx.args.dest);
  } catch {
    return null;
  }
};
