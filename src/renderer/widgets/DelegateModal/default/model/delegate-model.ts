import { BN, BN_ZERO } from '@polkadot/util';
import { createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { Step, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { accountService, multisigOperationService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import {
  delegateRegistryAggregate,
  networkSelectorModel,
  tracksAggregate,
  votingAggregate,
} from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type DelegateConfirm,
  delegateConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/Delegate';

import { $delegateData, $target, $tracks, flowFinished, formModel } from './form-model';
import { selectTracksModel } from './select-tracks-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<DelegateAccount>();
const txSaved = createEvent();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

// Steps

sample({
  clock: flowStarted,
  target: $target,
});

sample({
  clock: flowStarted,
  filter: (target) => !!target,
  target: selectTracksModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.SELECT_TRACK,
  target: stepChanged,
});

sample({
  clock: selectTracksModel.output.formSubmitted,
  source: formModel.$walletData,
  filter: (walletData) => nonNullable(walletData.chain) && nonNullable(walletData.wallet),
  fn: (walletData, { tracks, accounts }) => ({
    event: { wallet: walletData.wallet!, chain: walletData.chain!, shards: accounts },
    tracks,
    step: Step.INIT,
  }),
  target: spread({
    event: formModel.events.formInitiated,
    tracks: $tracks,
    step: stepChanged,
  }),
});

const formSubmitted = sample({
  clock: formModel.output.formSubmitted,
  source: {
    balances: balanceModel.$balanceMap,
    fee: formModel.$fee,
    walletData: formModel.$walletData,
    tracks: $tracks,
    initiator: formModel.form.fields.initiator.$value,
    target: $target,
    delegateData: $delegateData,
    coreTx: formModel.$coreTx,
    tx: formModel.$tx,
    route: formModel.$route,
    step: $step,
    multisigDeposit: formModel.$multisigDeposit,
  },
}).filterMap(
  ({
    balances,
    fee,
    walletData,
    tracks,
    initiator,
    target,
    delegateData,
    coreTx,
    step,
    multisigDeposit,
    tx,
    route,
  }) => {
    if (
      nonNullable(delegateData) &&
      nonNullable(walletData.wallet) &&
      nonNullable(walletData.chain) &&
      nonNullable(initiator) &&
      nonNullable(delegateData.signatory) &&
      nonNullable(coreTx) &&
      nonNullable(tx) &&
      nonNullable(fee) &&
      isStep(step, Step.INIT)
    ) {
      const asset = getRelaychainAsset(walletData.chain.assets)!;

      const transferable = transferableAmount(
        balanceUtils.getBalance(balances, initiator.accountId, walletData.chain.chainId, asset.assetId),
      );

      return [
        {
          chain: walletData.chain,
          asset,
          tracks,
          target: target!.accountId,
          transferable,
          balance: delegateData.balance,
          conviction: delegateData.conviction,
          signatory: delegateData.signatory,
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit: multisigDeposit.toString(),
          locks: delegateData.locks[initiator.accountId] ?? BN_ZERO,
          coreTx,
          initiator,
          route,
          tx,
        } satisfies DelegateConfirm,
      ];
    }
  },
);

sample({
  clock: formSubmitted,
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
  clock: [confirmModel.startSigning, txsConfirmed],
  source: {
    delegateData: $delegateData,
    walletData: formModel.$walletData,
    transaction: formModel.$tx,
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
    coreTx: formModel.$coreTx,
  },
}).filterMap(({ delegateData, walletData, transaction, initiator, step }) => {
  if (
    nonNullable(delegateData) &&
    nonNullable(walletData) &&
    nonNullable(walletData.chain) &&
    nonNullable(transaction) &&
    nonNullable(initiator) &&
    nonNullable(delegateData.signatory) &&
    isStep(step, Step.CONFIRM)
  ) {
    return {
      signingPayloads: [
        {
          chain: walletData.chain,
          account: initiator,
          signatory: delegateData.signatory,
          transaction,
        },
      ],
    };
  }
});

sample({
  clock: startSigning,
  fn: (event) => {
    return {
      event,
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const signSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    walletData: formModel.$walletData,
    transaction: formModel.$tx,
    delegateData: $delegateData,
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
    coreTx: formModel.$coreTx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ delegateData, walletData, transaction, step, initiator, coreTx, signParams }) => {
  if (
    nonNullable(delegateData) &&
    nonNullable(walletData) &&
    nonNullable(walletData.chain) &&
    nonNullable(transaction) &&
    nonNullable(initiator) &&
    nonNullable(delegateData.signatory) &&
    nonNullable(coreTx) &&
    nonNullable(transaction) &&
    isStep(step, Step.SIGN)
  ) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: initiator,
      signatory: delegateData.signatory,
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
  clock: submitModel.output.formSubmitted,
  source: { delegate: $target, data: $delegateData, walletData: formModel.$walletData, tracks: $tracks },
  filter: ({ delegate, data, walletData }) => {
    return !!delegate && !!data && !!walletData.chain;
  },
  fn: ({ delegate, tracks, data, walletData }) => ({
    delegate: delegate!,
    votes: delegationService.calculateTotalVotes(new BN(data!.balance), tracks, walletData.chain!),
  }),
  target: delegateRegistryAggregate.events.addDelegation,
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

sample({
  clock: submitModel.output.formSubmitted,
  source: { network: networkSelectorModel.$network, delegateData: $delegateData },
  filter: ({ network, delegateData }) => nonNullable(network) && nonNullable(delegateData),
  fn: ({ network }) => ({ api: network!.api, chain: network!.chain }),
  target: tracksAggregate.events.requestTracks,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { hasMultisig: formModel.$hasAnyMultisig, coreTx: formModel.$coreTx, wrappedTx: formModel.$tx },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: ({ hasMultisig }: { hasMultisig: boolean }, results: any) => hasMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      accountId: coreTx!.accountId,
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    walletData: formModel.$walletData,
    coreTx: formModel.$coreTx,
    route: formModel.$route,
  },
  filter: ({ walletData, coreTx, route }) => {
    return nonNullable(walletData.wallet) && nonNullable(coreTx) && nonNullable(route);
  },
  fn: ({ walletData, coreTx, route }) => {
    const accounts = walletData.chain
      ? accountService.filterAccountsOnChain(walletData.accounts, walletData.chain)
      : [];
    const account = accounts.at(0);
    if (!account) throw new Error('Account not found');

    return [
      {
        initiatorAccountId: account.accountId,
        coreTx: coreTx!,
        route,
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

sample({
  clock: formModel.output.formChanged,
  fn: (formParams) => ({
    signatory: formParams.signatory,
    balance: formParams.amount,
    conviction: formParams.conviction,
    locks: formParams.locks,
  }),
  target: $delegateData,
});

export const delegateModel = {
  $step,
  $initiatorWallet: formModel.$walletData.map((data) => data?.wallet || null),
  $transactions: formModel.$tx,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
    txsConfirmed,
  },
  output: {
    flowFinished,
  },
};
