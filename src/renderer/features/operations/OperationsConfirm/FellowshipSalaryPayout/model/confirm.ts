import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { createEvent } from 'effector';

import { type Asset, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '@/domains/collectives';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { accountMultisigOperations } from '@/aggregates/account-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';
// TODO fix cycle
import {
  type ConfirmInfo,
  createTransactionConfirmStore,
} from '@/features/operations/OperationsConfirm/lib/createTransactionConfirmStore';

export type CollectiveSalaryPayoutConfirm = ConfirmInfo & {
  api: ApiPromise;
  asset: Asset;
  pallet: CollectivePalletsType;
  beneficiary: AccountId | null;
  wallets: Wallet[];
  fee: BN;
};

const sign = createEvent();

const confirmStore = createTransactionConfirmStore<CollectiveSalaryPayoutConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: accountMultisigOperations.$accountOperations,
});

export const confirm = {
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
