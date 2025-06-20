import { BN } from '@polkadot/util';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import sortBy from 'lodash/sortBy';
import { delay, spread } from 'patronum';

import { $features } from '@/shared/config/features';
import {
  AccountType,
  type Contact,
  CryptoType,
  type MultisigAccount,
  type NoID,
  SigningType,
  type Transaction,
  TransactionType,
  type TxWrapper,
  WalletType,
  WrapperKind,
} from '@/shared/core';
import {
  Step,
  TEST_ACCOUNTS,
  ZERO_BALANCE,
  isStep,
  nonNullable,
  toAccountId,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { proxiesModel } from '@/features/proxies';
import { type AddMultisigStore, type FormSubmitEvent } from '../lib/types';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const createWalletFx = attach({ effect: walletModel.createWallet });

const flow = createGate();

const stepChanged = createEvent<Step>();
const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const formSubmitted = createEvent<FormSubmitEvent>();
const signerSelected = createEvent<AnyAccount>();

const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flow.close);
const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $error = createStore('').reset(flow.close);
const $wrappedTx = createStore<Transaction | null>(null).reset(flow.close);
const $coreTx = createStore<Transaction | null>(null).reset(flow.close);
const $multisigTx = createStore<Transaction | null>(null).reset(flow.close);
const $addMultisigStore = createStore<AddMultisigStore | null>(null).reset(flow.close);
const $signer = restore(signerSelected, null).reset(flow.close);

const $signerWallet = combine({ signer: $signer, wallets: walletModel.$wallets }, ({ signer, wallets }) => {
  return walletUtils.getWalletFilteredAccounts(wallets, {
    accountFn: a => a.accountId === signer?.accountId,
    walletFn: w => walletUtils.isValidSignatory(w) && w.id === signer?.walletId,
  });
});

// Miscellaneous

const $isChainConnected = combine(
  {
    chainId: formModel.$createMultisigForm.fields.chainId.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    return networkUtils.isConnectedStatus(statuses[chainId]);
  },
);

const $remarkTx = combine(
  {
    form: formModel.$createMultisigForm.$values,
    account: $signer,
    isConnected: $isChainConnected,
    signatories: signatoryModel.$signatories,
  },
  ({ form, account, isConnected, signatories }) => {
    if (!isConnected || !account || !form.threshold) return null;

    return {
      chainId: form.chainId,
      accountId: account.accountId,
      type: TransactionType.REMARK_WITH_EVENT,
      args: {
        remark: JSON.stringify({
          signatories: Array.from(signatories.values()).map(s => toAccountId(s.address)),
          threshold: form.threshold,
        }),
      },
    };
  },
);
const $transaction = combine(
  {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    chain: formModel.$chain,
    remarkTx: $remarkTx,
    signatories: signatoryModel.$signatories,
    signer: $signer,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
    features: $features,
  },
  ({ apis, chain, remarkTx, signatories, signer, threshold, multisigAccountId, features }) => {
    if (!chain || !remarkTx || !signer || !multisigAccountId) return null;

    const signatoriesWrapped = Array.from(signatories.values()).map(s => ({
      accountId: toAccountId(s.address),
      address: s.address,
    }));

    const txWrappers: TxWrapper[] = features.multisigRemark
      ? []
      : [
          {
            kind: WrapperKind.MULTISIG,
            multisigAccount: {
              accountId: multisigAccountId,
              signatories: signatoriesWrapped,
              threshold,
            } as unknown as MultisigAccount,
            signatories: Array.from(signatories.values()).map(s => ({
              accountId: toAccountId(s.address),
            })) as AnyAccount[],
            signer,
          },
        ];

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      transaction: remarkTx,
      txWrappers,
    });
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chainId: formModel.$createMultisigForm.fields.chainId.$value,
  },
  ({ apis, chainId }) => {
    return apis[chainId] ?? null;
  },
);

const $isEnoughBalance = combine(
  {
    signer: $signer,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    balances: balanceModel.$balances,
    chain: formModel.$chain,
  },
  ({ signer, fee, multisigDeposit, balances, chain }) => {
    if (!signer || !fee || !multisigDeposit || !chain) return false;

    const balance = balanceUtils.getBalance(
      balances,
      signer.accountId,
      chain.chainId,
      chain.assets[0].assetId.toString(),
    );

    return new BN(fee).add(new BN(multisigDeposit)).lte(withdrawableAmountBN(balance));
  },
);

const $fakeTx = combine(
  {
    chainId: formModel.$createMultisigForm.fields.chainId.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chainId }): Transaction | undefined => {
    if (!isConnected) return undefined;

    return {
      chainId,
      accountId: TEST_ACCOUNTS[0],
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
    chain: formModel.$chain,
    step: $step,
  },
  filter: ({ step, chain }, results) => {
    const isSubmitStep = isStep(Step.SUBMIT, step);
    const isSuccessResult = results.some(({ result }) => submitUtils.isSuccessResult(result));

    return nonNullable(chain) && isSubmitStep && isSuccessResult;
  },
  fn: ({ signatories, chain, name, threshold }) => {
    const sortedSignatories = sortBy(
      Array.from(signatories.values()).map(a => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = sortedSignatories.map(s => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    const account: Omit<NoID<MultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: name.trim(),
      accountId: accountId,
      threshold: threshold,
      cryptoType,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.MULTISIG,
      type: 'universal',
    };

    return {
      wallet: {
        name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [account],
    };
  },
  target: createWalletFx,
});

sample({
  clock: createWalletFx.fail,
  fn: ({ error }) => error.message,
  target: $error,
});

sample({
  clock: createWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

sample({
  clock: createWalletFx.doneData,
  target: proxiesModel.findAllProxies,
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
    chain: formModel.$chain,
    wrappedTx: $wrappedTx,
    signer: $signer,
  },
  filter: ({ chain, wrappedTx, signer }) => nonNullable(chain) && nonNullable(wrappedTx) && nonNullable(signer),
  fn: ({ chain, wrappedTx, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: signer!,
          transaction: wrappedTx!,
          signatory: null,
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
    chain: formModel.$chain,
    coreTx: $coreTx,
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    signer: $signer,
  },
  filter: ({ chain, coreTx, wrappedTx, signer }) => {
    return nonNullable(chain) && nonNullable(wrappedTx) && nonNullable(coreTx) && nonNullable(signer);
  },
  fn: ({ chain, coreTx, wrappedTx, multisigTx, signer }, signParams) => ({
    event: {
      ...signParams,
      chain: chain!,
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
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: step => isStep(step, Step.SUBMIT),
  target: flow.close,
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const signatoriesWithoutSigner = signatories.slice(1);
    const contactMap = new Map(contacts.map(c => [c.accountId, c]));
    const updatedContacts: Contact[] = [];

    for (const { address, name } of signatoriesWithoutSigner) {
      const contact = contactMap.get(toAccountId(address));

      if (!contact) continue;

      updatedContacts.push({
        ...contact,
        name,
      });
    }

    return updatedContacts;
  },
  target: contactModel.effects.updateContactsFx,
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const contactsSet = new Set(contacts.map(c => c.accountId));

    return signatories
      .slice(1)
      .filter(signatory => !contactsSet.has(toAccountId(signatory.address)))
      .map(
        ({ address, name }) =>
          ({
            address: address,
            name: name,
            accountId: toAccountId(address),
          }) as Contact,
      );
  },
  target: contactModel.effects.createContactsFx,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: flow.close,
});

sample({
  clock: flow.close,
  target: formModel.$createMultisigForm.reset,
});

sample({
  clock: delay(flow.close, 2000),
  fn: () => Step.NAME_NETWORK,
  target: stepChanged,
});

sample({
  clock: delay(flow.close, 2000),
  target: signatoryModel.$signatories.reinit,
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
  $isEnoughBalance,
  events: {
    signerSelected,
    stepChanged,
    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
    //for tests
    formSubmitted,
  },
  flow,
};
