import { createEvent, createStore, sample, restore } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, transactionService } from '@entities/transaction';
import { walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { Step, TxWrappers, TransferStore, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $transferStore = createStore<TransferStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $pureTx = createStore<Transaction | null>(null);
const $wrappedTx = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  target: formModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.output.formSubmitted,
  target: spread({
    transaction: $pureTx,
    formData: $transferStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
  },
  fn: ({ wallet, wallets }, { formData }): TxWrappers => {
    if (!wallet) return [];
    if (walletUtils.isMultisig(wallet)) return ['multisig'];
    if (!walletUtils.isProxied(wallet)) return [];

    const accountWallet = walletUtils.getWalletById(wallets, formData.account.walletId);

    return walletUtils.isMultisig(accountWallet) ? ['multisig', 'proxy'] : ['proxy'];
  },
  target: $txWrappers,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    txWrappers: $txWrappers,
  },
  filter: ({ networkStore }) => Boolean(networkStore),
  fn: ({ txWrappers, apis, networkStore }, { transaction, formData }) => {
    const { account, signatory } = formData;
    const { chainId, addressPrefix } = networkStore!.chain;

    return transactionService.getWrappedTransactions(txWrappers, transaction, {
      api: apis[chainId],
      addressPrefix: addressPrefix,
      account,
      signerAccountId: signatory?.accountId,
    });
  },
  target: spread({
    transaction: $wrappedTx,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    networkStore: $networkStore,
    pureTx: $pureTx,
  },
  filter: ({ networkStore, pureTx }) => Boolean(networkStore) && Boolean(pureTx),
  fn: ({ networkStore, pureTx }, { formData }) => {
    const payload = {
      ...formData,
      chain: networkStore!.chain,
      asset: networkStore!.asset,
    };

    return {
      event: { payload, transaction: pureTx! },
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    transferStore: $transferStore,
    networkStore: $networkStore,
    pureTx: $pureTx,
  },
  filter: ({ transferStore, networkStore, pureTx }) => {
    return Boolean(transferStore) && Boolean(transferStore) && Boolean(pureTx);
  },
  fn: ({ transferStore, networkStore, pureTx }) => ({
    event: {
      chain: networkStore!.chain,
      account: transferStore!.account,
      signatory: transferStore!.signatory,
      transaction: pureTx!,
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
    transferStore: $transferStore,
    networkStore: $networkStore,
    transaction: $pureTx,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (transferData) => {
    const isMultisigRequired =
      !transactionService.hasMultisig(transferData.txWrappers) || Boolean(transferData.multisigTx);

    return Boolean(transferData.transferStore) && Boolean(transferData.transaction) && isMultisigRequired;
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.transferStore!.account,
      signatory: transferData.transferStore!.signatory,
      description: transferData.transferStore!.description,
      transaction: transferData.transaction!,
      multisigTx: transferData.multisigTx!,
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
  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
