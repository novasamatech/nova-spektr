import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';

import { delegationService, votingsService } from '@/shared/api/governance';
import { type Address, type Chain, type ChainId } from '@/shared/core';
import { MONTH, getBlockTimeAgo, nonNullable, nullable, setNestedValue } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import {
  type AggregatedReferendum,
  listAggregate,
  listService,
  networkSelectorModel,
  proposerIdentityAggregate,
} from '@/features/governance';
import { getDelegationsList } from '../lib/utils';

import { delegateDetailsModel } from './delegate-details-model';

type RequestParams = {
  accountId: string;
  chain: Chain;
};

type Delegation = [Address, { tracks: number[]; amount: BN }];
type Voted = {
  votedAt: number;
  voted: {
    vote: string;
    value: BN;
  }[];
};
export type VotedReferendum = AggregatedReferendum & Voted;

const openSummaryModal = createEvent();

const $isModalOpen = createStore(false);
const $delegations = createStore<Record<ChainId, Record<Address, Delegation[]>>>({});
const $referedumsList = createStore<Record<ChainId, Record<Address, VotedReferendum[]>>>({});
const $votedReferendumsMonth = createStore<VotedReferendum[]>([]);

const closeModal = $isModalOpen.reinit;

const $currentReferendums = listAggregate.$referendums.map((referendums) => {
  return listService.sortReferendumsByOngoing(referendums ?? []);
});

const getDelegatesFx = createEffect(({ accountId, chain }: RequestParams) => {
  return delegationService.getDelegatesForAccount(chain, accountId);
});

const getReferendumsForVoterFx = createEffect(({ accountId, chain }: RequestParams) => {
  return votingsService.getVotingsForVoter(chain, accountId);
});

const getMonthBlockFx = createEffect((api: ApiPromise) => {
  return getBlockTimeAgo(MONTH, api);
});

sample({
  clock: openSummaryModal,
  fn: () => true,
  target: $isModalOpen,
});

sample({
  clock: openSummaryModal,
  source: {
    delegate: delegateDetailsModel.$delegate,
    chain: delegateDetailsModel.$chain,
  },
  filter: ({ delegate, chain }) => nonNullable(delegate) && nonNullable(chain),
  fn: ({ delegate, chain }) => {
    return { accountId: delegate!.accountId, chain: chain! };
  },
  target: [getDelegatesFx, getReferendumsForVoterFx],
});

sample({
  clock: getDelegatesFx.done,
  source: $delegations,
  filter: (_, { result }) => nonNullable(result),
  fn: (delegations, { params, result }) => {
    const delegationsList = getDelegationsList(result!.delegations);

    return setNestedValue(delegations, params.chain.chainId, params.accountId, delegationsList);
  },
  target: $delegations,
});

sample({
  clock: getReferendumsForVoterFx.done,
  source: { currentReferendums: $currentReferendums, referedumsList: $referedumsList },
  filter: (_, { result }) => nonNullable(result),
  fn: ({ currentReferendums, referedumsList }, { params, result }) => {
    const referendums = currentReferendums.reduce<VotedReferendum[]>((acc, val) => {
      if (val.referendumId in result) {
        const votedReferendum = result[val.referendumId];

        const amount = new BN(
          votedReferendum.splitAbstainVote?.abstainAmount ?? votedReferendum.standardVote?.vote.amount ?? '0',
        );

        const votingPower = votingService.calculateVotingPower(
          amount,
          votedReferendum.standardVote?.vote?.conviction || 'None',
        );

        const splitVote = votedReferendum.splitVote
          ? [
              {
                vote: 'aye',
                value: votingService.calculateVotingPower(new BN(votedReferendum.splitVote.ayeAmount), 'None'),
              },
              {
                vote: 'nay',
                value: votingService.calculateVotingPower(new BN(votedReferendum.splitVote.nayAmount), 'None'),
              },
            ]
          : null;

        return [
          ...acc,
          {
            ...val,
            votedAt: votedReferendum.at,
            voted:
              splitVote ||
              (votedReferendum.splitAbstainVote
                ? [{ vote: 'abstain', value: votingPower }]
                : [{ vote: votedReferendum.standardVote?.aye ? 'aye' : 'nay', value: votingPower }]),
          },
        ];
      }

      return acc;
    }, []);

    return setNestedValue(referedumsList, params.chain.chainId, params.accountId, referendums);
  },
  target: $referedumsList,
});

const $currentDelegations = combine(
  {
    delegations: $delegations,
    chain: delegateDetailsModel.$chain,
    delegate: delegateDetailsModel.$delegate,
  },
  ({ delegations, chain, delegate }) => {
    if (!nonNullable(chain) || !nonNullable(delegate)) {
      return [];
    }

    return delegations[chain.chainId]?.[delegate.accountId] ?? [];
  },
);

const $votedReferendums = combine(
  {
    referendumsList: $referedumsList,
    chain: delegateDetailsModel.$chain,
    delegate: delegateDetailsModel.$delegate,
  },
  ({ referendumsList, chain, delegate }) => {
    if (nullable(chain) || nullable(delegate)) {
      return [];
    }

    return referendumsList[chain.chainId]?.[delegate.accountId] ?? [];
  },
);

sample({
  clock: $votedReferendums.updates,
  source: networkSelectorModel.$network,
  filter: (network) => nonNullable(network),
  fn: (network) => network!.api,
  target: getMonthBlockFx,
});

sample({
  clock: getMonthBlockFx.doneData,
  source: $votedReferendums,
  fn: (votedReferendums, block) => {
    if (votedReferendums.length === 0) return [];

    return votedReferendums.filter(({ votedAt }) => votedAt >= block);
  },
  target: $votedReferendumsMonth,
});

sample({
  clock: $currentDelegations,
  fn: (delegations) => ({
    addresses: delegations.map(([address]) => address),
  }),
  target: proposerIdentityAggregate.events.requestProposers,
});

export const delegateSummaryModel = {
  $isModalOpen,
  $currentDelegations,
  $votedReferendums,
  $votedReferendumsMonth,
  $proposers: proposerIdentityAggregate.$proposers,

  $isDelegatingLoading: getDelegatesFx.pending,
  $isReferendumsLoading: getReferendumsForVoterFx.pending,

  events: {
    closeModal,
    openSummaryModal,
  },
};
