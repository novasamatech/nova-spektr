import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import sortBy from 'lodash/sortBy';
import { delay, spread } from 'patronum';

import {
  type Account,
  type AccountId,
  AccountType,
  type ChainId,
  ChainType,
  type Contact,
  CryptoType,
  type MultisigAccount,
  type Signatory,
  SigningType,
  type Transaction,
  TransactionType,
  WalletType,
  WrapperKind,
} from '@/shared/core';
import { SS58_DEFAULT_PREFIX, TEST_ACCOUNTS, ZERO_BALANCE, isStep, toAccountId, toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type AddMultisigStore, type FormSubmitEvent, Step } from '../lib/types';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';
import { walletProviderModel } from './wallet-provider-model';

const stepChanged = createEvent<Step>();
const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const formSubmitted = createEvent<FormSubmitEvent>();
const flowFinished = createEvent();
const signerSelected = createEvent<AccountId>();

const walletCreated = createEvent<{
  name: string;
  threshold: number;
}>();
const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flowFinished);
const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $error = createStore('').reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $addMultisigStore = createStore<AddMultisigStore | null>(null).reset(flowFinished);
const $signer = createStore<Account | null>(null).reset(flowFinished);

const $signerWallet = combine(
  { signer: $signer, wallets: walletModel.$wallets },
  ({ signer, wallets }) => {
    const res = walletUtils.getWalletFilteredAccounts(wallets, {
      accountFn: (a) => a.accountId === signer?.accountId,
      walletFn: (w) => walletUtils.isValidSignatory(w),
    });

    return res;
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
    signatories: signatoryModel.$signatories,
    signer: $signer,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
  },
  ({ apis, chain, remarkTx, signatories, signer, threshold, multisigAccountId }) => {
    if (!chain || !remarkTx || !signer) return undefined;

    const signatoriesWrapped = Array.from(signatories.values()).map((s) => ({
      accountId: toAccountId(s.address),
      adress: s.address,
    }));

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction: remarkTx,
      txWrappers: [
        {
          kind: WrapperKind.MULTISIG,
          multisigAccount: {
            accountId: multisigAccountId,
            signatories: signatoriesWrapped,
            threshold,
          } as unknown as MultisigAccount,
          signatories: Array.from(signatories.values()).map((s) => ({
            accountId: toAccountId(s.address),
          })) as Account[],
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
          creatorAccountId: accountId,
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
      address: toAddress(TEST_ACCOUNTS[0], { prefix: SS58_DEFAULT_PREFIX }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        remark: 'Multisig created with Nova Spektr',
      },
    };
  },
  { skipVoid: false },
);

sample({
  clock: formModel.output.formSubmitted,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    name: formModel.$createMultisigForm.fields.name.$value,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$createMultisigForm.fields.chain.$value,
    step: $step,
  },
  filter: ({ step }, results) => {
    return submitUtils.isSuccessResult(results[0].result) && isStep(Step.SUBMIT, step);
  },
  fn: ({ signatories, chain, name, threshold }) => {
    const sortedSignatories = sortBy(
      Array.from(signatories.values()).map((a) => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    return {
      name,
      threshold,
      chainId: chain.chainId,
      signatories: sortedSignatories,
      isEthereumChain: networkUtils.isEthereumBased(chain.options),
    };
  },
  target: createWalletFx,
});

sample({
  clock: createWalletFx.failData,
  fn: (error) => error.message,
  target: $error,
});

sample({
  clock: createWalletFx.doneData,
  target: walletProviderModel.events.completed,
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
  filter: ({ transaction, signer }) => {
    return Boolean(transaction) && Boolean(signer);
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
        signer: signer!,
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
  filter: ({ addMultisigStore, wrappedTx, signer }) =>
    Boolean(addMultisigStore) && Boolean(wrappedTx) && Boolean(signer),
  fn: ({ addMultisigStore, wrappedTx, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: addMultisigStore!.chain,
          account: signer!,
          transaction: wrappedTx!,
        },
      ],
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
  filter: ({ addMultisigStore, coreTx, wrappedTx, signer }) => {
    return Boolean(addMultisigStore) && Boolean(wrappedTx) && Boolean(coreTx) && Boolean(signer);
  },
  fn: ({ addMultisigStore, coreTx, wrappedTx, multisigTx, signer }, signParams) => ({
    event: {
      ...signParams,
      chain: addMultisigStore!.chain,
      account: signer!,
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
  filter: (step) => isStep(step, Step.SUBMIT),
  target: flowFinished,
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const contactsToSave = Array.from(signatories.values())
      .slice(1)
      .filter((signatory) => !contacts.some((contact) => contact.accountId === toAccountId(signatory.address)))
      .map(
        ({ address, name }) =>
          ({
            address: address,
            name: name,
            accountId: toAccountId(address),
          }) as Contact,
      );

    return contactsToSave;
  },
  target: contactModel.effects.createContactsFx,
});

sample({
  clock: signerSelected,
  source: { wallets: walletModel.$wallets },
  fn: ({ wallets }, accountId) => {
    const signerAccount = walletUtils.getAccountBy(wallets, (a) => a.accountId === accountId);

    return signerAccount;
  },
  target: $signer,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: walletProviderModel.events.completed,
});

sample({
  clock: delay(walletModel.events.walletRestoredSuccess, 2000),
  target: flowFinished,
});

sample({
  clock: delay(flowFinished, 2000),
  fn: () => Step.NAME_NETWORK,
  target: stepChanged,
});

sample({
  clock: delay(flowFinished, 2000),
  target: signatoryModel.$signatories.reinit,
});

sample({
  clock: delay(flowFinished, 2000),
  target: formModel.$createMultisigForm.reset,
});

export const flowModel = {
  $error,
  $step,
  $fee,
  $fakeTx,
  $api,
  $isFeeLoading,
  $signer,
  $signerWallet,
  events: {
    signerSelected,
    walletCreated,
    stepChanged,
    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
    //for tests
    formSubmitted,
  },
  output: {
    flowFinished,
  },
};
