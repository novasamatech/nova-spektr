import { combine, createApi, createEffect, createEvent, createStore, restore, sample } from 'effector';
import sortBy from 'lodash/sortBy';
import { delay, spread } from 'patronum';

import {
  Account,
  AccountType,
  ChainId,
  ChainType,
  CryptoType,
  MultisigAccount,
  Signatory,
  SigningType,
  Transaction,
  TransactionType,
  WalletType,
  WrapperKind,
} from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { AddMultisigStore, FormSubmitEvent, Step } from '../lib/types';
import { formModel } from './form-model';
import { transactionService } from '@entities/transaction';
import { TEST_ACCOUNTS, ZERO_BALANCE, toAddress } from '@shared/lib/utils';
import { confirmModel } from './confirm-model';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { createMultisigUtils } from '../lib/create-multisig-utils';

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
const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flowFinished);
const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $callbacks = createStore<Callbacks | null>(null).reset(flowFinished);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $error = createStore('').reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $addMultisigStore = createStore<AddMultisigStore | null>(null).reset(flowFinished);

// $selected signer will be taken into account in case we have
// several accountSignatories. Otherwise it is the first accountSignatory
const $signer = combine(
  {
    accountSignatories: formModel.$accountSignatories,
    selectedSigner: $selectedSigner,
  },
  ({ accountSignatories, selectedSigner }) => {
    return accountSignatories.length > 1 && selectedSigner
      ? selectedSigner
      : (accountSignatories[0] as unknown as Account);
  },
  { skipVoid: false },
);

const $signerWallet = combine(
  { signer: $signer, wallets: walletModel.$wallets },
  ({ signer, wallets }) => {
    return walletUtils.getWalletFilteredAccounts(wallets, {
      accountFn: (a) => a.accountId === signer.accountId,
      walletFn: (w) => walletUtils.isValidSignatory(w),
    });
  },
  { skipVoid: false },
);

// Miscellaneous

const $isChainConnected = combine(
  {
    chain: formModel.$createMultisigForm.fields.chain.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) return false;

    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
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
    if (!isConnected || !account || !form.chain.chainId || !form.threshold) return undefined;

    return {
      chainId: form.chain.chainId,
      address: toAddress(account.accountId, { prefix: chains[form.chain.chainId].addressPrefix }),
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
    chain: formModel.$createMultisigForm.fields.chain.$value,
    remarkTx: $remarkTx,
    signatories: formModel.$signatories,
    signer: $signer,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
  },
  ({ apis, chain, remarkTx, signatories, signer, threshold, multisigAccountId }) => {
    if (!chain || !remarkTx) return undefined;

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction: remarkTx,
      txWrappers: [
        {
          kind: WrapperKind.MULTISIG,
          multisigAccount: { accountId: multisigAccountId, signatories, threshold } as unknown as MultisigAccount,
          signatories: signatories.map((s) => ({ accountId: s.accountId })) as Account[],
          signer,
        },
      ],
    });
  },
  { skipVoid: false },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: formModel.$createMultisigForm.fields.chain.$value,
  },
  ({ apis, chain }) => {
    return chain ? apis[chain.chainId] : undefined;
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

const $fakeTx = combine(
  {
    chain: formModel.$createMultisigForm.fields.chain.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!chain || !isConnected) return undefined;

    return {
      chainId: chain.chainId,
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
  clock: formModel.output.formSubmitted,
  source: formModel.$createMultisigForm.$isValid,
  filter: (isValid) => isValid,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: formModel.$accountSignatories,
  fn: (signatories) => {
    return signatories[0] as unknown as Account;
  },
  target: selectedSignerChanged,
});

sample({
  clock: submitModel.output.extrinsicSucceeded,
  source: {
    name: formModel.$createMultisigForm.fields.name.$value,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    signatories: formModel.$signatories,
    chain: formModel.$createMultisigForm.fields.chain.$value,
  },
  fn: ({ signatories, chain, name, threshold }) => ({
    name,
    threshold,
    chainId: chain.chainId,
    signatories: sortBy(signatories, 'accountId'),
    isEthereumChain: networkUtils.isEthereumBased(chain.options),
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
      chain: addMultisigStore!.chain,
      accounts: [signer],
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
      chainId: addMultisigStore!.chain.chainId,
      account: signer,
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

sample({
  clock: flowFinished,
  fn: () => Step.NAME_NETWORK,
  target: stepChanged,
});

export const flowModel = {
  $error,
  $step,
  $fee,
  $fakeTx,
  $api,
  $isFeeLoading,
  $selectedSigner,
  $signer,
  $signerWallet,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    walletCreated,
    stepChanged,
    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
    selectedSignerChanged,
    //for tests
    formSubmitted,
  },
  output: {
    flowFinished,
  },
};
