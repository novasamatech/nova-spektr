import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';

import { Step, getRelaychainAsset, isStep, nonNullable, nullable, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegationAggregate, networkSelectorModel, votingAggregate } from '@/features/governance';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { revokeDelegationConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type RevokeDelegationConfirm } from '@/features/operations/OperationsConfirm/RevokeDelegation/model/confirm-model';
import { type RevokeDelegationData } from '../lib/types';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: AccountId; accounts: AnyAccount[] }>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ apis, chain }) => {
    return chain ? (apis[chain.chainId] ?? null) : null;
  },
);

const $initiator = createStore<AnyAccount | null>(null);
const $delegate = createStore<AccountId | null>(null);

const $revokeDelegationData = combine(
  {
    initiator: $initiator,
    delegate: $delegate,
    activeTracks: delegationAggregate.$activeTracks,
  },
  ({ initiator, delegate, activeTracks }) => {
    if (nullable(initiator) || nullable(delegate)) return null;

    const tracks = activeTracks[delegate][initiator.accountId].map(Number);

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

const { $fee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: $initiator,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
});

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

// Steps

sample({
  clock: flowStarted,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

const dataSubmitted = sample({
  source: {
    balances: balanceModel.$balanceMap,
    fee: $fee,
    chain: networkSelectorModel.$governanceChain,
    revokeDelegationData: $revokeDelegationData,
    delegations: delegationAggregate.$activeDelegations,
    coreTx: $coreTx,
    tx: $tx,
    route: $route,
    initiator: $initiator,
    signatory: $signatory,
    delegate: $delegate,
    multisigDeposit: $multisigDeposit,
  },
}).updates.filterMap(
  ({
    fee,
    balances,
    chain,
    revokeDelegationData,
    delegations,
    coreTx,
    route,
    tx,
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
      const transferable = transferableAmount(
        balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId),
      );

      return [
        {
          chain,
          asset,
          balance: delegationData.balance.toString(),
          conviction: delegationData.conviction,
          transferable,
          initiator,
          signatory,
          delegate,
          tracks: revokeDelegationData.tracks,
          locks: revokeDelegationData.locks[initiator.accountId],
          coreTx,
          route,
          tx,
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit: multisigDeposit.toString(),
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
    };
  },
  target: spread({
    event: confirmModel.init,
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
    wallet: walletSelect.$selectedWallet,
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
    initiator: $initiator,
    signatory: $signatory,
    step: $step,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ chain, transaction, coreTx, initiator, signatory, step, signParams }) => {
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
    route: $route,
  },
  filter: ({ chain, coreTx, route }) => {
    return nonNullable(chain) && nonNullable(coreTx) && nonNullable(route);
  },
  fn: ({ chain, accounts, coreTx, route }) => {
    const chainAccounts = chain ? accountService.filterAccountsOnChain(accounts, chain) : [];
    const account = chainAccounts.at(0);
    if (!account) throw new Error('Account not found');

    return [
      {
        coreTx: coreTx!,
        route,
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
