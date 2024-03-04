import { createEvent, createStore, sample, attach, createApi } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, TransactionType } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import type { Account, Chain, MultisigAccount } from '@shared/core';
import { walletSelectModel } from '@features/wallets';
import { Step, TxWrappers } from '../lib/types';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';
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

const $chain = createStore<Chain | null>(null);
const $account = createStore<Account | null>(null);
const $signatory = createStore<Account | null>(null);
const $description = createStore<string | null>(null);
const $transaction = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

sample({ clock: stepChanged, target: $step });

sample({
  clock: stepChanged,
  filter: addProxyUtils.isInitStep,
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: (formData) => ({
    chain: formData.network,
    account: formData.account,
    signatory: formData.signatory,
    description: formData.description,
  }),
  target: spread({
    chain: $chain,
    account: $account,
    signatory: $signatory,
    description: $description,
  }),
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
    const { network, account, signatory, delegate, proxyType } = formData;

    const transaction: Transaction = {
      chainId: network.chainId,
      address: toAddress(account.accountId, { prefix: network.addressPrefix }),
      type: TransactionType.ADD_PROXY,
      args: { delegate, proxyType, delay: 0 },
    };

    return txWrappers.reduce((acc, wrapper) => {
      if (addProxyUtils.hasMultisig([wrapper])) {
        return wrapAsMulti(
          apis[network.chainId],
          acc,
          account as MultisigAccount,
          signatory!.accountId,
          network.addressPrefix,
        );
      }
      if (addProxyUtils.hasProxy([wrapper])) {
        return wrapAsProxy(apis[network.chainId], acc, network.addressPrefix);
      }

      return acc;
    }, transaction);
  },
  target: $transaction,
});

sample({
  clock: formModel.output.formSubmitted,
  source: $transaction,
  fn: (transaction, formData) => ({
    event: {
      chain: formData.network,
      account: formData.account,
      signatory: formData.signatory,
      description: formData.description,
      transaction: transaction!,
    },
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
    chain: $chain,
    account: $account,
    signatory: $signatory,
    transaction: $transaction,
  },
  fn: (proxyData) => ({
    event: {
      chain: proxyData.chain!,
      account: proxyData.account!,
      signatory: proxyData.signatory,
      transaction: proxyData.transaction!,
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
    chain: $chain,
    account: $account,
    signatory: $signatory,
    transaction: $transaction,
    description: $description,
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.chain!,
      account: proxyData.account!,
      signatory: proxyData.signatory,
      transaction: proxyData.transaction!,
      description: proxyData.description,
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onClose(),
  }),
});

export const addProxyModel = {
  $step,
  $chain,
  events: {
    stepChanged,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
