import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createStore, sample } from 'effector';
import { z } from 'zod';

import { type Address } from '@/shared/core';
import { nonNullable, toAccountId } from '@/shared/lib/utils';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';

import { flexibleMultisigFeature } from './feature';

export type FlexibleMultisigConfirm = TxConfirmInfo & {
  totalDeposit: string;
  multisigAccountId: AccountId;
  threshold: number;
};

const confirmStore = createTransactionConfirmStore<FlexibleMultisigConfirm>({
  $wallets: walletModel.$wallets,
  $apis: networkModel.$apis,
  $multisigTransactions: selectedWalletMultisigOperations.$list,
});

const $api = combine(flexibleMultisigFeature.state, (state): ApiPromise | null => {
  if (state.status !== 'running') return null;
  return state.data.api;
});

type SubscribePureEvent = {
  api: ApiPromise;
  accounts: AnyAccount[];
};

const subscribePureEventFx = createEffect(({ api, accounts }: SubscribePureEvent): Promise<Address> => {
  return new Promise(resolve => {
    const eventSchema = z.object({
      proxyType: z.string(),
      who: z.string(),
      pure: z.string(),
    });

    const unsubscribe = polkadotjsHelpers.subscribeSystemEvents(
      { api, section: `proxy`, methods: ['PureCreated'] },
      event => {
        const data = eventSchema.parse(event.data.toHuman());
        const accountId = toAccountId(data.who);

        if (!data || !accounts.some(a => a.accountId === accountId)) return;

        resolve(data.pure);
      },
    );

    unsubscribe.then(fn => fn());
  });
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    api: $api,
    accounts: accounts.$list,
  },
  filter: ({ api }, results) => nonNullable(api) && results.some(({ result }) => submitUtils.isSuccessResult(result)),
  fn: ({ api, accounts }) => {
    return {
      api: api!,
      accounts,
    };
  },
  target: subscribePureEventFx,
});

const $proxyAddress = createStore<Address | null>(null);

sample({
  clock: subscribePureEventFx.doneData,
  target: $proxyAddress,
});

export const confirmModel = {
  $confirmMap: confirmStore.$confirmMap,
  $isMultisigExists: confirmStore.$isMultisigExists,
  $confirms: confirmStore.$confirms,

  init: confirmStore.init,
  addConfirms: confirmStore.addConfirms,
  replaceWithConfirm: confirmStore.replaceWithConfirm,
  resetConfirm: confirmStore.resetConfirm,
  startSigningProxy: confirmStore.startSigning,

  submitStarted: submitModel.events.formInitiated,
  submitFinished: submitModel.output.formSubmitted,

  $proxyAddress,
  $pendingProxyCreate: subscribePureEventFx.pending,
};
