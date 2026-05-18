import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { reset } from 'patronum';

import { type AccountVote, type Conviction, type OngoingReferendum, type Transaction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { entries, getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService, voteTransactionService } from '@/entities/governance';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { createDraftModeBinding, wireDraftSourceBalance } from '@/features/drafts';
import {
  type AggregatedReferendum,
  delegationAggregate,
  getLocksForAccount,
  networkSelectorModel,
} from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { voteValidateModel } from '@/features/governance/model/vote/voteValidateModel';
import { type VoteConfirm, voteConfirmModel } from '@/features/operations/OperationsConfirm';
import { voteValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';

type FormFields = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: BN | null;
  conviction: Conviction;
  decision: 'aye' | 'nay' | 'abstain' | null;
};

type FormInput = {
  form: FormFields;
  transaction: Transaction;
};

const setReferendum = createEvent<AggregatedReferendum<OngoingReferendum> | null>();

const draftMode = createDraftModeBinding({ formInitiated: setReferendum, chainChanged: setReferendum });

const $type = createStore<'vote' | 'revote' | null>(null);
const $voters = createStore<AccountId[]>([]);
const $existingVote = createStore<AccountVote | null>(null);
const $referendum = restore(setReferendum, null);
const $lockForAccount = createStore(BN_ZERO);

const formSubmitted = createEvent<FormInput>();

// form

const form: Form<FormFields> = createForm<FormFields>({
  validateOn: ['submit'],
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => ({
        source: draftMode.$isDraftMode,
        fn: (value, _, isDraftMode) => {
          if (isDraftMode) return;
          if (nullable(value)) {
            return { message: 'governance.vote.errors.noAccountError' };
          }
        },
      }),
    },
    signatory: {
      defaultValue: null,
      validator: () => ({
        source: draftMode.$isDraftMode,
        fn: (value, _, isDraftMode) => {
          if (isDraftMode) return;
          if (nullable(value)) {
            return { message: 'governance.vote.errors.noSignatoryError' };
          }
        },
      }),
    },
    amount: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({ balance: $availableBalance, isDraftMode: draftMode.$isDraftMode }),
          fn: (value, _, { balance, isDraftMode }) => {
            if (nullable(value) || value.lte(BN_ZERO)) {
              return { message: 'transfer.notZeroAmountError' };
            }

            if (isDraftMode) return;

            if (nonNullable(value) && value.gt(balance)) {
              return { message: 'governance.errors.notEnoughBalanceError' };
            }
          },
        };
      },
    },
    conviction: { defaultValue: 'Locked1x' },
    decision: { defaultValue: null },
  },
});

// initiators

const $initiatorsList = createInitiatorsStore({
  chain: networkSelectorModel.$governanceChain,
  accounts: walletSelect.$selectedAccounts,
});

const $initiators = combine($initiatorsList, networkSelectorModel.$governanceChain, (accounts, chain) => {
  return chain ? (accountService.filterAccountsOnChain(accounts, chain) ?? []) : [];
});

const $initiatorWallet = combine(walletModel.$wallets, form.fields.initiator.$value, (wallets, initiator) => {
  if (nullable(initiator)) return null;

  return wallets.find((w) => initiator.walletId === w.id) ?? null;
});

// signatories

const $signatories = createSignatoriesStore({
  chain: networkSelectorModel.$governanceChain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } = createSigningPathModel(
  {
    initiator: form.fields.initiator.$value,
    chain: networkSelectorModel.$governanceChain,
    resetOn: form.reset,
    resetUserOverrideOn: form.fields.initiator.change,
  },
);

sample({
  clock: [$signatoryFromPath, $signatories, form.reset],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

// delegated

const $hasDelegatedTrack = combine(
  {
    referendum: $referendum,
    initiator: form.fields.initiator.$value,
    network: networkSelectorModel.$network,
    tracks: delegationAggregate.$activeTracks,
  },
  ({ referendum, initiator, network, tracks }) => {
    if (nullable(initiator) || nullable(referendum) || nullable(network)) {
      return false;
    }

    for (const delegators of Object.values(tracks)) {
      for (const [delegatorAccountId, tracks] of entries(delegators)) {
        if (delegatorAccountId === initiator.accountId && tracks.includes(referendum.track)) {
          return true;
        }
      }
    }

    return false;
  },
);

// transaction

const $coreTx = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    referendum: $referendum,
    conviction: form.fields.conviction.$value,
    signatory: form.fields.signatory.$value,
    amount: form.fields.amount.$value,
    decision: form.fields.decision.$value,
  },
  ({ chain, referendum, signatory, amount, conviction, decision }) => {
    if (nullable(referendum) || nullable(chain) || nullable(signatory) || nullable(decision) || nullable(amount)) {
      return null;
    }

    return transactionBuilder.buildVote({
      chain: chain,
      accountId: signatory.accountId,
      trackId: referendum.track,
      referendumId: referendum.referendumId,
      vote: voteTransactionService.createTransactionVote(decision, amount, conviction),
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: networkSelectorModel.$governanceChainApi,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
  routeOverride: $pathRoute,
});

// used only to calc fee before decision made
const $feeTx = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    referendum: $referendum,
    conviction: form.fields.conviction.$value,
    signatory: form.fields.signatory.$value,
    amount: form.fields.amount.$value,
  },
  ({ chain, referendum, signatory, conviction, amount }) => {
    if (nullable(referendum) || nullable(chain) || nullable(signatory)) {
      return null;
    }

    return transactionBuilder.buildVote({
      chain: chain,
      accountId: signatory.accountId,
      trackId: referendum.track,
      referendumId: referendum.referendumId,
      // abstain is used because it's more expensive
      vote: voteTransactionService.createTransactionVote('abstain', amount || BN_ZERO, conviction),
    });
  },
);

const feeTxStore = createComplexTxStore({
  api: networkSelectorModel.$governanceChainApi,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $feeTx,
  routeOverride: $pathRoute,
});

// Transaction validation
const $asset = networkSelectorModel.$governanceChain.map((chain) => (chain ? getNativeAsset(chain.assets) : null));
const { $errors, $valid } = createTxValidationStore({
  validator: voteValidator,
  params: {
    api: networkSelectorModel.$governanceChainApi,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});
// balances

sample({
  clock: [form.fields.initiator.$value, form.reset],
  source: {
    trackLocks: locksAggregate.$trackLocks,
    chain: networkSelectorModel.$governanceChain,
  },
  fn: ({ trackLocks }, account) => {
    return account ? getLocksForAccount(account.accountId, trackLocks) : BN_ZERO;
  },
  target: $lockForAccount,
});

// Source balance for draft mode: fetched on-demand once the path is set so
// the "Available:" row reflects the eventual signer's balance, not the
// connected wallet's initiator.
const $draftSourceBalance = wireDraftSourceBalance({
  $draftPath: draftMode.$draftSigningPath,
  $chain: networkSelectorModel.$governanceChain,
  $isDraftMode: draftMode.$isDraftMode,
});

const $availableBalance = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    initiator: form.fields.initiator.$value,
    referendum: $referendum,
    chain: networkSelectorModel.$governanceChain,
    balances: balanceModel.$balanceMap,
    accounts: accounts.$list,
    fee: feeTxStore.$fee,
    draftSourceBalance: $draftSourceBalance,
  },
  ({ isDraftMode, referendum, balances, chain, initiator, fee, draftSourceBalance }) => {
    if (!referendum || !chain) return BN_ZERO;

    // Draft mode: read the path source's balance directly (no fee to subtract
    // — the eventual signer pays it at submit time).
    if (isDraftMode) {
      if (!draftSourceBalance) return BN_ZERO;

      return locksService.getAvailableBalance(draftSourceBalance);
    }

    if (!initiator || !fee) return BN_ZERO;

    const nativeAsset = getNativeAsset(chain.assets);
    const accountBalance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, nativeAsset.assetId);
    if (!accountBalance) return BN_ZERO;

    return locksService.getAvailableBalance(accountBalance).sub(fee);
  },
);

// Reset

reset({
  clock: form.reset,
  target: [$referendum, $existingVote],
});

// Submit

const $draftCoreTx = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    referendum: $referendum,
    conviction: form.fields.conviction.$value,
    amount: form.fields.amount.$value,
    decision: form.fields.decision.$value,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ chain, referendum, conviction, amount, decision, path, isPathComplete }) => {
    if (nullable(referendum) || nullable(chain) || nullable(decision) || nullable(amount) || !isPathComplete) {
      return null;
    }
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    return transactionBuilder.buildVote({
      chain,
      accountId: sourceAccountId,
      trackId: referendum.track,
      referendumId: referendum.referendumId,
      vote: voteTransactionService.createTransactionVote(decision, amount, conviction),
    });
  },
);

const $draftCallDataHex = combine($draftCoreTx, networkSelectorModel.$governanceChainApi, (tx, api) =>
  transactionService.getCallDataHex(tx, api),
);

const $draftNetworkStore = networkSelectorModel.$governanceChain.map((chain) =>
  chain ? { chain, asset: getNativeAsset(chain.assets) } : null,
);

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    valid: $valid,
    formValid: form.$isValid,
    pendingFee: $pendingFee,
    txEmpty: $tx.map(nullable),
  },
  ({ isDraftMode, valid, formValid, pendingFee, txEmpty }) => {
    if (isDraftMode) return false;
    return valid && formValid && !pendingFee && !txEmpty;
  },
);

// Decision (aye/nay/abstain) is supplied by clicking one of the decision
// buttons, not pre-selected from a form field — so the button-disabled gate
// must NOT require a decision. We expose a "ready to pick a decision" signal
// for the UI, and a stricter `$canSaveAsDraft` filter for `connectSave` that
// only fires once the decision has been set (in the same React handler that
// triggers `saveAsDraftRequested`).
const $isReadyForDecision = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    networkStore: $draftNetworkStore,
    amount: form.fields.amount.$value,
  },
  ({ isDraftMode, isPathComplete, networkStore, amount }) => {
    if (!isDraftMode || !isPathComplete || !networkStore) return false;
    if (!amount || amount.lte(BN_ZERO)) return false;

    return true;
  },
);

const $canSaveAsDraft = combine(
  {
    ready: $isReadyForDecision,
    callData: $draftCallDataHex,
    decision: form.fields.decision.$value,
  },
  ({ ready, callData, decision }) => {
    if (!ready || !callData || !decision) return false;

    return true;
  },
);

draftMode.connectSave({
  source: 'governance-vote-draft-mode',
  $callDataHex: $draftCallDataHex,
  $networkStore: $draftNetworkStore,
  $canSave: $canSaveAsDraft,
});

sample({
  clock: form.submit.doneData,
  source: {
    transaction: $tx,
  },
  filter: ({ transaction }) => nonNullable(transaction),
  fn: ({ transaction }, form) => {
    return {
      form,
      transaction: transaction!,
    } satisfies FormInput;
  },
  target: formSubmitted,
});

sample({
  clock: form.submit.doneData,
  source: {
    existingVote: $existingVote,
    initiator: form.fields.initiator.$value,
    network: networkSelectorModel.$network,
    route: $route,
    tx: $tx,
    coreTx: $coreTx,
    signingPath: $signingPath,
  },
  filter: ({ network, tx, initiator }, { decision }) => {
    return nonNullable(network) && nonNullable(initiator) && nonNullable(decision) && nonNullable(tx);
  },
  fn: ({ existingVote, network, tx, coreTx, route, initiator, signingPath }, { signatory }): VoteConfirm => {
    return {
      api: network!.api,
      chain: network!.chain,
      asset: network!.asset,
      route,
      initiator: initiator!,
      signatory: signatory!,
      existingVote,
      tx: tx!,
      coreTx: coreTx!,
      signingPath,
    };
  },
  target: voteConfirmModel.replaceWithConfirm,
});

sample({
  clock: form.$values,
  source: $tx,
  filter: nonNullable,
  fn: (transaction) => ({
    id: 0,
    transaction: transaction!,
    feeMap: {},
  }),
  target: voteValidateModel.validate,
});

export const voteForm = {
  form,

  $tx,
  $coreTx,
  $route,

  $initiatorWallet,
  $initiators,
  $signatories,
  $type,
  $referendum,
  $voters,
  $existingVote,
  $lockForAccount,
  $availableBalance,
  $hasDelegatedTrack,

  $fee,
  $pendingFee,

  $signingPath,
  signingPathChanged,

  $canSubmit,

  setReferendum,
  formSubmitted,
  $errors,

  $isDraftMode: draftMode.$isDraftMode,
  $canSaveAsDraft,
  $isReadyForDecision,
  $initiatedDraft: draftMode.$initiatedDraft,
  $draftSigningPath: draftMode.$draftSigningPath,

  events: {
    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  },
};
