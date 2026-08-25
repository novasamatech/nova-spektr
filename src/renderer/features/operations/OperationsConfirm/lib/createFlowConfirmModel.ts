import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

/**
 * The confirm store every dashboard staking flow owns, bound to the app-wide
 * wallets, apis and the selected wallet's pending multisig operations.
 *
 * One instance per flow: the store is keyed by the flow's own confirm payload,
 * and `init` / `resetConfirm` are the flow's to call.
 */
export const createFlowConfirmModel = <Input extends TxConfirmInfo>() => {
  const confirmStore = createTransactionConfirmStore<Input>({
    $wallets: walletModel.$wallets,
    $apis: networkModel.$apis,
    $multisigTransactions: selectedWalletMultisigOperations.$list,
  });

  return {
    $confirmStore: confirmStore.$confirmMap,
    $isMultisigExists: confirmStore.$isMultisigExists,
    $confirms: confirmStore.$confirms,

    init: confirmStore.init,
    startSigning: confirmStore.startSigning,
    resetConfirm: confirmStore.resetConfirm,
  };
};
