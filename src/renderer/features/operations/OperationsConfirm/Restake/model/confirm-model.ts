import { type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type RestakeConfirm = TxConfirmInfo & {
  asset: Asset;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  signingPath?: PathNode[];
};

const confirmStore = createTransactionConfirmStore<RestakeConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirms: confirmStore.$confirms,
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
};
