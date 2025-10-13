import { type SignerPayloadJSON } from '@polkadot/types/types';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { type CallData } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { type Form, createForm } from '@/shared/forms';
import {
  getNativeAsset,
  nonNullable,
  nonNullableMap,
  nullable,
  toAccountId,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import {
  createFeeCalculator,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { createRouteStore } from '@/shared/transactions/createRouteStore';
import { createWrappedTxStore } from '@/shared/transactions/createWrappedTxStore';
import { type AnyAccount, type EncodedTransaction, accountService, transactionService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService as transactionEntitiesService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
// TODO move balances subscription to balance model
import { balanceSubModel } from '@/features/assets-balances';
import { type SignatureResult, type TransactionSigningPayload, signModel } from '@/features/operations/OperationSign';

import { type ConfirmInput, confirmModel } from './confirm';
import { dappBrowserFeature } from './feature';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
}

type FormData = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
};

const flow = createGate<{ payload: SignerPayloadJSON | null }>({ defaultState: { payload: null } });

const form: Form<FormData> = createForm<FormData>({
  fields: {
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
  },
});

// common

const $payload = flow.state.map(({ payload }) => payload ?? null);

const $chain = combine(networkModel.$chains, $payload, (chains, payload) => {
  if (nullable(payload)) return null;
  return chains[payload.genesisHash] ?? null;
});
const $asset = $chain.map((c) => (c ? getNativeAsset(c.assets) : null));

const $api = combine($chain, networkModel.$apis, (chain, apis) => {
  return chain ? (apis[chain.chainId] ?? null) : null;
});

// signature

const $signatureResult = createStore<SignatureResult | null>(null).reset(flow.close);

// extrinsic

const $callData = $payload.map((payload) => payload?.method ?? '');

const $coreTx = $callData.map((callData): EncodedTransaction | null => {
  if (callData.length === 0) return null;
  return {
    type: 'encoded',
    callData: callData as CallData,
  };
});

const $route = createRouteStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: walletModel.$availableAccounts,
});

const { $tx: $wrappedTx } = createWrappedTxStore({
  api: $api,
  transaction: $coreTx,
  route: $route,
});

const { $: $wrappedExtrinsic } = createStoreFromEffect({
  params: { transaction: $wrappedTx, api: $api },
  defaultValue: null,
  fn: ({ transaction, api }) => transactionService.createExtrinsic(transaction, api),
});

const $wrappedArgs = combine($wrappedExtrinsic, $chain, (extrinsic, chain) => {
  return extrinsic && chain ? transactionEntitiesService.formatCall(extrinsic.method, chain) : null;
});

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  active: dappBrowserFeature.isRunning,
  extrinsic: $wrappedExtrinsic,
});

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    chain: $chain,
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

// steps management

const setStep = createEvent<Step>();
const $step = readonly(restore(setStep, Step.NONE));

sample({
  clock: [flow.open, flow.close],
  fn: () => Step.INIT,
  target: setStep,
});

sample({
  clock: form.submit.done,
  fn: () => Step.CONFIRM,
  target: setStep,
});

sample({
  clock: confirmModel.startSigning,
  fn: () => Step.SIGN,
  target: setStep,
});

// initiators

const $initiatorAccountId = $payload.map((payload) => (payload ? toAccountId(payload.address) : null));

const $initiators = combine(
  {
    allAccounts: walletModel.$availableAccounts,
    chain: $chain,
    initiatorAccountId: $initiatorAccountId,
  },
  ({ allAccounts, chain, initiatorAccountId }) => {
    if (nullable(chain) || nullable(initiatorAccountId)) return [];
    return allAccounts.filter(
      (account) => account.accountId === initiatorAccountId && accountService.isAccountAvailableOnChain(account, chain),
    );
  },
);

// signatories

const $signatories = createSignatoriesStore({
  chain: $chain,
  accounts: walletModel.$availableAccounts,
  initiator: form.fields.initiator.$value,
});

const $showSignatories = combine(
  form.fields.initiator.$value,
  form.fields.signatory.$value,
  (initiator, signatory) => signatory?.accountId !== initiator?.accountId,
);

const $signatoryWallet = combine(walletModel.$wallets, form.fields.signatory.$value, (wallets, signatory) =>
  signatory ? (wallets.find((w) => w.id === signatory.walletId) ?? null) : null,
);

sample({
  clock: $signatories,
  target: balanceSubModel.fetchAccounts,
});

// flow setup

// Preselect initiator on form open

sample({
  clock: $initiators,
  source: form.fields.initiator.$value,
  filter: (initiator) => nullable(initiator),
  fn: (_, initiators) => initiators.at(0) ?? null,
  target: form.fields.initiator.change,
});

// Preselect signatory when initiator changes
sample({
  clock: $signatories,
  source: {
    selectedSignatory: form.fields.signatory.$value,
  },
  filter: ({ selectedSignatory }, signatories) =>
    !selectedSignatory || !signatories.some((s) => s.accountId === selectedSignatory.accountId),
  fn: (_, signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: flow.close,
  target: form.reset,
});

const $canSubmit = combine(
  {
    formValid: form.$isValid,
    valid: $valid,
    extrinsic: $wrappedExtrinsic,
    fee: $fee,
  },
  ({ formValid, valid, extrinsic, fee }) => formValid && valid && nonNullable(extrinsic) && !fee.isZero(),
);

// submit flow

const showConfirmation = sample({
  clock: form.submit.doneData,
  source: {
    transaction: $wrappedTx,
    args: $wrappedArgs,
    chain: $chain,
    fee: $fee,
    api: $api,
  },
  fn: (source, form) => {
    if (!nonNullableMap(source) || !nonNullableMap(form)) return null;

    return {
      api: source.api,
      chain: source.chain,
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
    chain: $chain,
    api: $api,
  },
  fn({ form, transaction, api, chain }) {
    if (
      nullable(api) ||
      nullable(chain) ||
      nullable(transaction) ||
      nullable(form.initiator) ||
      nullable(form.signatory)
    )
      return null;

    return {
      transaction,
      signatory: form.signatory,
      chain,
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
  fn: (results) => results.at(0) ?? null,
  target: $signatureResult,
});

export const formModel = {
  flow,
  form,
  $canSubmit,
  $step,
  $chain,
  $asset,
  $api,
  $args: $wrappedArgs,
  $fee,
  $pendingFee,
  $errors,

  $initiators,

  $signatories,
  $showSignatories,
  $signatoryWallet,

  $signatureResult,

  setStep,
};
