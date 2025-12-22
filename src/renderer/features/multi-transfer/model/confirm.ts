import { type BN } from '@polkadot/util';

import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type MultiTransferRow, type ValidationIssue } from '@/entities/multi-transfer';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type MultiTransferConfirm = TxConfirmInfo & {
  fee: string;
  amount: string;
  hasMultisigAccount: boolean;
  multisigDeposit: BN;
  transfers: MultiTransferRow[];
  issues: ValidationIssue[] | null;
};

const confirmStore = createTransactionConfirmStore<MultiTransferConfirm>({
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
