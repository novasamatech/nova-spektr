import { type Chain, ChainOptions, type MultisigAccount } from '@/shared/core';
import { merge } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type MultisigEvent, type MultisigOperation } from './types';

function getOtherSignatories(account: MultisigAccount, signer: AccountId) {
  return (
    Array.from(account.signatories)
      .map(s => s.accountId)
      /**
       * Public keys of signers' wallets are compared byte-for-byte and sorted
       * ascending before being used to generate the multisig address. For
       * example, consider the scenario with three addresses, A, B, and C,
       * starting with 5FUGT, 5HMfS, and 5GhKJ. If we build the ABC multisig
       * with the accounts in that specific order (i.e. first A, then B, and C),
       * the real order of the accounts in the multisig will be ACB. If, in the
       * Extrinsic tab, we initiate a multisig call with C, the order of the
       * other signatories will be first A, then B. If we put first B, then A,
       * the transaction will fail.
       */
      .sort((a, b) => a.localeCompare(b))
      .filter(account => account !== signer)
  );
}

function isMultisigSupported(chain: Chain) {
  return chain.options?.includes(ChainOptions.MULTISIG) ?? false;
}

const isSameMultisig = (a: MultisigOperation, b: MultisigOperation) => {
  const isSameCallHash = a.callHash === b.callHash;
  const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;
  const isSameAccount = a.accountId === b.accountId;

  return isSameCallHash && isSameTimepoint && isSameAccount;
};

const isSameEvent = (a: MultisigEvent, b: MultisigEvent) => {
  const isSameAccount = a.accountId === b.accountId;
  const isSameTimepoint = a.blockCreated === b.blockCreated && a.indexCreated === b.indexCreated;

  return isSameAccount && isSameTimepoint;
};

const mergeEvents = (oldEvents: MultisigEvent[], events: MultisigEvent[]) =>
  merge({
    a: oldEvents,
    b: events,
    mergeBy: a => [a.blockCreated, a.indexCreated, a.accountId, a.status],
    filter: (a, b) => !isSameEvent(a, b),
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });

const mergeMultisigOperations = (
  oldMultisigs: MultisigOperation[],
  newMultisigs: MultisigOperation[],
): MultisigOperation[] =>
  merge({
    a: oldMultisigs,
    b: newMultisigs,
    mergeBy: a => [a.callHash, a.blockCreated, a.indexCreated, a.chainId, a.accountId],
    sort: (a, b) => a.blockCreated - b.blockCreated,
  });

export const multisigOperationService = {
  isSameMultisig,
  isSameEvent,

  mergeEvents,
  mergeMultisigOperations,

  isMultisigSupported,
  getOtherSignatories,
};
