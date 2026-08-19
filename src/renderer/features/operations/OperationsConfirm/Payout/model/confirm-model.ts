import { type Asset } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';

/**
 * A claim carries no amount of its own.
 *
 * `payout_stakers_by_page` names an (era, validator, page) and pays whatever
 * that page turns out to owe every nominator on it — the figure is settled by
 * the runtime at execution, not by the call. Re-deriving it here would mean
 * re-running the whole unclaimed-payout derivation against the chain as it is
 * now, and a number derived at confirm time can disagree with what actually
 * lands.
 *
 * So the confirm describes the _scope_ of the claim instead: how many payouts
 * it settles, over how many eras, across how many validators.
 */
export type PayoutConfirm = TxConfirmInfo & {
  asset: Asset;
  fee: string;
  totalFee: string;
  multisigDeposit?: string;
  signingPath?: PathNode[];
  /** `payout_stakers_by_page` calls the transaction carries. */
  payoutCount: number;
  eraCount: number;
  validatorCount: number;
};

const confirmStore = createTransactionConfirmStore<PayoutConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  init: confirmStore.init,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  startSigning: confirmStore.startSigning,

  submitStarted: submitModel.events.formInitiated,
  submitFinished: submitModel.output.formSubmitted,
};
