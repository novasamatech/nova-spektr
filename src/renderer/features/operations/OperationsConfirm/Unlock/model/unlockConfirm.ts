import { type BN } from '@polkadot/util';

import { type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type UnlockConfirm = TxConfirmInfo & {
  amount: string;
  asset: Asset;
  totalLock: BN;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const confirmStore = createTransactionConfirmStore<UnlockConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const unlockConfirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $confirms: confirmStore.$confirms,

  init: confirmStore.init,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  startSigning: confirmStore.startSigning,
};
