import { type ApiPromise } from '@polkadot/api';

import { AccountType, CryptoType, type MultisigSignatoryAccount, type Signatory, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyDecodedTransaction } from '@/domains/network';
import { type MultisigTransaction } from '../types';

function isMultisigTransaction(transaction: AnyDecodedTransaction): transaction is MultisigTransaction {
  return transaction.section === 'multisig' && transaction.method === 'asMulti';
}

function getMultisigDeposit(threshold: number, api: ApiPromise) {
  const { depositFactor, depositBase } = api.consts.multisig;
  const deposit = depositFactor.muln(threshold).add(depositBase);

  return deposit;
}

function createSignatoryVirtualAccount(
  signatory: Signatory,
  multisigAccountId: AccountId,
  walletId: number,
): MultisigSignatoryAccount {
  return {
    accountType: AccountType.MULTISIG_SIGNATORY,
    accountId: signatory.accountId,
    id: signatory.id ? signatory.id.toString() : `${multisigAccountId} -> ${signatory.accountId}`,
    name: signatory.name ?? '',
    walletId,
    cryptoType: CryptoType.SR25519,
    type: 'universal',
    signingType: SigningType.WATCH_ONLY,
  };
}

export const multisigService = {
  isMultisigTransaction,
  getMultisigDeposit,
  createSignatoryVirtualAccount,
};
