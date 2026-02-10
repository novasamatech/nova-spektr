import { BN_ZERO } from '@polkadot/util';
import { createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { Step, getBalanceBn, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { networkSelectorModel, tracksAggregate, votingAggregate } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type EditDelegationConfirm,
  editDelegationConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm';
import { type DelegateData } from '../lib/types';

import { formModel } from './form-model';
import { selectTracksModel } from './select-tracks-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: DelegateAccount; accounts: AnyAccount[] }>();
const flowFinished = createEvent();
const txSaved = createEvent();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'initiator'> | null>(null).reset(
  flowFinished,
);

const $accounts = createStore<AnyAccount[]>([]).reset(flowFinished);

const $isUnchanged = createStore(false);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

sample({
  clock: formModel.output.formChanged,
  fn: (formParams) => {
    return {
      signatory: formParams.signatory,
      balance: formParams.amount,
      conviction: formParams.conviction,
      locks: formParams.locks,
    };
  },
  target: $delegateData,
});

sample({
  clock: formModel.output.formChanged,
  fn: ({ isUnchanged }) => isUnchanged,
  target: $isUnchanged,
});

sample({
  clock: flowStarted,
  target: spread({
    delegate: formModel.$target,
    accounts: $accounts,
  }),
});

sample({
  clock: flowStarted,
  target: selectTracksModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.SELECT_TRACK,
  target: stepChanged,
});

sample({
  clock: selectTracksModel.output.formSubmitted,
  source: {
    walletData: formModel.$walletData,
    activeDelegations: formModel.$activeDelegations,
  },
  filter: ({ walletData }) => nonNullable(walletData.chain) && nonNullable(walletData.wallet),
  fn: ({ walletData, activeDelegations }, { tracks, accounts }) => ({
    event: { wallet: walletData.wallet!, chain: walletData.chain!, shards: accounts, activeDelegations },
    tracks,
    accounts,
    step: Step.INIT,
  }),
  target: spread({
    event: formModel.events.formInitiated,
    tracks: formModel.$tracks,
    accounts: $accounts,
    step: stepChanged,
  }),
});

const formSubmitted = sample({
  clock: formModel.output.formSubmitted,
  source: {
    balances: balanceModel.$balanceMap,
    fee: formModel.$fee,
    walletData: formModel.$walletData,
    tracks: formModel.$tracks,
    target: formModel.$target,
    initiator: formModel.form.fields.initiator.$value,
    delegateData: $delegateData,
    activeDelegations: formModel.$activeDelegations,
    isUnchanged: $isUnchanged,
    multisigDeposit: formModel.$multisigDeposit,
    coreTx: formModel.$coreTx,
    step: $step,
    tx: formModel.$tx,
  },
}).filterMap(
  ({
    balances,
    fee,
    walletData,
    tracks,
    target,
    initiator,
    delegateData,
    activeDelegations,
    isUnchanged,
    multisigDeposit,
    coreTx,
    step,
    tx,
  }) => {
    if (
      nonNullable(delegateData) &&
      nonNullable(walletData.wallet) &&
      nonNullable(walletData.chain) &&
      nonNullable(initiator) &&
      nonNullable(target) &&
      nonNullable(tx) &&
      nonNullable(coreTx) &&
      nonNullable(fee) &&
      nonNullable(delegateData.signatory) &&
      isStep(step, Step.INIT)
    ) {
      const asset = getRelaychainAsset(walletData.chain.assets)!;

      const transferable = transferableAmount(
        balanceUtils.getBalance(balances, initiator.accountId, walletData.chain.chainId, asset.assetId),
      );

      const activeDelegation = activeDelegations[initiator.accountId];

      return [
        {
          chain: walletData.chain,
          asset: asset!,
          tracks,
          target: target.accountId,
          transferable,
          ...delegateData,
          signatory: delegateData.signatory,
          ...(isUnchanged && {
            balance: getBalanceBn(activeDelegation?.balance.toString() ?? '0', asset.precision).toString(),
            conviction: activeDelegation?.conviction ?? 'None',
          }),
          previousConviction: activeDelegation?.conviction ?? 'None',
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit: multisigDeposit.toString(),
          locks: delegateData.locks[initiator.accountId] ?? BN_ZERO,
          coreTx,
          route: [initiator],
          tx,
          initiator,
        } satisfies EditDelegationConfirm,
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
  },
}).filterMap(({ delegateData, walletData, transaction, step, initiator }) => {
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
    accounts: $accounts,
    step: $step,
    coreTx: formModel.$coreTx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ delegateData, walletData, transaction, step, accounts, coreTx, signParams }) => {
  if (
    nonNullable(delegateData) &&
    nonNullable(walletData) &&
    nonNullable(walletData.chain) &&
    nonNullable(transaction) &&
    nonNullable(coreTx) &&
    nonNullable(delegateData.signatory) &&
    nonNullable(accounts[0]) &&
    isStep(step, Step.SIGN)
  ) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: accounts[0],
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
  source: { network: networkSelectorModel.$network, delegateData: $delegateData },
  filter: ({ network, delegateData }) => nonNullable(network) && nonNullable(delegateData),
  fn: ({ network }) => ({ api: network!.api, chain: network!.chain }),
  target: tracksAggregate.events.requestTracks,
});

// TODO: On edit delegations we receive wrong data on this subscription. Need to resubscribe.
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
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: formModel.$hasAnyMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: () => Paths.OPERATIONS,
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

export const editDelegationModel = {
  $step,
  $walletData: formModel.$walletData,
  $initiatorWallet: formModel.$walletData.map((data) => data?.wallet || null),

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
