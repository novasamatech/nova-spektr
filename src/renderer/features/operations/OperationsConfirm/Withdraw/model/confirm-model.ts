import { type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';

export type WithdrawConfirm = TxConfirmInfo & {
  asset: Asset;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit?: string;
};

const confirmStore = createTransactionConfirmStore<WithdrawConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  init: confirmStore.init,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  startSigning: confirmStore.startSigning,

  submitStarted: submitModel.events.formInitiated,
  submitFinished: submitModel.output.formSubmitted,
};
