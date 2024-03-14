import { createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction } from '@entities/transaction';
import type { Chain, Asset } from '@shared/core';
import { Step, TxWrappers, TransferStore } from '../lib/types';
import { transferUtils } from '../lib/transfer-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ chain: Chain; asset: Asset }>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $transferStore = createStore<TransferStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  target: formModel.events.formInitiated,
});

// sample({
//   clock: formModel.output.formSubmitted,
//   target: $transferStore,
// });

// sample({
//   clock: formModel.output.formSubmitted,
//   source: {
//     wallet: walletSelectModel.$walletForDetails,
//     wallets: walletModel.$wallets,
//   },
//   fn: ({ wallet, wallets }, { account }): TxWrappers => {
//     if (!wallet) return [];
//     if (walletUtils.isMultisig(wallet)) return ['multisig'];
//     if (!walletUtils.isProxied(wallet)) return [];
//
//     const accountWallet = walletUtils.getWalletById(wallets, account.walletId);
//
//     return walletUtils.isMultisig(accountWallet) ? ['multisig', 'proxy'] : ['proxy'];
//   },
//   target: $txWrappers,
// });
//
// sample({
//   clock: formModel.output.formSubmitted,
//   source: {
//     txWrappers: $txWrappers,
//     apis: networkModel.$apis,
//   },
//   fn: ({ txWrappers, apis }, formData) => {
//     const { chain, account, signatory, delegate, proxyType } = formData;
//
//     const transaction: Transaction = {
//       chainId: chain.chainId,
//       address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
//       type: TransactionType.ADD_PROXY,
//       args: { delegate, proxyType, delay: 0 },
//     };
//
//     return txWrappers.reduce<{ transaction: Transaction; multisigTx: Transaction | null }>(
//       (acc, wrapper) => {
//         if (transferUtils.hasMultisig([wrapper])) {
//           acc.transaction = wrapAsMulti(
//             apis[chain.chainId],
//             acc.transaction,
//             account as MultisigAccount,
//             signatory!.accountId,
//             chain.addressPrefix,
//           );
//           acc.multisigTx = acc.transaction;
//         }
//         if (transferUtils.hasProxy([wrapper])) {
//           acc.transaction = wrapAsProxy(apis[chain.chainId], acc.transaction, chain.addressPrefix);
//         }
//
//         return acc;
//       },
//       { transaction, multisigTx: null },
//     );
//   },
//   target: spread({
//     transaction: $transaction,
//     multisigTx: $multisigTx,
//   }),
// });
//
// sample({
//   clock: formModel.output.formSubmitted,
//   source: $transaction,
//   filter: (transaction: Transaction | null): transaction is Transaction => Boolean(transaction),
//   fn: (transaction, formData) => ({
//     event: { ...formData, transaction },
//     step: Step.CONFIRM,
//   }),
//   target: spread({
//     event: confirmModel.events.formInitiated,
//     step: stepChanged,
//   }),
// });

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    addProxyStore: $transferStore,
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
    addProxyStore: $transferStore,
    transaction: $transaction,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    const isMultisigRequired = !transferUtils.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

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

// TODO: navigate to operations / assets
sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const transferModel = {
  $step,
  $chain: $transferStore.map((store) => store?.chain, { skipVoid: false }),
  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
