import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly, throttle } from 'patronum';

import { type Chain } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { createForm } from '@/shared/forms';
import { nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { createFeeCalculator } from '@/shared/transactions';
import { type AnyAccount, accountService, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type ExtrinsicSigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '../../operations/OperationSubmit';
import { Step } from '../lib/types';

import { type ConfirmInput, confirmModel } from './confirm';
import { callDataExecuteFeature } from './feature';

type FormData = {
  chain: Chain | null;
  signatory: AnyAccount | null;
  callData: string;
};

const flow = createGate();

const form = createForm<FormData>({
  fields: {
    chain: {
      defaultValue: null,
      validator: () => (chain) => {
        if (!chain) return { message: 'callData.errors.chainRequired' };
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => (signatory) => {
        if (!signatory) return { message: 'callData.errors.signatoryRequired' };
      },
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

const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
const $args = $extrinsic.map((extrinsic) => {
  return extrinsic ? ((extrinsic.method.toHuman() as object) ?? null) : null;
});

const createExtrinsicFx = createQueuedEffect(({ callData, api }: { callData: string; api: ApiPromise }) => {
  if (callData.length === 0 || nullable(api)) return null;
  return transactionService.createSubmittableExtrinsicFromCallData(callData, api);
});

const $throttledCallData = restore(throttle(form.fields.callData.$value, 500), '').reset(flow.close);

const createExtrinsic = combine({
  callData: $throttledCallData,
  api: $api,
}).updates.filterMap((params) => {
  if (nonNullableMap(params)) return params;
});

sample({
  clock: createExtrinsic,
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
  clock: signModel.output.formSubmitted,
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
    signatories: $availableSignatories,
  },
  ({ chains, signatories }) => {
    if (signatories.length === 0) return chains;
    return chains.filter((chain) => {
      return signatories.some((a) => accountService.isAccountAvailableOnChain(a, chain));
    });
  },
);

const $signatories = combine(form.fields.chain.$value, $availableSignatories, (chain, signatories) => {
  if (nullable(chain)) return [];
  return signatories.filter((a) => accountService.isAccountAvailableOnChain(a, chain));
});

// flow setup

sample({
  clock: flow.open,
  source: $availableChains,
  fn: (chains) => chains.at(0) ?? null,
  target: form.fields.chain.change,
});

sample({
  clock: flow.close,
  target: form.reset,
});

const $canSubmit = combine(
  {
    isValid: form.$isValid,
    decodedTx: $extrinsic,
  },
  ({ isValid, decodedTx }) => isValid && nonNullable(decodedTx),
);

// submit flow

sample({
  clock: form.submit.doneData,
  source: {
    extrinsic: $extrinsic,
    args: $args,
    fee: $fee,
  },
  fn: ({ extrinsic, args, fee }, { chain, signatory }): ConfirmInput[] => {
    return [
      {
        chain,
        extrinsic,
        initiator: signatory,
        signatory: signatory,
        route: [signatory],
        args,
        fee,
      },
    ];
  },
  target: confirmModel.init,
});

sample({
  clock: confirmModel.startSigning,
  source: {
    form: form.$values,
    extrinsic: $extrinsic,
  },
  fn({ form, extrinsic }): ExtrinsicSigningPayload[] {
    const payload: ExtrinsicSigningPayload = {
      extrinsic,
      signatory: form.signatory,
      chain: form.chain,
    };
    return [payload];
  },
  target: signModel.events.init,
});

sample({
  clock: signModel.events.signed,
  source: {
    open: flow.status,
    api: $api,
  },
  filter: ({ open }) => open,
  fn: ({ api }, payload) => ({ api: api!, payload }),
  target: submitModel.events.init,
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

  $signatories,
  $availableChains,

  stepChanged,
};
