import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain } from '@/shared/core';
import { getNativeAsset, nonNullable, nullable, validateCallData } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import {
  type AnyAccount,
  type MultisigOperation,
  accountService,
  accounts,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { MAX_WEIGHT, getExtrinsic, transactionBuilder } from '@/entities/transaction';

import { operationsContextModel } from './context';

type GetMultisigType = {
  chain: Chain | null;
  operation: MultisigOperation | null;
};

const flow = createGate<GetMultisigType>({
  defaultState: { chain: null, operation: null },
});

const selectInitiator = createEvent<AnyAccount | null>();
const $initiator = restore<AnyAccount | null>(selectInitiator, null).reset(flow.open);

const $weight = createStore<Weight | null>(null);

const selectSignatory = createEvent<AnyAccount | null>();
const $signatory = restore<AnyAccount | null>(selectSignatory, null).reset(flow.open);

const $chain = flow.state.map(state => state.chain);
const $operation = flow.state.map(state => state.operation);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (nullable(chain?.chainId)) return null;

    return apis[chain.chainId] ?? null;
  },
);

const $unsignedAccounts = combine(
  {
    multisigAccount: operationsContextModel.$multisigAccount,
    chain: $chain,
    accountsList: accounts.$list,
    operation: $operation,
  },
  ({ multisigAccount, chain, accountsList, operation }) => {
    if (!multisigAccount || !chain || !operation) return [];

    const signatories = accountsList.filter(a =>
      multisigAccount.signatories.some(s => s.accountId === a.accountId && (s.id ? s.id === a.walletId : true)),
    );

    const signatoriesOnChain = signatories.filter(s => accountService.isAccountAvailableOnChain(s, chain));

    const filteredSignatories = signatoriesOnChain.filter(
      a => !operation.events.some(e => e.accountId === a.accountId),
    );

    return filteredSignatories;
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: $initiator,
  accounts: accounts.$list,
});

sample({
  clock: $unsignedAccounts,
  filter: $unsignedAccounts.map(unsignedAccounts => unsignedAccounts.length === 1),
  fn: unsignedAccounts => unsignedAccounts.at(0) ?? null,
  target: $initiator,
});
sample({
  clock: $signatories,
  filter: $signatories.map(signatories => signatories.length === 1),
  fn: signatories => signatories.at(0) ?? null,
  target: $signatory,
});

// Get weight
type ExtrinsicSigningPayload = {
  operation: MultisigOperation;
  api: ApiPromise;
};

const getWeightFx = createEffect(async ({ operation, api }: ExtrinsicSigningPayload) => {
  if (!operation.callData) return null;

  try {
    const weight = await transactionService.getTransactionWeight(
      { type: 'encoded', callData: operation.callData },
      api,
    );
    return weight;
  } catch {
    return api.createType('Weight', MAX_WEIGHT);
  }
});

sample({
  clock: $operation,
  source: $api,
  filter: (api, operation) => nonNullable(api) && nonNullable(operation),
  fn: (api, operation) => ({ operation: operation!, api: api! }),
  target: getWeightFx,
});

sample({
  clock: getWeightFx.doneData,
  target: $weight,
});

const $transaction = combine(
  {
    multisigAccount: operationsContextModel.$multisigAccount,
    signatory: $signatory,
    initiator: $initiator,
    chain: $chain,
    operation: $operation,
    weight: $weight,
  },
  ({ multisigAccount, chain, operation, signatory, weight, initiator }) => {
    if (!multisigAccount || !operation || !chain || !signatory || !weight || !initiator) return null;

    const otherSignatories = multisigOperationService.getOtherSignatories(multisigAccount, initiator.accountId);
    const hasCallData = operation.callData && validateCallData(operation.callData, operation.callHash);

    return transactionBuilder.buildApproveMultisigTx({
      chain,
      signerAccountId: signatory.accountId,
      threshold: multisigAccount.threshold,
      otherSignatories,
      tx: operation,
      hasCallData: !!hasCallData,
      maxWeight: weight,
    });
  },
);

const {
  $tx,
  $route,
  $fee,
  $pendingFee: $isFeeLoading,
} = createComplexTxStore({
  api: $api,
  initiator: $initiator,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $transaction,
});

const $extrinsic = combine($api, $tx, (api, tx) => {
  if (nullable(api) || nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $multisigDeposit, $pending: $isDepositLoading } = createMultisigDeposit({
  $api: $api,
  $threshold: operationsContextModel.$multisigAccount.map(account => account?.threshold ?? null),
});

const $signingPayloads = combine(
  {
    api: $api,
    chain: $chain,
    extrinsic: $extrinsic,
    signatory: $signatory,
  },
  ({ api, chain, extrinsic, signatory }) => {
    if (nullable(extrinsic) || nullable(signatory) || nullable(api) || nullable(chain)) return null;

    return [
      {
        api,
        chain,
        extrinsic,
        signatory,
      },
    ];
  },
);

const validator = createTxValidator();
const { $errors, $valid } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $chain.map(chain => (chain ? getNativeAsset(chain.assets) : null)),
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

export const approveModel = {
  flow,
  $transaction: $tx,
  $fee,
  $isFeeLoading,
  $isDepositLoading,
  $errors,
  $multisigDeposit,
  $signatory,
  $signingPayloads,
  $initiator,
  $unsignedAccounts,

  $valid,

  $signatories,
  selectSignatory,
  selectInitiator,
};
