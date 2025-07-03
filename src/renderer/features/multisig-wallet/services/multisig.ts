import { type ApiPromise } from '@polkadot/api';

import { type MultisigThreshold } from '@/shared/core';
import { type AnyDecodedTransaction } from '@/domains/network';
import { type MultisigTransaction } from '../types';

function isMultisigTransaction(transaction: AnyDecodedTransaction): transaction is MultisigTransaction {
  return transaction.section === 'multisig' && transaction.method === 'asMulti';
}

function getMultisigDeposit(threshold: MultisigThreshold, api: ApiPromise) {
  const { depositFactor, depositBase } = api.consts.multisig;
  const deposit = depositFactor.muln(threshold).add(depositBase);

  return deposit;
}

export const multisigService = {
  isMultisigTransaction,
  getMultisigDeposit,
};
