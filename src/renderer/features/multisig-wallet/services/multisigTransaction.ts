import { type AnyDecodedTransaction } from '@/domains/network';
import { type MultisigTransaction } from '../types';

function isMultisigTransaction(transaction: AnyDecodedTransaction): transaction is MultisigTransaction {
  return transaction.section === 'multisig' && transaction.method === 'asMulti';
}

export const multisigService = {
  isMultisigTransaction,
};
