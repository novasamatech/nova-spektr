import { type ProxyType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type AddProxyConfirm = TxConfirmInfo & {
  proxyType: ProxyType;
  delegate: AccountId;

  fee: string;
  multisigDeposit: string;
  proxyDeposit: string;
  proxyNumber: number;
};

const confirmStore = createTransactionConfirmStore<AddProxyConfirm>({
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
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
};
