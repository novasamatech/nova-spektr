import { combine, createApi, createEffect, createEvent, createStore, restore, sample } from 'effector';
import sortBy from 'lodash/sortBy';
import { delay, spread } from 'patronum';

import {
  Account,
  AccountType,
  ChainId,
  ChainType,
  CryptoType,
  Signatory,
  SigningType,
  Transaction,
  TransactionType,
  WalletType,
} from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { AddMultisigStore, FormSubmitEvent, Step } from '../lib/types';
import { formModel } from './create-multisig-form-model';
import { walletSelectModel } from '@features/wallets';
import { transactionService } from '@entities/transaction';
import { TEST_ACCOUNTS, ZERO_BALANCE, toAddress } from '@shared/lib/utils';
import { confirmModel } from './confirm-model';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { createMultisigUtils } from '../lib/create-multisig-utils';

const reset = createEvent();
const stepChanged = createEvent<Step>();
const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const formSubmitted = createEvent<FormSubmitEvent>();
const flowFinished = createEvent();
const selectedSignerChanged = createEvent<Account>();

export type Callbacks = {
  onComplete: () => void;
};

const walletCreated = createEvent<{
  name: string;
  threshold: number;
}>();
const $selectedSigner = restore(selectedSignerChanged, null);
const $step = restore(stepChanged, Step.INIT);
const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $callbacks = createStore<Callbacks | null>(null).reset(reset);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $error = createStore('').reset(reset);

const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $addMultisigStore = createStore<AddMultisigStore | null>(null).reset(flowFinished);

// Options for selectors

const $txWrappers = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    chains: networkModel.$chains,
    chain: formModel.$createMultisigForm.fields.chainId.$value,
    accountSignatories: formModel.$accountSignatories,
    constactSignatories: formModel.$contactSignatories,
  },
  ({ wallet, threshold, chains, chain, wallets, accountSignatories, constactSignatories }) => {
    if (!wallet || !chain || !threshold || !accountSignatories.length) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chains[chain]);
      },
    });

    // fixme see if we can remove  the type casting
    return transactionService.getMultisigWrapper({
      wallets: filteredWallets || [],
      account: accountSignatories[0] as unknown as Account,
      signatories: [...constactSignatories, ...accountSignatories] as unknown as Account[],
    });
  },
);

// $selected signer will be taken into account in case we have
// several accountSignatories. Otherwise it is the first accountSignatory
const $signer = combine(
  {
    txWrappers: $txWrappers,
    accountSignatories: formModel.$accountSignatories,
    selectedSigner: $selectedSigner,
  },
  ({ txWrappers, accountSignatories, selectedSigner }) => {
    // fixme this should be dynamic depending on if the signer is a proxy
    return accountSignatories.length > 1 && selectedSigner
      ? selectedSigner
      : (accountSignatories[0] as unknown as Account);
    // if (txWrappers.length === 0) return accounts[0];

    // if (transactionService.hasMultisig([txWrappers[0]])) {
    //   return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    // }

    // return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

// Miscellaneous

const $isChainConnected = combine(
  {
    chain: formModel.$createMultisigForm.fields.chainId.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) return false;

    return networkUtils.isConnectedStatus(statuses[chain]);
  },
);

const $remarkTx = combine(
  {
    chains: networkModel.$chains,
    form: formModel.$createMultisigForm.$values,
    account: $signer,
    isConnected: $isChainConnected,
  },
  ({ chains, form, account, isConnected }): Transaction | undefined => {
    if (!isConnected || !account || !form.chainId || !form.threshold) return undefined;

    return {
      chainId: form.chainId,
      address: toAddress(account.accountId, { prefix: chains[form.chainId].addressPrefix }),
      type: TransactionType.REMARK,
      args: {
        remark: 'Multisig created with Nova Spektr',
      },
    };
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    chain: formModel.$createMultisigForm.fields.chainId.$value,
    remarkTx: $remarkTx,
    txWrappers: $txWrappers,
  },
  ({ apis, chain, chains, remarkTx, txWrappers }) => {
    if (!chain || !remarkTx) return undefined;

    return transactionService.getWrappedTransaction({
      api: apis[chain],
      addressPrefix: chains[chain].addressPrefix,
      transaction: remarkTx,
      txWrappers,
    });
  },
  { skipVoid: false },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chainId: formModel.$createMultisigForm.fields.chainId.$value,
  },
  ({ apis, chainId }) => {
    return chainId ? apis[chainId] : undefined;
  },
  { skipVoid: false },
);

type CreateWalletParams = {
  name: string;
  threshold: number;
  signatories: Signatory[];
  chainId: ChainId | null;
  isEthereumChain: boolean;
};

const createWalletFx = createEffect(
  async ({ name, threshold, signatories, chainId, isEthereumChain }: CreateWalletParams) => {
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = signatories.map((s) => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    walletModel.events.multisigCreated({
      wallet: {
        name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          signatories,
          chainId: chainId || undefined,
          name: name.trim(),
          accountId: accountId,
          threshold: threshold,
          cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
          chainType: isEthereumChain ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
  },
);

const $hasOwnSignatory = combine(
  { wallets: walletModel.$wallets, signatories: formModel.$signatories },
  ({ wallets, signatories }) =>
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => signatories.some((s) => s.accountId === a.accountId),
    }),
);

const $fakeTx = combine(
  {
    chain: formModel.$createMultisigForm.fields.chainId.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!chain || !isConnected) return undefined;

    return {
      chainId: chain,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: 42 }),
      type: TransactionType.ADD_PROXY,
      args: {
        remark: 'Multisig created with Nova Spektr',
      },
    };
  },
  { skipVoid: false },
);

sample({
  clock: formModel.$createMultisigForm.submit,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: walletCreated,
  source: {
    signatories: formModel.$signatories,
    chainId: formModel.$createMultisigForm.fields.chainId.$value,
    chains: networkModel.$chains,
  },
  fn: ({ signatories, chains, chainId }, resultValues) => ({
    ...resultValues,
    chainId,
    signatories: sortBy(signatories, 'accountId'),
    isEthereumChain: networkUtils.isEthereumBased(chains[chainId].options),
  }),
  target: createWalletFx,
});

sample({
  clock: createWalletFx.failData,
  fn: (error) => error.message,
  target: $error,
});

// Submit

sample({
  clock: formModel.$createMultisigForm.formValidated,
  source: {
    signer: $signer,
    transaction: $transaction,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ transaction }) => {
    return Boolean(transaction);
  },
  fn: ({ multisigDeposit, signer, transaction, fee }, formData) => {
    return {
      transactions: {
        wrappedTx: transaction!.wrappedTx,
        multisigTx: transaction!.multisigTx,
        coreTx: transaction!.coreTx,
      },
      formData: {
        ...formData,
        signer,
        fee,
        account: signer,
        multisigDeposit,
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: formSubmitted,
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    multisigTx: transactions.multisigTx || null,
    coreTx: transactions.coreTx,
    store: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    store: $addMultisigStore,
  }),
});

sample({
  clock: formSubmitted,
  fn: ({ formData, transactions }) => ({
    event: { ...formData, transaction: transactions.wrappedTx },
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
    addMultisigStore: $addMultisigStore,
    wrappedTx: $wrappedTx,
    signer: $signer,
  },
  filter: ({ addMultisigStore, wrappedTx }) => Boolean(addMultisigStore) && Boolean(wrappedTx),
  fn: ({ addMultisigStore, wrappedTx, signer }) => ({
    event: {
      chainId: addMultisigStore!.chainId,
      accounts: [signer as unknown as Account],
      transactions: [wrappedTx!],
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
    addMultisigStore: $addMultisigStore,
    coreTx: $coreTx,
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    signer: $signer,
  },
  filter: ({ addMultisigStore, coreTx, wrappedTx }) => {
    return Boolean(addMultisigStore) && Boolean(wrappedTx) && Boolean(coreTx);
  },
  fn: ({ addMultisigStore, coreTx, wrappedTx, multisigTx, signer }, signParams) => ({
    event: {
      ...signParams,
      chainId: addMultisigStore!.chainId,
      account: signer as unknown as Account,
      coreTxs: [coreTx!],
      wrappedTxs: [wrappedTx!],
      multisigTxs: multisigTx ? [multisigTx] : [],
      description: '',
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
  source: $step,
  filter: (step) => createMultisigUtils.isSubmitStep(step),
  target: flowFinished,
});

export const flowModel = {
  $isLoading: createWalletFx.pending,
  $error,
  $step,
  $hasOwnSignatory,
  $fee,
  $fakeTx,
  $api,
  $isFeeLoading,
  $selectedSigner,
  $signer,
  events: {
    reset,
    callbacksChanged: callbacksApi.callbacksChanged,
    walletCreated,
    stepChanged,
    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
    selectedSignerChanged,
  },
};
