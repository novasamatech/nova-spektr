import { combine, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Transaction } from '@/shared/core';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
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
} from '@/domains/network';
import { balanceModel } from '@/entities/balance';
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

const $initiator = combine(
  {
    operation: $operation,
    accounts: accounts.$list,
    chain: $chain,
  },
  ({ operation, accounts, chain }) => {
    if (!operation || !chain) return null;

    return (
      accounts.find(a => a.accountId === operation.depositor && accountService.isAccountAvailableOnChain(a, chain)) ??
      null
    );
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  accounts: accounts.$list,
  initiator: $initiator,
});

const $signatory = $signatories.map(s => s.at(0) ?? null);

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
  $route,
  $pendingFee: $isFeeLoading,
} = createComplexTxStore({
  api: $api,
  initiator: $initiator,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $transaction,
});

const { $multisigDeposit, $pending: $pendingMultisigDepositFee } = createMultisigDeposit({
  $api: $api,
  $threshold: operationsContextModel.$multisigAccount.map(account => account?.threshold ?? null),
});

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

export const rejectModel = {
  flow,
  $transaction: $tx,
  $fee,
  $isFeeLoading,
  $isDepositLoading: $pendingMultisigDepositFee,
  $multisigDeposit,
  $signatory,
  $initiator,
  $errors,
  $valid,
};
