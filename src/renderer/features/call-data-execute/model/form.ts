import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly, throttle } from 'patronum';

import { type CallData, type Chain } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { type Form, createForm } from '@/shared/forms';
import { getNativeAsset, nonNullable, nonNullableMap, nullable, withdrawableAmountBN } from '@/shared/lib/utils';
import { createFeeCalculator } from '@/shared/transactions';
import { type AnyAccount, type EncodedTransaction, accountService, transactionService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// TODO move balances subscription to balance model
import { balanceSubModel } from '@/features/assets-balances';
import { type TransactionSigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { Step } from '../lib/types';
import { callDataExecuteService } from '../service';

import { type ConfirmInput, confirmModel } from './confirm';
import { callDataExecuteFeature } from './feature';

type FormData = {
  chain: Chain | null;
  signatory: AnyAccount | null;
  callData: string;
};

const flow = createGate();

const form: Form<FormData> = createForm<FormData>({
  fields: {
    chain: {
      defaultValue: null,
      validator: () => (chain) => {
        if (!chain) return { message: 'callData.errors.chainRequired' };
      },
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

// extrinsic

const $api = combine(form.fields.chain.$value, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

const $throttledCallData = restore(throttle(form.fields.callData.$value, 500), '').reset(flow.close);

const $transaction = $throttledCallData.map((callData): EncodedTransaction | null => {
  if (callData.length === 0) return null;
  return {
    type: 'encoded',
    callData: callData as CallData,
  };
});

const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
const $args = combine($extrinsic, form.fields.chain.$value, (extrinsic, chain) => {
  return extrinsic && chain ? callDataExecuteService.formatExtrinsic(extrinsic, chain) : null;
});

const createExtrinsicFx = createQueuedEffect(
  ({ transaction, api }: { transaction: EncodedTransaction | null; api: ApiPromise | null }) => {
    if (nullable(transaction) || nullable(api)) return null;
    return transactionService.createSubmittableExtrinsicFromCallData(transaction.callData, api);
  },
);

sample({
  source: { transaction: $transaction, api: $api },
  target: createExtrinsicFx,
});

sample({
  clock: createExtrinsicFx.doneData,
  target: $extrinsic,
});

sample({
  clock: createExtrinsicFx.fail,
  fn: () => null,
  target: $extrinsic,
});

sample({
  clock: createExtrinsicFx.fail,
  fn: () => [{ message: 'callData.errors.invalidCallData' }],
  target: form.fields.callData.setErrors,
});

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  active: callDataExecuteFeature.isRunning,
  extrinsic: $extrinsic,
});

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    chain: form.fields.chain.$value,
    balances: balanceModel.$balances,
  },
  ({ signatory, chain, balances }) => {
    if (nullable(signatory) || nullable(chain)) return null;

    return (
      balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, getNativeAsset(chain.assets).assetId) ??
      null
    );
  },
);

// steps management

const stepChanged = createEvent<Step>();
const $step = readonly(restore(stepChanged, Step.NONE));

sample({
  clock: [flow.open, flow.close],
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

// form options

const $availableSignatories = walletModel.$availableAccounts.map((accounts) => {
  return accounts.filter(accountService.hasPermissionToMakeActions);
});

const $availableChains = combine(
  {
    chains: networkModel.$chains.map((chains) => Object.values(chains)),
    selectedSignatory: form.fields.signatory.$value,
  },
  ({ chains, selectedSignatory }) => {
    if (nullable(selectedSignatory)) return [];
    return chains.filter((chain) => {
      return accountService.isAccountAvailableOnChain(selectedSignatory, chain);
    });
  },
);

sample({
  clock: $availableSignatories,
  target: balanceSubModel.fetchAccounts,
});

// flow setup

sample({
  clock: [$availableChains],
  source: { availableChains: $availableChains, selectedChain: form.fields.chain.$value },
  filter: ({ availableChains, selectedChain }) =>
    !selectedChain || !availableChains.some((chain) => chain.chainId === selectedChain.chainId),
  fn: ({ availableChains }) => availableChains.at(0) ?? null,
  target: form.fields.chain.change,
});

// Preselect signatory based on selected wallet
sample({
  clock: [walletSelect.$selectedWallet, $availableSignatories, flow.open],
  source: {
    selectedWallet: walletSelect.$selectedWallet,
    availableSignatories: $availableSignatories,
    currentSignatory: form.fields.signatory.$value,
  },
  fn: ({ selectedWallet, availableSignatories, currentSignatory }) => {
    if (nonNullable(currentSignatory) || nullable(selectedWallet)) return currentSignatory;

    const matchingSignatory = availableSignatories.find((signatory) =>
      selectedWallet.accounts.some((account) => account.accountId === signatory.accountId),
    );

    console.log({ matchingSignatory });

    return matchingSignatory || null;
  },
  target: form.fields.signatory.change,
});

sample({
  clock: form.fields.chain.change,
  target: form.fields.callData.resetError,
});

sample({
  clock: form.fields.chain.change,
  source: form.fields.signatory.$value,
  fn: (signatory, chain) => {
    if (nullable(signatory) || nullable(chain)) return null;

    return signatory;
  },
  target: form.fields.signatory.change,
});

sample({
  clock: flow.close,
  target: form.reset,
});

const $canSubmit = combine(
  {
    isValid: form.$isValid,
    extrinsic: $extrinsic,
    fee: $fee,
  },
  ({ isValid, extrinsic, fee }) => isValid && nonNullable(extrinsic) && !fee.isZero(),
);

// submit flow

const showConfirmation = sample({
  clock: form.submit.doneData,
  source: {
    transaction: $transaction,
    args: $args,
    fee: $fee,
    api: $api,
  },
  fn: (source, form) => {
    if (!nonNullableMap(source) || !nonNullableMap(form)) return null;

    return {
      api: source.api,
      chain: form.chain,
      transaction: source.transaction,
      initiator: form.signatory,
      signatory: form.signatory,
      route: [form.signatory],
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

const sign = sample({
  clock: confirmModel.startSigning,
  source: {
    form: form.$values,
    transaction: $transaction,
    api: $api,
  },
  fn({ form, transaction, api }) {
    if (nullable(api) || nullable(transaction) || nullable(form.signatory) || nullable(form.chain)) return null;
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
  source: flow.status,
  filter: (open) => open,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

export const formModel = {
  flow,
  form,
  $canSubmit,
  $step,
  $api,
  $extrinsic,
  $args,
  $fee,
  $pendingFee,

  $availableSignatories,
  $availableChains,

  stepChanged,
};
