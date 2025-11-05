import { type BN } from '@polkadot/util';

import { type Asset, type Wallet } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type Evidence, type Member, type Track } from '@/domains/collectives';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';

export type CollectiveEvidenceVoteConfirm = TxConfirmInfo & {
  asset: Asset;
  wallets: Wallet[];
  fee: BN;
  aye: boolean;
  tracks: Track[];
  maxRank: number;
  votingMember: Member;
  proposerMember: Member;
  evidence: Evidence;
};

const confirmStore = createTransactionConfirmStore<CollectiveEvidenceVoteConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,

  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
  resetConfirm: confirmStore.resetConfirm,

  submitStarted: submitModel.events.formInitiated,
  submitFinished: submitModel.output.formSubmitted,
};
