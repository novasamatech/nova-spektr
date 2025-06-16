import { BN } from '@polkadot/util';
import { createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import { Step, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { accountService } from '@/domains/network';
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
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
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

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

// Steps

sample({ clock: stepChanged, target: $step });

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

sample({
  clock: formModel.output.formSubmitted,
  source: {
    balances: balanceModel.$balances,
    fee: formModel.$fee,
    walletData: formModel.$walletData,
    tracks: $tracks,
    initiator: formModel.form.fields.initiator.$value,
    target: $target,
    delegateData: $delegateData,
    coreTx: formModel.$coreTx,
    step: $step,
    multisigDeposit: formModel.$multisigDeposit,
    multisigTx: formModel.$multisigTx,
    proxyAccount: formModel.$proxyAccount,
  },
  filter: ({ walletData, delegateData, initiator, step }) => {
    return (
      nonNullable(delegateData) &&
      nonNullable(walletData.wallet) &&
      nonNullable(walletData.chain) &&
      nonNullable(initiator) &&
      isStep(step, Step.INIT)
    );
  },
  fn: ({ fee, balances, walletData, tracks, target, initiator, delegateData, coreTx, multisigDeposit, multisigTx }) => {
    const asset = getRelaychainAsset(walletData.chain!.assets)!;

    return {
      event: [
        {
          chain: walletData.chain!,
          asset: asset!,
          tracks,
          target: target?.address || '',
          transferable: transferableAmount(
            balanceUtils.getBalance(
              balances,
              initiator!.accountId,
              walletData.chain!.chainId,
              asset.assetId.toString(),
            ),
          ),
          balance: delegateData!.balance,
          conviction: delegateData!.conviction,
          signatory: delegateData!.signatory!,
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit: multisigDeposit.toString(),
          locks: delegateData!.locks[initiator!.accountId],
          coreTx: coreTx!,
          initiator: initiator!,
          route: [initiator!],
          tx: coreTx!,
          multisigTx: multisigTx,
        } satisfies DelegateConfirm,
      ],
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: [confirmModel.startSigning, txsConfirmed],
  source: {
    delegateData: $delegateData,
    walletData: formModel.$walletData,
    transaction: formModel.$tx,
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
    coreTx: formModel.$coreTx,
  },
  filter: ({ delegateData, walletData, step }) => {
    return nonNullable(delegateData) && nonNullable(walletData) && isStep(step, Step.CONFIRM);
  },
  fn: ({ delegateData, walletData, initiator, transaction }) => {
    return {
      event: {
        signingPayloads: [
          {
            chain: walletData.chain!,
            account: initiator!,
            signatory: delegateData!.signatory,
            transaction: transaction!,
          },
        ],
      },
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
  source: {
    walletData: formModel.$walletData,
    transaction: formModel.$tx,
    multisigTx: formModel.$multisigTx,
    delegateData: $delegateData,
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
    coreTx: formModel.$coreTx,
  },
  filter: ({ delegateData, walletData, transaction, step }) => {
    return nonNullable(delegateData) && nonNullable(walletData) && nonNullable(transaction) && isStep(step, Step.SIGN);
  },
  fn: (delegateFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: delegateFlowData.walletData.chain!,
      account: delegateFlowData.initiator!,
      signatory: delegateFlowData.delegateData!.signatory,
      coreTxs: delegateFlowData.coreTx ? [delegateFlowData.coreTx] : [],
      wrappedTxs: delegateFlowData.transaction ? [delegateFlowData.transaction] : [],
      multisigTxs: delegateFlowData.multisigTx ? [delegateFlowData.multisigTx] : [],
    },
    step: Step.SUBMIT,
  }),
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
  source: formModel.$isMultisig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: (isMultisig: boolean, results: any) => isMultisig && submitUtils.isSuccessResult(results[0].result),
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
