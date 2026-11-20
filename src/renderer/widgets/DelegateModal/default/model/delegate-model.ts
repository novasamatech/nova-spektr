import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { Step, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { getSigningPayloads } from '@/shared/transactions';
import { accountService, multisigOperationService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { wireDraftCloseRedirect } from '@/features/drafts';
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
    signingPath: formModel.$signingPath,
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
    signingPath,
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
          signingPath,
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

// The open confirm step keeps up with the form's transaction (see `follow`).
confirmModel.follow({
  clock: formModel.$tx,
  $active: $step.map((step) => isStep(step, Step.CONFIRM)),
  $transaction: combine({
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
    route: formModel.$route,
    signingPath: formModel.$signingPath,
  }),
});

sample({
  clock: txsConfirmed,
  target: confirmModel.startSigning,
});

const startSigning = sample({
  clock: confirmModel.confirmed,
  source: {
    delegateData: $delegateData,
    walletData: formModel.$walletData,
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
  },
  fn: (source, confirms) => ({ ...source, confirms }),
}).filterMap(({ delegateData, walletData, initiator, step, confirms }) => {
  if (
    nonNullable(delegateData) &&
    nonNullable(walletData) &&
    nonNullable(walletData.chain) &&
    nonNullable(initiator) &&
    nonNullable(delegateData.signatory) &&
    isStep(step, Step.CONFIRM)
  ) {
    return {
      signingPayloads: getSigningPayloads(confirms),
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
    confirms: confirmModel.$confirmed,
    delegateData: $delegateData,
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ delegateData, walletData, confirms, step, initiator, signParams }) => {
  if (
    nonNullable(delegateData) &&
    nonNullable(walletData) &&
    nonNullable(walletData.chain) &&
    confirms.length > 0 &&
    nonNullable(initiator) &&
    nonNullable(delegateData.signatory) &&
    isStep(step, Step.SIGN)
  ) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: initiator,
      signatory: delegateData.signatory,
      coreTxs: confirms.map((confirm) => confirm.coreTx),
      wrappedTxs: confirms.map((confirm) => confirm.tx),
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
  source: { hasMultisig: formModel.$hasAnyMultisig, confirms: confirmModel.$confirmed },
  filter: ({ hasMultisig, confirms }, results) =>
    hasMultisig && confirms.length > 0 && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ confirms }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;
    const { coreTx, tx } = confirms[0]!;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx.chainId,
      callHash: tx.args.callHash,
      multisigAccountId: coreTx.accountId,
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

wireDraftCloseRedirect({
  $initiatedDraft: formModel.$initiatedDraft,
  flowFinished,
  redirectTarget: $redirectAfterSubmitPath,
  destination: Paths.OPERATIONS,
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
