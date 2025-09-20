import { type ApiPromise } from '@polkadot/api';
import { isArray } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Chain } from '@/shared/core';
import {
  addUniqueItems,
  entries,
  formatAmount,
  removeItemsFromCollection,
  transferableAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createInitiatorsStore } from '@/shared/transactions';
import { type AnyAccount, transactionService } from '@/domains/network';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import {
  type VotesToRemove,
  adminTracks,
  fellowshipTracks,
  governanceTracks,
  treasuryTracks,
  votingService,
} from '@/entities/governance';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegationAggregate, networkSelectorModel, tracksAggregate, votingAggregate } from '@/features/governance';

import { formModel } from './form-model';

const formInitiated = createEvent<DelegateAccount>();
const formSubmitted = createEvent<{ tracks: number[]; accounts: AnyAccount[] }>();
const trackToggled = createEvent<number>();
const tracksSelected = createEvent<number[]>();
const accountsChanged = createEvent<AnyAccount[]>();

const $delegate = restore(formInitiated, null);

const $tracks = createStore<number[]>([]).reset(formInitiated);
const $delegatedTracks = createStore<string[]>([]).reset(formInitiated);
const $votedTracks = createStore<string[]>([]).reset(formInitiated);
const $votesToRemove = createStore<VotesToRemove[]>([]).reset(formInitiated);

const $accounts = createStore<AnyAccount[]>([]);
const $isMaxWeightReached = createStore(false);

const $availableTracks = combine(tracksAggregate.$tracks, (tracks) => {
  return Object.keys(tracks);
});

const $initiators = createInitiatorsStore({
  chain: networkSelectorModel.$governanceChain,
  accounts: walletSelect.$selectedAccounts,
});

const $availableAccounts = combine(
  {
    wallet: walletSelect.$selectedWallet,
    delegations: delegationAggregate.$activeDelegations,
    network: delegationAggregate.$network,
    delegate: $delegate,
    accounts: $initiators,
  },
  ({ wallet, delegations, network, delegate, accounts }) => {
    if (!wallet || !network?.chain || !delegate) return [];

    return accountService
      .filterAccountsOnChain(accounts, network.chain)
      .filter((account) => !delegations[delegate.accountId]?.[account.accountId]);
  },
);

const $accountsBalances = combine(
  {
    availableAccounts: $availableAccounts,
    balances: balanceModel.$balanceMap,
    network: networkSelectorModel.$network,
  },
  ({ balances, network, availableAccounts }) => {
    if (availableAccounts.length <= 1 || !network) return {};

    return availableAccounts.reduce<Record<string, string>>((acc, account) => {
      const balance = balanceUtils.getBalance(
        balances,
        account.accountId,
        network!.chain.chainId,
        network!.asset.assetId,
      );

      acc[account.accountId] = transferableAmount(balance);

      return acc;
    }, {});
  },
);

type CheckWeightParams = {
  tracks: number[];
  chain: Chain;
  api: ApiPromise;
  isMultisig: boolean;
};

const checkMaxWeightReachedFx = createEffect(
  async ({ tracks, chain, api, isMultisig }: CheckWeightParams): Promise<boolean> => {
    if (!chain || !api) return true;

    if (isMultisig) {
      const mockTx = transactionBuilder.buildDelegate({
        tracks,
        chain,
        balance: formatAmount('1', chain.assets[0].precision),
        conviction: 'Locked1x',
        accountId: '0x0000000000000000000000000000000000000000' as AccountId,
        target: '0x0000000000000000000000000000000000000000' as AccountId,
      });

      const extrinsic = getExtrinsic[mockTx.type](mockTx.args, api);
      const txs = await transactionService.splitExtrinsic(extrinsic, api);

      return isArray(txs) && txs.length > 1;
    } else {
      return false;
    }
  },
);

sample({
  clock: [votingAggregate.$activeWalletVotes, $accounts],
  source: {
    accounts: $accounts,
    votes: votingAggregate.$activeWalletVotes,
  },
  fn: ({ accounts, votes }) => {
    const activeTracks = new Set<string>();
    const delegatedTracks = new Set<string>();
    const accountsIds = new Set<AccountId>(accounts.map((a) => a.accountId));

    const votesToRemove: VotesToRemove[] = [];

    for (const [accountId, voteList] of entries(votes)) {
      if (!accountsIds.has(accountId)) continue;

      for (const [track, vote] of entries(voteList)) {
        if (
          (votingService.isCasting(vote) && !votingService.isUnlockingDelegation(vote)) ||
          votingService.isDelegating(vote)
        ) {
          activeTracks.add(track);
        }

        if (votingService.isDelegating(vote)) {
          delegatedTracks.add(track);
        }

        if (votingService.isCasting(vote) && !votingService.isUnlockingDelegation(vote)) {
          for (const referendum of Object.keys(vote.votes)) {
            votesToRemove.push({ voter: accountId, track, referendum });
          }
        }
      }
    }

    return {
      votedTracks: [...activeTracks],
      delegatedTracks: [...delegatedTracks],
      votesToRemove: [...votesToRemove],
    };
  },
  target: spread({
    votedTracks: $votedTracks,
    delegatedTracks: $delegatedTracks,
    votesToRemove: $votesToRemove,
  }),
});

sample({
  clock: trackToggled,
  source: $tracks,
  fn: (tracks, track) => {
    if (tracks.includes(track)) {
      return tracks.filter((t) => t !== track);
    }

    return [...tracks, track];
  },
  target: $tracks,
});

sample({
  clock: formInitiated,
  source: $availableAccounts,
  filter: (accounts) => accounts.length > 0,
  fn: (accounts) => [accounts.at(0)!],
  target: $accounts,
});

sample({
  clock: accountsChanged,
  target: $accounts,
});

sample({
  clock: tracksSelected,
  source: { tracks: $tracks, votedTracks: $votedTracks },
  fn: ({ tracks, votedTracks }, newTracks) => {
    const resultArray = newTracks.filter((num) => !votedTracks.includes(num.toString()));

    if (resultArray.every((t) => tracks.includes(t))) {
      return removeItemsFromCollection(tracks, resultArray);
    }

    return addUniqueItems(tracks, resultArray);
  },
  target: $tracks,
});

const $tracksGroup = combine($availableTracks, (availableTracks) => {
  const availableTrackIds = new Set(availableTracks);

  return {
    adminTracks: adminTracks.filter((track) => availableTrackIds.has(track.id)),
    governanceTracks: governanceTracks.filter((track) => availableTrackIds.has(track.id)),
    treasuryTracks: treasuryTracks.filter((track) => availableTrackIds.has(track.id)),
    fellowshipTracks: fellowshipTracks.filter((track) => availableTrackIds.has(track.id)),
  };
});

sample({
  clock: $tracks,
  source: {
    tracks: $tracks,
    network: delegationAggregate.$network,
    isMultisig: formModel.$hasAnyMultisig,
  },
  filter: ({ network, isMultisig }) => !!network && !!isMultisig,
  fn: ({ tracks, network, isMultisig }, _): CheckWeightParams => ({
    tracks,
    chain: network!.chain,
    api: network!.api,
    isMultisig,
  }),
  target: checkMaxWeightReachedFx,
});

sample({
  clock: checkMaxWeightReachedFx.doneData,
  target: $isMaxWeightReached,
});

export const selectTracksModel = {
  $tracks,
  $availableTracks,
  $votedTracks,
  $votesToRemove,
  $delegatedTracks,
  $tracksGroup,
  $allTracks: $tracksGroup.map(({ adminTracks, governanceTracks, treasuryTracks, fellowshipTracks }) => {
    return [...adminTracks, ...governanceTracks, ...treasuryTracks, ...fellowshipTracks];
  }),

  $accounts,
  $availableAccounts,
  $accountsBalances,
  $chain: delegationAggregate.$network.map((network) => network?.chain || null),
  $isMaxWeightReached,
  $isMaxWeightLoading: checkMaxWeightReachedFx.pending,

  events: {
    formInitiated,
    trackToggled,
    tracksSelected,
    accountsChanged,
  },

  output: {
    formSubmitted,
  },
};
