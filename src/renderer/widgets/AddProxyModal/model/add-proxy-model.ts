import { createEvent, createStore, sample, attach, createApi } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, TransactionType } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { Step, TxWrappers, AddProxyStore } from '../lib/types';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';
import type { MultisigAccount } from '@shared/core';
import { wrapAsMulti, wrapAsProxy } from '@entities/transaction/lib/extrinsicService';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $step = createStore<Step>(Step.INIT);

const $addProxyStore = createStore<AddProxyStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

sample({ clock: stepChanged, target: $step });

sample({
  clock: stepChanged,
  filter: addProxyUtils.isInitStep,
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  target: $addProxyStore,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  fn: ({ wallet, wallets }, { account }): TxWrappers => {
    if (!wallet) return [];
    if (walletUtils.isMultisig(wallet)) return ['multisig'];
    if (!walletUtils.isProxied(wallet)) return [];

    const accountWallet = walletUtils.getWalletById(wallets, account.walletId);

    return walletUtils.isMultisig(accountWallet) ? ['multisig', 'proxy'] : ['proxy'];
  },
  target: $txWrappers,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    txWrappers: $txWrappers,
    apis: networkModel.$apis,
  },
  fn: ({ txWrappers, apis }, formData) => {
    const { chain, account, signatory, delegate, proxyType } = formData;

    const transaction: Transaction = {
      chainId: chain.chainId,
      address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      type: TransactionType.ADD_PROXY,
      args: { delegate, proxyType, delay: 0 },
    };

    return txWrappers.reduce<{ transaction: Transaction; multisigTx: Transaction | null }>(
      (acc, wrapper) => {
        if (addProxyUtils.hasMultisig([wrapper])) {
          acc.transaction = wrapAsMulti(
            apis[chain.chainId],
            acc.transaction,
            account as MultisigAccount,
            signatory!.accountId,
            chain.addressPrefix,
          );
          acc.multisigTx = acc.transaction;
        }
        if (addProxyUtils.hasProxy([wrapper])) {
          acc.transaction = wrapAsProxy(apis[chain.chainId], acc.transaction, chain.addressPrefix);
        }

        return acc;
      },
      { transaction, multisigTx: null },
    );
  },
  target: spread({
    transaction: $transaction,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $transaction,
  filter: (transaction: Transaction | null): transaction is Transaction => Boolean(transaction),
  fn: (transaction, formData) => ({
    event: { ...formData, transaction },
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    addProxyStore: $addProxyStore,
    transaction: $transaction,
  },
  filter: ({ addProxyStore, transaction }) => Boolean(addProxyStore) && Boolean(transaction),
  fn: ({ addProxyStore, transaction }) => ({
    event: {
      chain: addProxyStore!.chain,
      account: addProxyStore!.account,
      signatory: addProxyStore!.signatory,
      transaction: transaction!,
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    addProxyStore: $addProxyStore,
    transaction: $transaction,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    const isMultisigRequired = !addProxyUtils.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.transaction) && isMultisigRequired;
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      description: proxyData.addProxyStore!.description,
      transaction: proxyData.transaction!,
      multisigTx: proxyData.multisigTx!,
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

// // TODO: add proxy in DB
// sample({
//   clock: submitModel.output.formSubmitted,
//   source: {
//     account: $account,
//     chain: $chain,
//     delegate: ,
//     prox
//   },
//   fn: () => ({
//     accountId: AccountId,
//     proxiedAccountId: AccountId,
//     chainId: ChainId,
//     proxyType: ProxyType,
//     delay: 0,
//   }),
//   target: proxyModel.events.proxiesAdded,
// });

// TODO: after add proxy to DB
sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onClose(),
  }),
});

export const addProxyModel = {
  $step,
  $chain: $addProxyStore.map((store) => store?.chain, { skipVoid: false }),
  events: {
    stepChanged,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
