import { BN } from '@polkadot/util';
import { combine, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Transaction } from '@/shared/core';
import { getNativeAsset, nonNullable, nullable, transferableAmount } from '@/shared/lib/utils';
import { createFeeCalculator, createMultisigDeposit } from '@/shared/transactions';
import { type AnyAccount, type MultisigOperation, multisigOperationService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';

import { operationsContextModel } from './context';

type GetMultisigType = {
  signer: AnyAccount | null;
  chain: Chain | null;
  operation: MultisigOperation | null;
};

const flow = createGate<GetMultisigType>({
  defaultState: { chain: null, signer: null, operation: null },
});

const $transaction = createStore<Transaction | null>(null).reset(flow.open);

const $chain = flow.state.map(state => state.chain);
const $signatory = flow.state.map(state => state.signer);
const $operation = flow.state.map(state => state.operation);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain?.chainId) return null;

    return apis[chain.chainId] ?? null;
  },
);

sample({
  clock: flow.open,
  source: {
    multisigAccount: operationsContextModel.$multisigAccount,
    signatory: $signatory,
    chain: $chain,
    operation: $operation,
  },
  filter: ({ multisigAccount }) => nonNullable(multisigAccount),
  fn: ({ multisigAccount, chain, operation, signatory }) => {
    if (!operation || !chain || !signatory || !multisigAccount) return null;
    const otherSignatories = multisigOperationService.getOtherSignatories(multisigAccount, signatory.accountId);

    return transactionBuilder.buildRejectMultisigTx({
      chain,
      signerAccountId: signatory.accountId,
      threshold: multisigAccount.threshold,
      otherSignatories,
      tx: operation,
    });
  },
  target: $transaction,
});

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
const { $multisigDeposit, $pending: $pendingMultisigDepositFee } = createMultisigDeposit({
  $api: $api,
  $threshold: operationsContextModel.$multisigAccount.map(account => account?.threshold ?? null),
});

export const rejectModel = {
  flow,
  $transaction,
  $fee,
  $isFeeLoading,
  $isDepositLoading: $pendingMultisigDepositFee,
  $isEnoughBalance,
  $multisigDeposit,
};
