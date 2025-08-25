import { BN } from '@polkadot/util';
import { combine, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Transaction } from '@/shared/core';
import { getNativeAsset, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { createComplexTxStore, createMultisigDeposit } from '@/shared/transactions';
import {
  type AnyAccount,
  type MultisigOperation,
  accountService,
  accounts,
  multisigOperationService,
} from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';

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

const $signatory = combine(
  {
    operation: $operation,
    chain: $chain,
    accounts: accounts.$list,
  },
  ({ operation, chain, accounts }) => {
    if (!operation || !chain) return null;
    const depositorAccount = accounts.find(a => a.accountId === operation.depositor);

    if (!depositorAccount) return null;

    return accountService.findSignatories(depositorAccount, accounts, chain).at(0) ?? null;
  },
);

const $initiator = combine(
  {
    operation: $operation,
    accounts: accounts.$list,
  },
  ({ operation, accounts }) => {
    if (!operation) return null;
    return accounts.find(a => a.accountId === operation.depositor) ?? null;
  },
);

sample({
  clock: flow.open,
  source: {
    multisigAccount: operationsContextModel.$multisigAccount,
    signatory: $signatory,
    chain: $chain,
    operation: $operation,
    initiator: $initiator,
  },
  filter: ({ multisigAccount }) => nonNullable(multisigAccount),
  fn: ({ multisigAccount, chain, operation, signatory, initiator }) => {
    if (!operation || !chain || !signatory || !multisigAccount || !initiator) return null;
    const otherSignatories = multisigOperationService.getOtherSignatories(multisigAccount, initiator.accountId);

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

const {
  $tx,
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
  $transaction: $tx,
  $fee,
  $isFeeLoading,
  $isDepositLoading: $pendingMultisigDepositFee,
  $isEnoughBalance,
  $multisigDeposit,
  $signatory,
  $initiator,
};
