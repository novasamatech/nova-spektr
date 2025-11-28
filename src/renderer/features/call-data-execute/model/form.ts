import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type CallBase } from '@polkadot/types/types';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { readonly, throttle } from 'patronum';

import { type CallData, type Chain } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { type Form, createForm } from '@/shared/forms';
import { getNativeAsset, nonNullable, nonNullableMap, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import {
  createFeeCalculator,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { createRouteStore } from '@/shared/transactions/createRouteStore';
import { createWrappedTxStore } from '@/shared/transactions/createWrappedTxStore';
import {
  type AnyAccount,
  type AnyTransaction,
  type EncodedTransaction,
  accountService,
  transactionService,
} from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService as transactionEntitiesService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// TODO move balances subscription to balance model
import { balanceSubModel } from '@/features/assets-balances';
import { type TransactionSigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { Step } from '../lib/types';

import { type ConfirmInput, confirmModel } from './confirm';
import { callDataExecuteFeature } from './feature';

type FormData = {
  chain: Chain | null;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  callData: string;
};

// steps management

const stepChanged = createEvent<Step>();
const flowStarted = createEvent();
const flowFinished = createEvent();
const $step = readonly(restore(stepChanged, Step.NONE));

const form: Form<FormData> = createForm<FormData>({
  fields: {
    chain: {
      defaultValue: null,
      validator: () => (chain) => {
        if (!chain) return { message: 'callData.errors.chainRequired' };
      },
    },
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
      validator: () => ({
        source: combine({
          fee: $fee,
          balance: $signatoryBalance,
        }),
        fn: (signatory, _, { balance, fee }) => {
          if (!signatory) {
            return { message: 'callData.errors.signatoryRequired' };
          }

          const withdrawable = withdrawableAmountBN(balance);
          if (withdrawable.lt(fee)) {
            return { message: 'callData.errors.insufficientBalance' };
          }
        },
      }),
    },
    callData: {
      defaultValue: '',
      validator: () => (callData) => {
        if (!callData) return { message: 'callData.errors.required' };
        if (!callData.startsWith('0x')) {
          return { message: 'callData.errors.0xPrefix' };
        }
      },
    },
  },
});

const $asset = form.fields.chain.$value.map((c) => (c ? getNativeAsset(c.assets) : null));

const $api = combine(form.fields.chain.$value, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

// extrinsic

const $throttledCallData = restore(throttle(form.fields.callData.$value, 500), '').reset(flowFinished);

const $transaction = $throttledCallData.map((callData): EncodedTransaction | null => {
  if (callData.length === 0) return null;
  return {
    type: 'encoded',
    callData: callData as CallData,
  };
});

const $call = createStore<CallBase<any> | null>(null);
const $args = combine($call, form.fields.chain.$value, (call, chain) => {
  if (!call || !chain) return null;

  return transactionEntitiesService.formatCall(call, chain);
});

const $route = createRouteStore({
  chain: form.fields.chain.$value,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: walletModel.$availableAccounts,
});

const { $tx: $wrappedTx } = createWrappedTxStore({
  api: $api,
  transaction: $transaction,
  route: $route,
});

const $wrappedExtrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);

const $wrappedArgs = combine($wrappedExtrinsic, form.fields.chain.$value, (extrinsic, chain) => {
  return extrinsic && chain ? transactionEntitiesService.formatCall(extrinsic.method, chain) : null;
});

const createWrappedExtrinsicFx = createQueuedEffect(
  ({ transaction, api }: { transaction: AnyTransaction | null; api: ApiPromise | null }) => {
    if (nullable(transaction) || nullable(api)) return null;
    return transactionService.createExtrinsic(transaction, api);
  },
);

sample({
  source: { transaction: $wrappedTx, api: $api },
  target: createWrappedExtrinsicFx,
});

sample({
  clock: createWrappedExtrinsicFx.doneData,
  target: $wrappedExtrinsic,
});

sample({
  clock: createWrappedExtrinsicFx.fail,
  fn: () => null,
  target: $wrappedExtrinsic,
});

sample({
  clock: createWrappedExtrinsicFx.fail,
  fn: () => [{ message: 'callData.errors.invalidCallData' }],
  target: form.fields.callData.setErrors,
});

const createCallFx = createQueuedEffect(({ callData, api }: { callData: string; api: ApiPromise | null }) => {
  if (!callData || nullable(api)) return null;
  return transactionEntitiesService.createCallFromCallData(callData as CallData, api);
});

sample({
  source: { callData: $throttledCallData, api: $api },
  target: createCallFx,
});

sample({
  clock: createCallFx.doneData,
  target: $call,
});

sample({
  clock: createCallFx.fail,
  fn: () => null,
  target: $call,
});

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  active: callDataExecuteFeature.isRunning,
  extrinsic: $wrappedExtrinsic,
});

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    chain: form.fields.chain.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ signatory, chain, balances }) => {
    if (nullable(signatory) || nullable(chain)) return null;

    return (
      balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, getNativeAsset(chain.assets).assetId) ??
      null
    );
  },
);

// validations

const validator = createTxValidator();
const { $errors, $valid } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $wrappedTx,
  },
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: form.submit.done,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: confirmModel.startSigning,
  fn: () => Step.SIGN,
  target: stepChanged,
});

sample({
  clock: signModel.signed,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, form.reset],
});

const $allChains = networkModel.$chains.map((chains) => Object.values(chains));

const $availableChains = combine(
  {
    chains: $allChains,
    initiator: form.fields.initiator.$value,
  },
  ({ chains, initiator }) => {
    if (nullable(initiator)) return [];
    return chains.filter((chain) => {
      return accountService.isAccountAvailableOnChain(initiator, chain);
    });
  },
);

const $signatories = createSignatoriesStore({
  chain: form.fields.chain.$value,
  accounts: walletModel.$availableAccounts,
  initiator: form.fields.initiator.$value,
});

const $showSignatories = combine(
  $signatories,
  form.fields.initiator.$value,
  (signatories, initiator) => signatories.length > 1 || signatories.at(0)?.accountId !== initiator?.accountId,
);

sample({
  clock: $signatories,
  target: balanceSubModel.fetchAccounts,
});

// flow setup

// Preselect initiator on form open
sample({
  clock: flowStarted,
  source: {
    selectedWallet: walletSelect.$selectedWallet,
    allAccounts: walletModel.$availableAccounts,
    initiator: form.fields.initiator.$value,
  },
  fn: ({ selectedWallet, allAccounts, initiator }) => {
    if (nonNullable(initiator) || nullable(selectedWallet)) return initiator;

    const matchingAccount = allAccounts.find((account) =>
      selectedWallet.accounts.some((walletAccount) => walletAccount.accountId === account.accountId),
    );

    return (matchingAccount || allAccounts.at(0)) ?? null;
  },
  target: form.fields.initiator.change,
});

sample({
  clock: flowStarted,
  source: {
    allChains: $allChains,
    selectedChain: form.fields.chain.$value,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ initiator, selectedChain }) =>
    nullable(selectedChain) ||
    (nonNullable(initiator) && accountService.isAccountAvailableOnChain(initiator, selectedChain)),
  fn: ({ allChains, initiator }) => {
    if (nullable(initiator)) return null;
    return allChains.find((chain) => accountService.isAccountAvailableOnChain(initiator, chain)) ?? null;
  },
  target: form.fields.chain.change,
});

sample({
  clock: form.fields.chain.change,
  source: {
    initiator: form.fields.initiator.$value,
    allAccounts: walletModel.$availableAccounts,
  },
  filter: ({ initiator }, chain) => {
    if (nullable(initiator) || nullable(chain)) return false;
    return !accountService.isAccountAvailableOnChain(initiator, chain);
  },
  fn: ({ initiator, allAccounts }, chain) => {
    if (nullable(initiator) || nullable(chain)) return null;

    const walletAccounts = accountService.filterAccountsByWallet(allAccounts, initiator.walletId);
    const matchingAccount = walletAccounts.find((account) => accountService.isAccountAvailableOnChain(account, chain));

    if (matchingAccount) {
      return matchingAccount;
    }

    return allAccounts.filter((a) => accountService.isAccountAvailableOnChain(a, chain))?.at(0) ?? null;
  },
  target: form.fields.initiator.change,
});

// Preselect signatory when initiator changes
sample({
  clock: [$signatories],
  source: {
    selectedSignatory: form.fields.signatory.$value,
  },
  filter: ({ selectedSignatory }, signatories) =>
    !selectedSignatory || !signatories.some((s) => s.accountId === selectedSignatory.accountId),
  fn: (_, signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: form.fields.chain.change,
  target: form.fields.callData.resetError,
});

const $canSubmit = combine(
  {
    formValid: form.$isValid,
    valid: $valid,
    extrinsic: $wrappedExtrinsic,
    fee: $fee,
  },
  ({ formValid, valid, extrinsic, fee }) => formValid && valid && nonNullable(extrinsic) && !fee?.isZero(),
);

// submit flow

const showConfirmation = sample({
  clock: form.submit.doneData,
  source: {
    transaction: $wrappedTx,
    args: $wrappedArgs,
    fee: $fee,
    api: $api,
  },
  fn: (source, form) => {
    if (!nonNullableMap(source) || !nonNullableMap(form)) return null;

    return {
      api: source.api,
      chain: form.chain,
      transaction: source.transaction,
      initiator: form.initiator,
      signatory: form.signatory || form.initiator,
      route: [form.signatory || form.initiator],
      args: source.args,
      fee: source.fee,
    } satisfies ConfirmInput;
  },
});

sample({
  clock: showConfirmation.filter({ fn: nonNullable }),
  fn: (payload) => [payload],
  target: confirmModel.init,
});

// pass signatory from form
const sign = sample({
  clock: confirmModel.startSigning,
  source: {
    form: form.$values,
    transaction: $wrappedTx,
    api: $api,
  },
  fn({ form, transaction, api }) {
    if (
      nullable(api) ||
      nullable(transaction) ||
      nullable(form.initiator) ||
      nullable(form.signatory) ||
      nullable(form.chain)
    )
      return null;

    return {
      transaction,
      signatory: form.signatory,
      chain: form.chain,
      api,
    } satisfies TransactionSigningPayload;
  },
});

sample({
  clock: sign.filter({ fn: nonNullable }),
  fn: (payload) => [payload],
  target: signModel.init,
});

sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

export const formModel = {
  form,
  $canSubmit,
  $step,
  $api,
  $call,
  $args,
  $fee,
  $pendingFee,
  $errors,

  $allChains: $allChains,
  $availableChains: $availableChains,
  $signatories: $signatories,
  $showSignatories: $showSignatories,

  stepChanged,
  flowStarted,
  flowFinished,
};
