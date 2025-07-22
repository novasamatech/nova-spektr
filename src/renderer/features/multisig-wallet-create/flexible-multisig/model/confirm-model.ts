import { createEvent } from 'effector';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';

export type FlexibleMultisigConfirm = TxConfirmInfo & {
  totalDeposit: string;
  multisigAccountId: AccountId;
  threshold: number;
};

const confirmStore = createTransactionConfirmStore<FlexibleMultisigConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

const startSigningFlexible = createEvent();

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $confirms: confirmStore.$confirms,

  init: confirmStore.init,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  startSigningProxy: confirmStore.startSigning,
  startSigningFlexible,

  submitStarted: submitModel.events.formInitiated,
  submitFinished: submitModel.output.formSubmitted,
};
