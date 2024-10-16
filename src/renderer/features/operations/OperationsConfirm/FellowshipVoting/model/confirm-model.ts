import { type ApiPromise } from '@polkadot/api';
import { createEvent, sample } from 'effector';

import { type Asset, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { submitModel } from '@/features/operations/OperationSubmit';
import { type ConfirmInfo, createTransactionConfirmStore } from '@/features/operations/OperationsConfirm';
import { type SigningPayload, signModel } from '../../../OperationSign';

export type VoteConfirm = ConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  aye: true;
  wallets: Wallet[];
  poll: string;
};

const sign = createEvent();
const signPayloadCreated = createEvent<SigningPayload | null>();

const confirmStore = createTransactionConfirmStore<VoteConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

sample({
  clock: sign,
  source: { transactions: confirmStore.$confirmMap, account: votingStatusModel.$votingAccount, chain: $chain },
  fn: ({ transactions, account, chain }) => {
    if (nullable(transactions) || nullable(account) || nullable(chain)) return null;

    return {
      chain,
      account,
      transaction: transactions.wrappedTx,
    };
  },
  target: signPayloadCreated,
});

sample({
  clock: signPayloadCreated.filter({ fn: nonNullable }),
  fn: (payload) => ({ signingPayloads: [payload] }),
  target: signModel.events.formInitiated,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,

  events: {
    sign,
    addConfirms: confirmStore.addConfirms,
    replaceWithConfirm: confirmStore.replaceWithConfirm,
    fillConfirm: confirmStore.fillConfirm,
    resetConfirm: confirmStore.resetConfirm,

    submitStarted: submitModel.events.formInitiated,
    submitFinished: submitModel.output.formSubmitted,
  },
};
