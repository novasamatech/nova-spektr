import { type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';

export type RestakeConfirm = TxConfirmInfo & {
  asset: Asset;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const confirmStore = createTransactionConfirmStore<RestakeConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
};
