import { type ApiPromise } from '@polkadot/api';
import { isArray } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Chain, type Wallet } from '@/shared/core';
import {
  addUniqueItems,
  entries,
  formatAmount,
  removeItemsFromCollection,
  transferableAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, transactionService } from '@/domains/network';
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
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegationAggregate, networkSelectorModel, tracksAggregate, votingAggregate } from '@/features/governance';

const formInitiated = createEvent<{ delegate: DelegateAccount; accounts: AnyAccount[] }>();
const formSubmitted = createEvent<{ tracks: number[]; accounts: AnyAccount[] }>();
const trackToggled = createEvent<number>();
const tracksSelected = createEvent<number[]>();
const accountsChanged = createEvent<AnyAccount[]>();

const $tracks = createStore<number[]>([]).reset(formInitiated);
const $votedTracks = createStore<string[]>([]).reset(formInitiated);
const $delegatedTracks = createStore<string[]>([]).reset(formInitiated);
const $votesToRemove = createStore<VotesToRemove[]>([]).reset(formInitiated);

const $accounts = createStore<AnyAccount[]>([]).reset(formInitiated);
const $availableAccounts = createStore<AnyAccount[]>([]).reset(formInitiated);
const $delegate = createStore<DelegateAccount | null>(null).reset(formInitiated);
const $isMaxWeightReached = createStore(false).reset(formInitiated);

const $availableTracks = combine(tracksAggregate.$tracks, (tracks) => {
  return Object.keys(tracks);
});

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
  wallet: Wallet;
};

const checkMaxWeightReachedFx = createEffect(
  async ({ tracks, chain, api, wallet }: CheckWeightParams): Promise<boolean> => {
    if (!wallet || !chain || !api) return true;

    if (walletUtils.isMultisig(wallet)) {
      const mockTx = transactionBuilder.buildDelegate({
        tracks,
        chain,
        balance: formatAmount('1', chain.assets[0]!.precision),
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
  clock: formInitiated,
  target: spread({
    delegate: $delegate,
    accounts: $availableAccounts,
  }),
});

sample({
  clock: [votingAggregate.$activeWalletVotes, $accounts],
  source: {
    tracks: $tracks,
    votes: votingAggregate.$activeWalletVotes,
    accounts: $accounts,
    delegate: $delegate,
  },
  fn: ({ tracks, accounts, votes, delegate }) => {
    const activeTracks = new Set<string>();
    const otherDelegatedTracks = new Set<string>();
    const currentDelegatedTracks = new Set<number>();
    const accountsIds = new Set<AccountId>(accounts.map((a) => a.accountId));

    const votesToRemove: VotesToRemove[] = [];

    for (const [accountId, voteList] of entries(votes)) {
      if (!accountsIds.has(accountId)) continue;

      for (const [track, vote] of entries(voteList)) {
        const isDelegateExist = votingService.isDelegating(vote) && delegate;
        const isCurrentDelegate = isDelegateExist && delegate.accountId === vote.target;
        const isOtherDelegate = isDelegateExist && delegate.accountId !== vote.target;

        if ((votingService.isCasting(vote) && !votingService.isUnlockingDelegation(vote)) || isOtherDelegate) {
          activeTracks.add(track);
        }

        if (isOtherDelegate) {
          otherDelegatedTracks.add(track);
        }

        if (isCurrentDelegate) {
          currentDelegatedTracks.add(Number(track));
        }

        if (votingService.isCasting(vote) && !votingService.isUnlockingDelegation(vote)) {
          for (const referendum of Object.keys(vote.votes)) {
            votesToRemove.push({ voter: accountId, track, referendum });
          }
        }
      }
    }

    return {
      tracks: [...tracks, ...currentDelegatedTracks],
      votedTracks: [...activeTracks],
      delegatedTracks: [...otherDelegatedTracks],
      votesToRemove: [...votesToRemove],
    };
  },
  target: spread({
    tracks: $tracks,
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
  source: {
    tracks: $tracks,
    votedTracks: $votedTracks,
  },
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
    wallet: walletSelect.$selectedWallet,
  },
  filter: ({ network, wallet }) => !!network && !!wallet,
  fn: ({ tracks, network, wallet }, _): CheckWeightParams => ({
    tracks,
    chain: network!.chain,
    api: network!.api,
    wallet: wallet!,
  }),
  target: checkMaxWeightReachedFx,
});

sample({
  clock: checkMaxWeightReachedFx.doneData,
  target: $isMaxWeightReached,
});

export const selectTracksModel = {
  $tracks,
  $votedTracks,
  $delegatedTracks,
  $votesToRemove,
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
