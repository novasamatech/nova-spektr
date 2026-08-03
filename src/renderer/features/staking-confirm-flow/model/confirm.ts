import { createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { type ConfirmFlowConfirm } from '../types';

const confirmStore = createTransactionConfirmStore<ConfirmFlowConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirmStore: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $confirms: confirmStore.$confirms,

  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
  resetConfirm: confirmStore.resetConfirm,
};
