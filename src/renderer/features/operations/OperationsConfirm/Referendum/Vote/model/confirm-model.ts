import { type BN } from '@polkadot/util';
import { sample } from 'effector';

import { type Asset, type Conviction } from '@shared/core';
import { nonNullable } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { type ConfirmInfo, createTransactionConfirmStore } from '../../../lib/createTransactionConfirmStore';

export type VoteConfirm = ConfirmInfo & {
  asset: Asset;
  initialAmount: BN;
  initialConviction: Conviction;
};

const confirmStore = createTransactionConfirmStore<VoteConfirm>({
  $wallets: walletModel.$wallets,
  signRequest: signModel.events.formInitiated,
});

sample({
  clock: signModel.output.formSubmitted,
  source: confirmStore.$confirmMap,
  filter: (stores) => nonNullable(stores[0]),
  fn: (stores, signParams) => {
    const store = stores[0];
    const { meta } = store;

    return {
      signatures: signParams.signatures,
      txPayloads: signParams.txPayloads,

      chain: meta.chain,
      account: meta.account,
      signatory: meta.signatory,
      description: meta.description,
      wrappedTxs: [meta.wrappedTransactions.wrappedTx],
      coreTxs: [meta.wrappedTransactions.coreTx],
      multisigTxs: meta.wrappedTransactions.multisigTx ? [meta.wrappedTransactions.multisigTx] : [],
    };
  },
  target: submitModel.events.formInitiated,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  events: {
    sign: confirmStore.sign,
    addConfirms: confirmStore.addConfirms,
    replaceConfirm: confirmStore.replaceConfirm,
    fillConfirm: confirmStore.fillConfirm,

    signFinished: signModel.output.formSubmitted,
    submitStarted: submitModel.events.formInitiated,
    submitFinished: submitModel.output.formSubmitted,
  },
};
