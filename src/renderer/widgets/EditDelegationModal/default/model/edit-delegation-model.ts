import { BN } from '@polkadot/util';
import { createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import {
  Step,
  getBalanceBn,
  getRelaychainAsset,
  isStep,
  nonNullable,
  toAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { type AnyAccount, accountService } from '@/domains/network';
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

sample({ clock: stepChanged, target: $step });

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

sample({
  clock: formModel.output.formSubmitted,
  source: {
    balances: balanceModel.$balances,
    fee: formModel.$fee,
    walletData: formModel.$walletData,
    tracks: formModel.$tracks,
    target: formModel.$target,
    account: formModel.$account,
    delegateData: $delegateData,
    activeDelegations: formModel.$activeDelegations,
    isUnchanged: $isUnchanged,
    multisigDeposit: formModel.$multisigDeposit,
    coreTx: formModel.$coreTx,
    step: $step,
    tx: formModel.$tx,
    multisigTx: formModel.$multisigTx,
  },
  filter: ({ walletData, delegateData, step, account, tx }) =>
    nonNullable(delegateData) &&
    nonNullable(walletData.wallet) &&
    nonNullable(walletData.chain) &&
    nonNullable(account) &&
    nonNullable(tx) &&
    isStep(step, Step.INIT),
  fn: ({
    fee,
    balances,
    walletData,
    tracks,
    target,
    account,
    delegateData,
    coreTx,
    activeDelegations,
    isUnchanged,
    multisigDeposit,
    tx,
    multisigTx,
  }) => {
    const asset = getRelaychainAsset(walletData.chain!.assets)!;
    const initiator = account!.account;

    const address = toAddress(initiator.accountId, { prefix: walletData.chain!.addressPrefix });

    const transferable = transferableAmount(
      balanceUtils.getBalance(balances, initiator.accountId, walletData.chain!.chainId, asset.assetId.toString()),
    );

    return {
      event: [
        {
          chain: walletData.chain!,
          asset: asset!,
          tracks,
          target: target?.address || '',
          transferable,
          ...delegateData!,
          signatory: delegateData!.signatory!,
          ...(isUnchanged && {
            balance: getBalanceBn(activeDelegations[address].balance.toString(), asset.precision).toString(),
            conviction: activeDelegations[address].conviction,
          }),
          previousConviction: activeDelegations[address].conviction,
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit: multisigDeposit.toString(),
          locks: delegateData!.locks[initiator.accountId],
          coreTx: coreTx!,
          route: [initiator],
          multisigTx,
          tx: tx!,
          initiator,
        } satisfies EditDelegationConfirm,
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
    account: formModel.$account,
    step: $step,
  },
  filter: ({ delegateData, walletData, transaction, step, account }) => {
    return (
      nonNullable(delegateData) &&
      nonNullable(walletData) &&
      nonNullable(transaction) &&
      nonNullable(account) &&
      isStep(step, Step.CONFIRM)
    );
  },
  fn: ({ delegateData, walletData, transaction, account }) => {
    return {
      event: {
        signingPayloads: [
          {
            chain: walletData.chain!,
            account: account!.account,
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
    accounts: $accounts,
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
      account: delegateFlowData.accounts[0],
      signatory: delegateFlowData.delegateData!.signatory,
      coreTxs: [delegateFlowData.coreTx!],
      wrappedTxs: [delegateFlowData.transaction!],
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
  source: {
    delegate: formModel.$target,
    data: $delegateData,
    walletData: formModel.$walletData,
    tracks: formModel.$tracks,
  },
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
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
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
