import { type ApiPromise } from '@polkadot/api';
import { createEvent } from 'effector';

import { type AccountVote, type Asset, type ReferendumId, type TrackId } from '@/shared/core';
import { walletModel } from '@/entities/wallet';
import { submitModel } from '@/features/operations/OperationSubmit';
import { type ConfirmInfo, createTransactionConfirmStore } from '@/features/operations/OperationsConfirm';

export type RemoveVoteConfirm = ConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  referendumId: ReferendumId;
  trackId: TrackId;
  vote: AccountVote;
};

const sign = createEvent();

const confirmStore = createTransactionConfirmStore<RemoveVoteConfirm>({
  $wallets: walletModel.$wallets,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  events: {
    sign,
    addConfirms: confirmStore.addConfirms,
    replaceWithConfirm: confirmStore.replaceWithConfirm,
    fillConfirm: confirmStore.fillConfirm,

    submitStarted: submitModel.events.formInitiated,
    submitFinished: submitModel.output.formSubmitted,
  },
};
