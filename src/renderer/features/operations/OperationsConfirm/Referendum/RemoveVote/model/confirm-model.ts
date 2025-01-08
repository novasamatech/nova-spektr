import { type ApiPromise } from '@polkadot/api';
import { createEvent } from 'effector';

import { type AccountVote, type Asset, type ReferendumId, type TrackId } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { submitModel } from '@/features/operations/OperationSubmit';
import {
  type ConfirmInfo,
  createTransactionConfirmStore,
} from '@/features/operations/OperationsConfirm/lib/createTransactionConfirmStore';

export type RemoveVoteConfirm = ConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  votes: {
    referendum: ReferendumId;
    track: TrackId;
    vote?: AccountVote;
  }[];
};

const sign = createEvent();

const confirmStore = createTransactionConfirmStore<RemoveVoteConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,

  events: {
    sign,
    addConfirms: confirmStore.addConfirms,
    replaceWithConfirm: confirmStore.replaceWithConfirm,
    fillConfirm: confirmStore.fillConfirm,
    resetConfirm: confirmStore.resetConfirm,

    submitStarted: submitModel.events.formInitiated,
    submitFinished: submitModel.output.formSubmitted,
  },
};
