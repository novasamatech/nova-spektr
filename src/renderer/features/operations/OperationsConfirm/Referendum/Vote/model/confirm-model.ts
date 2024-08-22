import { type ApiPromise } from '@polkadot/api';
import { createEvent } from 'effector';

import { type Asset, type Conviction } from '@/shared/core';
import { walletModel } from '@/entities/wallet';
import { submitModel } from '@/features/operations/OperationSubmit';
import { type ConfirmInfo, createTransactionConfirmStore } from '@/features/operations/OperationsConfirm';

export type VoteConfirm = ConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  initialConviction: Conviction;
};

const sign = createEvent();

const confirmStore = createTransactionConfirmStore<VoteConfirm>({
  $wallets: walletModel.$wallets,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  events: {
    sign,
    addConfirms: confirmStore.addConfirms,
    replaceConfirm: confirmStore.replaceConfirm,
    fillConfirm: confirmStore.fillConfirm,
    resetConfirm: confirmStore.resetConfirm,

    submitStarted: submitModel.events.formInitiated,
    submitFinished: submitModel.output.formSubmitted,
  },
};
