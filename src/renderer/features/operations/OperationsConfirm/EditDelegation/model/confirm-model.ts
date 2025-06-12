import { type BN } from '@polkadot/util';

import { type Address, type Asset, type Conviction } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';

export type EditDelegationConfirm = TxConfirmInfo & {
  transferable: string;
  locks: BN;

  tracks: number[];
  target: Address;
  conviction: Conviction;
  previousConviction: Conviction;
  balance: string;

  asset: Asset;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const confirmStore = createTransactionConfirmStore<EditDelegationConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
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
