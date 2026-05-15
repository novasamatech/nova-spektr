import { type ApiPromise } from '@polkadot/api';

import { type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type UnstakeConfirm = TxConfirmInfo & {
  amount: string;
  asset: Asset;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  api: ApiPromise;
  signingPath?: PathNode[];
};

const confirmStore = createTransactionConfirmStore<UnstakeConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirms: confirmStore.$confirms,
  $confirmStore: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $apis: networkModel.$apis,

  formInitiated: confirmStore.init,
  startSigning: confirmStore.startSigning,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  init: confirmStore.init,
};
