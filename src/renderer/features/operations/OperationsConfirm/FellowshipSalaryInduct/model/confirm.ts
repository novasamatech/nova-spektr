import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import { type Asset, type Wallet } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type CollectivePalletsType } from '@/domains/collectives';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';
// TODO fix cycle

export type CollectiveSalaryInductConfirm = TxConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  pallet: CollectivePalletsType;
  wallets: Wallet[];
  fee: BN;
};

const confirmStore = createTransactionConfirmStore<CollectiveSalaryInductConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirm = {
  $confirmMap: confirmStore.$confirmMap,

  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
  resetConfirm: confirmStore.resetConfirm,

  submitStarted: submitModel.events.formInitiated,
  submitFinished: submitModel.output.formSubmitted,
};
