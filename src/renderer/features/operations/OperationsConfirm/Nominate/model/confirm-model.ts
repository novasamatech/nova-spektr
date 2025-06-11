import { type ApiPromise } from '@polkadot/api';

import { type Asset, type Validator } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';

export type NominateConfirm = TxConfirmInfo & {
  asset: Asset;
  validators: Validator[];

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  api: ApiPromise;
};

const confirmStore = createTransactionConfirmStore<NominateConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

export const confirmModel = {
  $confirms: confirmStore.$confirms,
  $confirmStore: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  formInitiated: confirmStore.init,
  startSigning: confirmStore.startSigning,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  init: confirmStore.init,
};
