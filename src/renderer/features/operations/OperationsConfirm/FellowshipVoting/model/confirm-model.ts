import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { createEvent } from 'effector';

import { type Asset, type Wallet } from '@/shared/core';
import { type CollectivePalletsType } from '@/domains/collectives';
import { networkModel } from '@/entities/network';
import { operationsModel } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { submitModel } from '@/features/operations/OperationSubmit';
// TODO fix cycle
import {
  type ConfirmInfo,
  createTransactionConfirmStore,
} from '@/features/operations/OperationsConfirm/lib/createTransactionConfirmStore';

export type CollectiveVoteConfirm = ConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  aye: true;
  pallet: CollectivePalletsType;
  wallets: Wallet[];
  poll: string;
  fee: BN;
  rank: number;
};

const sign = createEvent();

const confirmStore = createTransactionConfirmStore<CollectiveVoteConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: operationsModel.$multisigTransactions,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,

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
