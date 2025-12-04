import { BN_ZERO } from '@polkadot/util';
import { combine, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type Transaction } from '@/shared/core';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
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

const validator = createTxValidator();
const { $errors, $valid, $balanceValidationResults } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $chain.map(chain => (chain ? getNativeAsset(chain.assets) : null)),
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $multisigDeposit = combine({ results: $balanceValidationResults }, ({ results }) => {
  const actions = getActionRequiredAmount(results, 'multisig deposit');
  return actions.reduce((deposit, action) => deposit.add(action.required), BN_ZERO);
});

export const rejectModel = {
  flow,
  $transaction: $tx,
  $fee,
  $isFeeLoading,
  $multisigDeposit,
  $signatory,
  $initiator,
  $errors,
  $valid,
};
