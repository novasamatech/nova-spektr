import { type ApiPromise } from '@polkadot/api';

import { type AccountVote, type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { submitModel } from '@/features/operations/OperationSubmit';

export type VoteConfirm = TxConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  existingVote: AccountVote | null;
};

const confirmStore = createTransactionConfirmStore<VoteConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  events: {
    startSigning: confirmStore.startSigning,
    addConfirms: confirmStore.addConfirms,
    replaceWithConfirm: confirmStore.replaceWithConfirm,
    fillConfirm: confirmStore.init,
    resetConfirm: confirmStore.resetConfirm,

    submitStarted: submitModel.events.formInitiated,
    submitFinished: submitModel.output.formSubmitted,
  },
};
