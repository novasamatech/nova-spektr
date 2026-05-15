import { type ApiPromise } from '@polkadot/api';

import { type AccountVote, type Asset, type ReferendumId, type TrackId } from '@/shared/core';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';

export type RemoveVoteConfirm = TxConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  votes: {
    referendum: ReferendumId;
    track: TrackId;
    vote?: AccountVote;
  }[];
  signingPath?: PathNode[];
};

const confirmStore = createTransactionConfirmStore<RemoveVoteConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $confirms: confirmStore.$confirms,
  $isMultisigExists: confirmStore.$isMultisigExists,

  startSigning: confirmStore.startSigning,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  init: confirmStore.init,
  resetConfirm: confirmStore.resetConfirm,
};
