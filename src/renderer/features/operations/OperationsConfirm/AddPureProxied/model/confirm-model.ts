import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type AddPureProxiedConfirm = TxConfirmInfo & {
  proxyDeposit: string;
  fee: string;
  multisigDeposit: string;
  signingPath?: PathNode[];
};

const confirmStore = createTransactionConfirmStore<AddPureProxiedConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirmStore: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $confirmed: confirmStore.$confirmed,
  $confirms: confirmStore.$confirms,

  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
  confirmed: confirmStore.confirmed,
  follow: confirmStore.follow,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
};
