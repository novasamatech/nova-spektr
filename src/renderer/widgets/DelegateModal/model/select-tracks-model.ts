import { type ApiPromise } from '@polkadot/api';
import { isArray } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Account, type Chain, TransactionType, type Wallet } from '@/shared/core';
import {
  addUniqueItems,
  formatAmount,
  removeItemsFromCollection,
  toAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingService } from '@/entities/governance';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { delegationAggregate, networkSelectorModel, tracksAggregate, votingAggregate } from '@/features/governance';
import { adminTracks, fellowshipTracks, governanceTracks, treasuryTracks } from '../lib/constants';

const formInitiated = createEvent<DelegateAccount>();
const formSubmitted = createEvent<{ tracks: number[]; accounts: Account[] }>();
const trackToggled = createEvent<number>();
const tracksSelected = createEvent<number[]>();
const accountsChanged = createEvent<Account[]>();

const $delegate = restore(formInitiated, null);

const $tracks = createStore<number[]>([]).reset(formInitiated);
const $accounts = createStore<Account[]>([]);
const $isMaxWeightReached = createStore(false);

const $availableTracks = combine(tracksAggregate.$tracks, (tracks) => {
  return Object.keys(tracks);
});

const $addresses = combine({ accounts: $accounts, chain: delegationAggregate.$chain }, ({ accounts, chain }) => {
  if (!chain) return [];

  return accounts.map((a) => toAddress(a.accountId, { prefix: chain.addressPrefix }));
});

const $votedTracks = combine(
  {
    votes: votingAggregate.$activeWalletVotes,
    addresses: $addresses,
  },
  ({ votes, addresses }) => {
    const activeTracks = new Set<string>();

    for (const [address, voteList] of Object.entries(votes)) {
      if (!addresses.includes(address)) continue;

      for (const [track, vote] of Object.entries(voteList)) {
        if (
          (votingService.isCasting(vote) && !votingService.isUnlockingDelegation(vote)) ||
          votingService.isDelegating(vote)
        ) {
          activeTracks.add(track);
        }
      }
    }

    return [...activeTracks];
  },
);

const $availableAccounts = combine(
  {
    wallet: walletModel.$activeWallet,
    delegations: delegationAggregate.$activeDelegations,
    chain: delegationAggregate.$chain,
    delegate: $delegate,
  },
  ({ wallet, delegations, chain, delegate }) => {
    if (!wallet || !chain || !delegate) return [];

    return wallet.accounts
      .filter((a) => accountUtils.isNonBaseVaultAccount(a, wallet) && accountUtils.isChainIdMatch(a, chain.chainId))
      .filter(
        (account) => !delegations[delegate.accountId]?.[toAddress(account.accountId, { prefix: chain.addressPrefix })],
      );
  },
);

const $accountsBalances = combine(
  {
    availableAccounts: $availableAccounts,
    balances: balanceModel.$balances,
    network: networkSelectorModel.$network,
  },
  ({ balances, network, availableAccounts }) => {
    if (availableAccounts.length <= 1 || !network) return {};

    return availableAccounts.reduce<Record<string, string>>((acc, account) => {
      const balance = balanceUtils.getBalance(
        balances,
        account.accountId,
        network!.chain.chainId,
        network!.asset.assetId.toString(),
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
        balance: formatAmount('1', chain.assets[0].precision),
        conviction: 'Locked1x',
        accountId: '0x0000000000000000000000000000000000000000',
        target: '0x0000000000000000000000000000000000000000',
      });

      if (mockTx.type === TransactionType.BATCH_ALL) {
        const txs = await transactionBuilder.splitBatchAll({ transaction: mockTx, chain, api });

        return isArray(txs) && txs.length > 1;
      } else {
        return false;
      }
    } else {
      return false;
    }
  },
);

sample({
  clock: formInitiated,
  source: $availableAccounts,
  target: $accounts,
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
    wallet: walletModel.$activeWallet,
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
  $availableTracks,
  $votedTracks,
  $tracksGroup,
  $allTracks: $tracksGroup.map(({ adminTracks, governanceTracks, treasuryTracks, fellowshipTracks }) => {
    return [...adminTracks, ...governanceTracks, ...treasuryTracks, ...fellowshipTracks];
  }),

  $accounts,
  $availableAccounts,
  $accountsBalances,
  $chain: delegationAggregate.$chain,
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
