import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';

import { type Address } from '@/shared/core';
import {
  Step,
  ZERO_BALANCE,
  getRelaychainAsset,
  isStep,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxWrappers } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegationAggregate, networkSelectorModel, votingAggregate } from '@/features/governance';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { revokeDelegationConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type RevokeDelegationConfirm } from '@/features/operations/OperationsConfirm/RevokeDelegation/model/confirm-model';
import { type RevokeDelegationData } from '../lib/types';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: Address; accounts: AnyAccount[] }>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $multisigDeposit = createStore(ZERO_BALANCE);

type DepositParams = {
  api: ApiPromise;
  threshold: number;
};
const getMultisigDepositFx = createEffect(({ api, threshold }: DepositParams): string => {
  return transactionService.getMultisigDeposit(threshold, api);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ apis, chain }) => {
    return chain ? apis[chain.chainId] : null;
  },
);

const $initiator = createStore<AnyAccount | null>(null);
const $delegate = createStore<Address | null>(null);

const $revokeDelegationData = combine(
  {
    initiator: $initiator,
    delegate: $delegate,
    activeTracks: delegationAggregate.$activeTracks,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ initiator, delegate, activeTracks, chain }) => {
    if (nullable(initiator) || nullable(delegate)) return null;

    const address = toAddress(initiator.accountId, { prefix: chain?.addressPrefix });
    const tracks = activeTracks[delegate][address].map(Number);

    return {
      tracks,
      locks: { [initiator.accountId]: new BN(0) },
    } satisfies RevokeDelegationData;
  },
);

sample({
  clock: flowStarted,
  fn: ({ delegate, accounts }) => ({ account: accounts.at(0) ?? null, delegate }),
  target: spread({
    account: $initiator,
    delegate: $delegate,
  }),
});

// Signatory

const selectSignatory = createEvent<AnyAccount>();

const $signatory = createStore<AnyAccount | null>(null);

const $signatories = createSignatoriesStore({
  chain: networkSelectorModel.$governanceChain,
  initiator: $initiator,
  accounts: accounts.$list,
});

sample({
  clock: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories) => signatories.at(0) ?? null,
  target: $signatory,
});

sample({
  clock: selectSignatory,
  target: $signatory,
});

const $txWrappers = createTxWrappers({
  initiator: $initiator,
  wallets: walletModel.$wallets,
  wallet: walletSelect.$selectedWallet,
  chain: networkSelectorModel.$governanceChain,
  signatory: $signatory,
});

const $coreTx = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    data: $revokeDelegationData,
    initiator: $initiator,
    signatory: $signatory,
    delegate: $delegate,
  },
  ({ chain, data, initiator, signatory, delegate }) => {
    if (nullable(chain) || nullable(data) || nullable(initiator) || nullable(signatory) || nullable(delegate)) {
      return null;
    }

    return transactionBuilder.buildUndelegate({
      chain,
      accountId: signatory.accountId,
      tracks: data.tracks,
    });
  },
);

const { $fee, $tx, $multisigTx, $route } = createComplexTxStore({
  api: $api,
  initiator: $initiator,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
});

sample({
  source: {
    api: $api,
    route: $route,
  },
  filter: ({ api, route }) => nonNullable(api) && nonNullable(route),
  fn: ({ api, route }) => {
    const multisig = route.find(accountUtils.isMultisigAccount);
    return {
      api: api!,
      threshold: multisig?.threshold ?? 0,
    };
  },
  target: getMultisigDepositFx,
});

sample({
  clock: getMultisigDepositFx.doneData,
  target: $multisigDeposit,
});

// Steps

sample({
  clock: stepChanged,
  target: $step,
});

const dataSubmitted = sample({
  clock: flowStarted,
  source: {
    balances: balanceModel.$balances,
    fee: $fee,
    chain: networkSelectorModel.$governanceChain,
    revokeDelegationData: $revokeDelegationData,
    delegations: delegationAggregate.$activeDelegations,
    coreTx: $coreTx,
    tx: $tx,
    route: $route,
    multisigTx: $multisigTx,
    initiator: $initiator,
    signatory: $signatory,
    delegate: $delegate,
    multisigDeposit: $multisigDeposit,
  },
}).filterMap(
  ({
    fee,
    balances,
    chain,
    revokeDelegationData,
    delegations,
    coreTx,
    route,
    tx,
    multisigTx,
    multisigDeposit,
    initiator,
    signatory,
    delegate,
  }) => {
    if (
      nonNullable(coreTx) &&
      nonNullable(tx) &&
      nonNullable(signatory) &&
      nonNullable(chain) &&
      nonNullable(revokeDelegationData) &&
      nonNullable(initiator) &&
      nonNullable(signatory) &&
      nonNullable(delegate)
    ) {
      const asset = getRelaychainAsset(chain.assets)!;
      const delegation = delegations[delegate];
      const delegationData = Object.values(delegation)[0];

      return [
        {
          chain,
          asset,
          balance: delegationData.balance.toString(),
          conviction: delegationData.conviction,
          transferable: transferableAmount(
            balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId.toString()),
          ),
          initiator,
          signatory,
          delegate,
          tracks: revokeDelegationData.tracks,
          locks: revokeDelegationData.locks[initiator.accountId],
          coreTx,
          route,
          tx,
          multisigTx,
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit,
        } satisfies RevokeDelegationConfirm,
      ];
    }
  },
);

sample({
  clock: dataSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

const startSigning = sample({
  clock: confirmModel.startSigning,
  source: {
    chain: networkSelectorModel.$governanceChain,
    transaction: $tx,
    initiator: $initiator,
    signatory: $signatory,
    step: $step,
  },
}).filterMap(({ initiator, signatory, chain, transaction, step }) => {
  if (
    nonNullable(initiator) &&
    nonNullable(signatory) &&
    nonNullable(chain) &&
    nonNullable(transaction) &&
    isStep(step, Step.CONFIRM)
  ) {
    return {
      signingPayloads: [
        {
          chain,
          account: initiator,
          signatory,
          transaction,
        },
      ],
    };
  }
});

sample({
  clock: startSigning,
  fn: (signingPayloads) => {
    return {
      event: signingPayloads,
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  target: votingModel.events.unsubscribeVoting,
});

sample({
  clock: combineEvents({
    events: [submitModel.output.formSubmitted, votingModel.events.unsubscribeVoting],
    reset: flowStarted,
  }),
  source: {
    network: networkSelectorModel.$network,
    wallet: walletModel.$activeWallet,
  },
  filter: ({ network, wallet }) => nonNullable(network) && nonNullable(wallet),
  fn: ({ network, wallet }) => ({
    api: network!.api,
    accounts: accountUtils.getAccountsIdsForWallet(wallet!, network!.chain),
    chain: network!.chain,
  }),
  target: votingAggregate.events.requestVoting,
});

const signSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    chain: networkSelectorModel.$governanceChain,
    transaction: $tx,
    coreTx: $coreTx,
    multisigTx: $multisigTx,
    initiator: $initiator,
    signatory: $signatory,
    step: $step,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ chain, transaction, coreTx, multisigTx, initiator, signatory, step, signParams }) => {
  if (
    nonNullable(chain) &&
    nonNullable(transaction) &&
    nonNullable(coreTx) &&
    nonNullable(initiator) &&
    nonNullable(signatory) &&
    isStep(step, Step.SIGN)
  ) {
    return {
      ...signParams,
      chain,
      account: initiator,
      signatory,
      coreTxs: [coreTx],
      wrappedTxs: [transaction],
      multisigTxs: multisigTx ? [multisigTx] : [],
    };
  }
});

sample({
  clock: signSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: (step) => isStep(step, Step.SUBMIT),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: txSaved,
  source: {
    chain: networkSelectorModel.$governanceChain,
    accounts: walletSelect.$selectedAccounts,
    coreTx: $coreTx,
    txWrappers: $txWrappers,
  },
  filter: ({ chain, coreTx, txWrappers }) => {
    return nonNullable(chain) && nonNullable(coreTx) && nonNullable(txWrappers);
  },
  fn: ({ chain, accounts, coreTx, txWrappers }) => {
    const chainAccounts = chain ? accountService.filterAccountsOnChain(accounts, chain) : [];
    const account = chainAccounts.at(0);
    if (!account) throw new Error('Account not found');

    return [
      {
        coreTx: coreTx!,
        txWrappers,
        initiatorAccountId: account.accountId,
        createdAt: Date.now(),
      },
    ];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const revokeDelegationModel = {
  $step,
  $initiator,
  $initiatorWallet: walletSelect.$selectedWallet,
  $chain: networkSelectorModel.$governanceChain,
  $tx,
  $signatories,
  $signatory,
  $network: networkSelectorModel.$network,

  flowStarted,
  stepChanged,
  txSaved,
  selectSignatory,
  flowFinished,
};
