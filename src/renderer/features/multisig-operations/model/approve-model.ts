import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain } from '@/shared/core';
import { getNativeAsset, nonNullable, nullable, transferableAmount, validateCallData } from '@/shared/lib/utils';
import { createFeeCalculator, createMultisigDeposit } from '@/shared/transactions';
import {
  type AnyAccount,
  type MultisigOperation,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
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

const selectSigner = createEvent<AnyAccount | null>();

const $signatory = restore<AnyAccount | null>(selectSigner, null).reset(flow.open);
const $weight = createStore<Weight | null>(null);

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

// Get weight
type ExtrinsicSigningPayload = {
  operation: MultisigOperation;
  api: ApiPromise;
};

const getWeightFx = createEffect(async ({ operation, api }: ExtrinsicSigningPayload) => {
  const transaction = operation.transaction;
  if (!transaction?.type) return null;

  const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
  try {
    return await transactionService.getExtrinsicWeight(extrinsic);
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
    chain: $chain,
    operation: $operation,
    weight: $weight,
  },
  ({ multisigAccount, chain, operation, signatory, weight }) => {
    if (!multisigAccount || !operation || !chain || !signatory || !weight) return null;

    const otherSignatories = multisigOperationService.getOtherSignatories(multisigAccount, signatory.accountId);
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

const $extrinsic = combine($api, $transaction, (api, tx) => {
  if (nullable(api) || nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $: $fee, $pending: $isFeeLoading } = createFeeCalculator({
  extrinsic: $extrinsic,
});

const $isEnoughBalance = combine(
  {
    api: $api,
    transaction: $transaction,
    signatory: $signatory,
    balances: balanceModel.$balanceMap,
    chain: $chain,
    fee: $fee,
  },
  ({ signatory, balances, chain, fee }) => {
    if (!signatory?.accountId || !chain || !fee) {
      return false;
    }

    const nativeAsset = getNativeAsset(chain.assets);
    const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, nativeAsset.assetId);

    if (!balance) {
      return false;
    }

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  },
);

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

export const approveModel = {
  flow,
  $transaction,
  $fee,
  $isFeeLoading,
  $isDepositLoading,
  $isEnoughBalance,
  $multisigDeposit,
  $signatory,

  selectSigner,
  $signingPayloads,
};
