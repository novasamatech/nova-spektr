import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { throttle } from 'patronum';

import { type Chain } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { createForm } from '@/shared/forms';
import { nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { Step } from '../lib/types';

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
  // @ts-expect-error args field is not defined in types
  return extrinsic ? (extrinsic.method.toHuman()?.args ?? null) : null;
});

const createExtrinsicFx = createQueuedEffect(({ callData, api }: { callData: string; api: ApiPromise }) => {
  if (callData.length === 0 || !callData.startsWith('0x') || nullable(api)) return null;
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

// steps management

const stepChanged = createEvent<Step>();
const $step = restore(stepChanged, Step.NONE);

sample({
  clock: flow.open,
  fn: () => Step.INIT,
  target: stepChanged,
});

// form options

const $availableSignatories = walletModel.$availableAccounts.map((accounts) =>
  accounts.filter(accountService.hasPermissionToMakeActions),
);

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

export const formModel = {
  flow,
  form,
  $canSubmit,
  $step,
  $api,
  $extrinsic,
  $args,

  $signatories,
  $availableChains,

  stepChanged,
};
