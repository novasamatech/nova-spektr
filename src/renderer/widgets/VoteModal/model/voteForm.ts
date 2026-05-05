import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { and, empty, not, reset } from 'patronum';

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
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
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
      validator: () => (value) => {
        if (nullable(value)) {
          return { message: 'governance.vote.errors.noAccountError' };
        }
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => (value) => {
        if (nullable(value)) {
          return { message: 'governance.vote.errors.noSignatoryError' };
        }
      },
    },
    amount: {
      defaultValue: null,
      validator: () => {
        return {
          source: $availableBalance,
          fn: (value, _, balance: BN) => {
            if (nullable(value) || value.lte(BN_ZERO)) {
              return { message: 'transfer.notZeroAmountError' };
            }

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

// signing path

const signingPathChanged = createEvent<PathNode[]>();
const $signingPath = createStore<PathNode[]>([])
  .on(signingPathChanged, (_, path) => path)
  .reset(form.reset);

const $userOverrodePath = createStore(false)
  .on(signingPathChanged, () => true)
  .reset(form.reset, form.fields.initiator.change);

const $chainIdForPath = networkSelectorModel.$governanceChain.map((c) => c?.chainId ?? null);
const $defaultSigningPath = graphModel.$defaultPathFor(form.fields.initiator.$value, $chainIdForPath);

sample({
  clock: $defaultSigningPath,
  source: $userOverrodePath,
  filter: (userOverrode) => !userOverrode,
  fn: (_, defaultPath) => defaultPath,
  target: $signingPath,
});

const $signatoryFromPath = combine(
  { path: $signingPath, allAccounts: accounts.$list, chain: networkSelectorModel.$governanceChain },
  ({ path, allAccounts, chain }): AnyAccount | null => {
    if (nullable(chain)) return null;
    const last = path.at(-1);
    if (!last || last.kind !== 'signer') return null;
    return (
      allAccounts.find((a) => a.accountId === last.accountId && accountService.isAccountAvailableOnChain(a, chain)) ??
      null
    );
  },
);

sample({
  clock: [$signatoryFromPath, $signatories, form.reset],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

// Dropdown → path sync.
sample({
  clock: form.fields.signatory.$value,
  source: {
    initiator: form.fields.initiator.$value,
    chain: networkSelectorModel.$governanceChain,
    currentPath: $signingPath,
    multisigByAccountId: graphModel.$multisigByAccountId,
    proxies: proxyModel.$proxies,
    ownSignerAccountIds: graphModel.$ownSignerAccountIds,
    resolveName: graphModel.$nameResolver,
  },
  filter: ({ initiator, chain, currentPath }, signatory) => {
    if (!initiator || !chain || !signatory) return false;
    const last = currentPath.at(-1);
    if (last && last.kind === 'signer' && last.accountId === signatory.accountId) return false;
    return accountUtils.isAnyMultisigAccount(initiator) || accountUtils.isProxiedAccount(initiator);
  },
  fn: ({ initiator, chain, multisigByAccountId, proxies, ownSignerAccountIds, resolveName }, signatory): PathNode[] => {
    return graphModel.pickDefaultPath({
      initiator: initiator!,
      chainId: chain!.chainId,
      multisigByAccountId,
      proxies,
      ownSignerAccountIds,
      resolveName,
      targetSigner: signatory!.accountId,
    });
  },
  target: signingPathChanged,
});

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

const $availableBalance = combine(
  {
    initiator: form.fields.initiator.$value,
    referendum: $referendum,
    chain: networkSelectorModel.$governanceChain,
    balances: balanceModel.$balanceMap,
    accounts: accounts.$list,
    fee: feeTxStore.$fee,
  },
  ({ referendum, balances, chain, initiator, fee }) => {
    if (!initiator || !referendum || !chain || !fee) return BN_ZERO;

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

const $canSubmit = and($valid, form.$isValid, not($pendingFee), not(empty($tx)));

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
  },
  filter: ({ network, tx, initiator }, { decision }) => {
    return nonNullable(network) && nonNullable(initiator) && nonNullable(decision) && nonNullable(tx);
  },
  fn: ({ existingVote, network, tx, coreTx, route, initiator }, { signatory }): VoteConfirm => {
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

  $canSubmit,

  setReferendum,
  formSubmitted,
  $errors,
};
