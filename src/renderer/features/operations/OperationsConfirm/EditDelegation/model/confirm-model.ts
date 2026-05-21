import { type BN } from '@polkadot/util';

import { type Asset, type Conviction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type EditDelegationConfirm = TxConfirmInfo & {
  transferable: string;
  locks: BN;

  tracks: number[];
  target: AccountId;
  conviction: Conviction;
  previousConviction: Conviction;
  balance: string;

  asset: Asset;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  signingPath?: PathNode[];
};

const confirmStore = createTransactionConfirmStore<EditDelegationConfirm>({
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
