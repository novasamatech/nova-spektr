import { BN_ZERO } from '@polkadot/util';
import { combine } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type MultisigOperation, accountService, accounts, multisigOperationService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { createSigningPathModel } from '@/features/signing-path';

type GetMultisigType = {
  chain: Chain | null;
  operation: MultisigOperation | null;
  account: MultisigAccount | FlexibleMultisigAccount | null;
};

const flow = createGate<GetMultisigType>({
  defaultState: { chain: null, operation: null, account: null },
});

const $chain = flow.state.map(state => state.chain);
const $operation = flow.state.map(state => state.operation);
const $multisigAccount = flow.state.map(state => state.account);

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

const $transaction = combine(
  {
    multisigAccount: $multisigAccount,
    signatory: $signatory,
    chain: $chain,
    operation: $operation,
    initiator: $initiator,
  },
  ({ multisigAccount, chain, operation, signatory, initiator }) => {
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
);

const { $pathRoute } = createSigningPathModel({
  initiator: $initiator,
  chain: $chain,
  resetOn: flow.open,
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
  routeOverride: $pathRoute,
});

// Reset async-computed stores on new flow to prevent stale data from previous rejection
$tx.reset(flow.open);
$fee.reset(flow.open);

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

const $extrinsic = combine($api, $tx, (api, tx) => {
  if (nullable(api) || nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const $signingPayloads = combine(
  { api: $api, chain: $chain, extrinsic: $extrinsic, signatory: $signatory },
  ({ api, chain, extrinsic, signatory }) => {
    if (nullable(api) || nullable(chain) || nullable(extrinsic) || nullable(signatory)) return null;
    return [{ api, chain, extrinsic, signatory }];
  },
);

export const rejectModel = {
  flow,
  $transaction: $tx,
  $fee,
  $isFeeLoading,
  $multisigDeposit,
  $multisigAccount,
  $signatory,
  $signingPayloads,
  $initiator,
  $errors,
  $valid,
};
