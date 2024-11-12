import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import sortBy from 'lodash/sortBy';
import { delay, or, spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import {
  type Account,
  type AccountId,
  AccountType,
  type Chain,
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
import {
  SS58_DEFAULT_PREFIX,
  Step,
  TEST_ACCOUNTS,
  ZERO_BALANCE,
  isStep,
  nonNullable,
  toAccountId,
  toAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { createDepositCalculator, createFeeCalculator } from '@/shared/transactions';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { getExtrinsic, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { ExtrinsicResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { proxiesModel } from '@/features/proxies';
import { walletPairingModel } from '@/features/wallets';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';
import { flexibleMultisigFeature } from './status';
import { walletProviderModel } from './wallet-provider-model';

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: {
    signer: Account;
    fee: string;
    multisigDeposit: string;
    threshold: number;
    chain: Chain;
    name: string;
  };
};

export type AddMultisigStore = FormSubmitEvent['formData'];

const stepChanged = createEvent<Step>();
const formSubmitted = createEvent<FormSubmitEvent>();
const flowFinished = createEvent();
const signerSelected = createEvent<AccountId>();
const walletCreated = createEvent<{
  name: string;
  threshold: number;
}>();

const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flowFinished);

const $proxyDeposit = createStore(ZERO_BALANCE).reset(flowFinished);
const $error = createStore('').reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $addMultisigStore = createStore<AddMultisigStore | null>(null).reset(flowFinished);
const $signer = createStore<Account | null>(null).reset(flowFinished);

const $signerWallet = combine({ signer: $signer, wallets: walletModel.$wallets }, ({ signer, wallets }) => {
  const res = walletUtils.getWalletFilteredAccounts(wallets, {
    accountFn: (a) => a.accountId === signer?.accountId,
    walletFn: (w) => walletUtils.isValidSignatory(w),
  });

  return res;
});

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

const $proxyTransactionTx = combine(
  {
    chains: networkModel.$chains,
    form: formModel.$createMultisigForm.$values,
    account: $signer,
    isConnected: $isChainConnected,
  },
  ({ chains, form, account, isConnected }): Transaction | null => {
    if (!isConnected || !account || !form.chain.chainId || !form.threshold) return null;

    return {
      chainId: form.chain.chainId,
      address: toAddress(account.accountId, { prefix: chains[form.chain.chainId].addressPrefix }),
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: 'Any', delay: 0, index: 0 },
    };
  },
);

const $api = combine(flexibleMultisigFeature.state, (state) => {
  if (state.status !== 'running') return null;

  return state.data.api;
});

const $transaction = combine(
  {
    api: $api,
    chain: formModel.$createMultisigForm.fields.chain.$value,
    proxyTransactionTx: $proxyTransactionTx,
    signatories: signatoryModel.$signatories,
    signer: $signer,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
  },
  ({ api, chain, proxyTransactionTx, signatories, signer, threshold, multisigAccountId }) => {
    if (!chain || !api || !proxyTransactionTx || !signer) return null;

    const signatoriesWrapped = signatories.map((s) => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionService.getWrappedTransaction({
      api: api,
      addressPrefix: chain.addressPrefix,
      transaction: proxyTransactionTx,
      txWrappers: [
        {
          kind: WrapperKind.MULTISIG,
          multisigAccount: {
            accountId: multisigAccountId,
            signatories: signatoriesWrapped,
            threshold,
          } as MultisigAccount,
          signatories: Array.from(signatories.values()).map((s) => ({
            accountId: toAccountId(s.address),
          })) as Account[],
          signer,
        },
      ],
    });
  },
);

const $fakeTx = combine(
  {
    chain: formModel.$createMultisigForm.fields.chain.$value,
    isConnected: $isChainConnected,
    api: $api,
    transaction: $transaction,
  },
  ({ isConnected, chain, api, transaction }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;
    if (transaction) return transaction.wrappedTx;

    const proxyTransaction = {
      chainId: chain.chainId,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: SS58_DEFAULT_PREFIX }),
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: 'Any', delay: 0, index: 0 },
    };

    const extrinsic = getExtrinsic[proxyTransaction.type](proxyTransaction.args, api);
    const callData = extrinsic.method.toHex();
    const callHash = extrinsic.method.hash.toHex();

    return {
      chainId: chain.chainId,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: SS58_DEFAULT_PREFIX }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: 2,
        otherSignatories: [],
        callData,
        callHash,
      },
    };
  },
);

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  $api: $api,
  $transaction: $fakeTx,
});

const { $deposit: $multisigDeposit, $pending: $pendingDeposit } = createDepositCalculator({
  $api: $api,
  $threshold: formModel.$createMultisigForm.fields.threshold.$value,
});

const getProxyDepositFx = createEffect((api: ApiPromise): string => {
  return proxyService.getProxyDeposit(api, '0', 1);
});

sample({
  clock: $api,
  filter: nonNullable,
  target: getProxyDepositFx,
});

sample({
  clock: getProxyDepositFx.doneData,
  target: $proxyDeposit,
});

const $isEnoughBalance = combine(
  {
    signer: $signer,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $proxyDeposit,
    balances: balanceModel.$balances,
    chain: formModel.$createMultisigForm.fields.chain.$value,
  },
  ({ signer, fee, multisigDeposit, balances, proxyDeposit, chain }) => {
    if (!signer || !fee || !chain) return false;

    const balance = balanceUtils.getBalance(
      balances,
      signer.accountId,
      chain.chainId,
      chain.assets[0].assetId.toString(),
    );

    return fee
      .add(multisigDeposit)
      .add(new BN(proxyDeposit))
      .lte(new BN(transferableAmount(balance)));
  },
);

sample({
  clock: signerSelected,
  source: walletModel.$wallets,
  fn: (wallets, accountId) => {
    const signerAccount = walletUtils.getAccountBy(wallets, (a) => a.accountId === accountId);

    return signerAccount;
  },
  target: $signer,
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
    console.log(transaction, signer);

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
        fee: fee.toString(),
        account: signer,
        multisigDeposit: multisigDeposit.toString(),
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
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
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

// Create wallet
type CreateWalletParams = {
  name: string;
  threshold: number;
  signatories: Signatory[];
  chainId: ChainId;
  isEthereumChain: boolean;
};

const createWalletFx = createEffect(
  async ({ name, threshold, signatories, chainId, isEthereumChain }: CreateWalletParams) => {
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = signatories.map((s) => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    // TODO implement flexible multisig creation
    walletModel.events.multisigCreated({
      wallet: {
        name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          signatories,
          chainId,
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
  target: proxiesModel.events.workerStarted,
});

sample({
  clock: createWalletFx.doneData,
  target: walletProviderModel.events.completed,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    step: $step,
    hiddenMultisig: formModel.$hiddenMultisig,
  },
  filter: ({ step }, results) => {
    const isSubmitStep = isStep(step, Step.SUBMIT);
    const isNonNullable = nonNullable(formModel.$hiddenMultisig);
    const isSuccessResult = results[0]?.result === ExtrinsicResult.SUCCESS;

    return isSubmitStep && isNonNullable && isSuccessResult;
  },
  fn: ({ hiddenMultisig }) => hiddenMultisig!.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: (step) => isStep(step, Step.SUBMIT),
  target: flowFinished,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: walletProviderModel.events.completed,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: flowFinished,
});

sample({
  clock: flexibleMultisigFeature.stopped,
  target: formModel.$createMultisigForm.reset,
});

sample({
  clock: flowFinished,
  target: walletPairingModel.events.walletTypeCleared,
});

sample({
  clock: delay(flowFinished, 2000),
  fn: () => Step.NAME_NETWORK,
  target: stepChanged,
});

sample({
  clock: flexibleMultisigFeature.stopped,
  target: signatoryModel.$signatories.reinit,
});

export const flexibleMultisigModel = {
  $error,
  $step,
  $api,
  $signer,
  $signerWallet,
  $transaction,

  $fee,
  $proxyDeposit,
  $multisigDeposit,
  $isLoading: or($pendingFee, $pendingDeposit, getProxyDepositFx.pending),
  $isEnoughBalance,

  events: {
    signerSelected,
    walletCreated,
    stepChanged,

    _test: {
      formSubmitted,
    },
  },
  output: {
    flowFinished,
  },
};
