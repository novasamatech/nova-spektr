import { type Address, type Asset, type Validator } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type BondNominateConfirm = TxConfirmInfo & {
  validators: Validator[];
  amount: string;
  destination: Address;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  asset: Asset;
  signingPath?: PathNode[];
};

const confirmStore = createTransactionConfirmStore<BondNominateConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirms: confirmStore.$confirms,
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $apis: networkModel.$apis,

  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
};
