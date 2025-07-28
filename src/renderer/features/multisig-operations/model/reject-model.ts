import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Transaction } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type MultisigOperation, multisigOperationService } from '@/domains/network';
import { transactionBuilder } from '@/entities/transaction';

import { operationsContextModel } from './context';

type GetMultisigType = {
  signerAccountId: AccountId;
  chain: Chain;
  operation: MultisigOperation;
};

const flow = createGate<{ chain: Chain | null; signer: AnyAccount | null }>({
  defaultState: { chain: null, signer: null },
});

const getMultisigTx = createEvent<GetMultisigType>();

const $transaction = createStore<Transaction | null>(null).reset(flow.open);

sample({
  clock: getMultisigTx,
  source: {
    account: operationsContextModel.$account,
  },
  filter: ({ account }) => nonNullable(account),
  fn: ({ account }, { signerAccountId, chain, operation }) => {
    const otherSignatories = multisigOperationService.getOtherSignatories(account!, signerAccountId);

    return transactionBuilder.buildRejectMultisigTx({
      chain,
      signerAccountId,
      threshold: account!.threshold,
      otherSignatories,
      tx: operation,
    });
  },
  target: $transaction,
});

export const rejectModel = {
  flow,
  $transaction,

  events: {
    getMultisigTx,
  },
};
