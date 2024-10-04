import { BN } from '@polkadot/util';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type SubQueryVoting, votingsService } from '@/shared/api/governance';
import {
  type AccountVote,
  type Address,
  type Chain,
  type ChainId,
  type Conviction,
  type Referendum,
  type ReferendumId,
} from '@/shared/core';
import { nonNullable, setNestedValue, toAccountId, toAddress } from '@/shared/lib/utils';

export type VoteHistoryRecord = {
  delegatorVotes: {
    delegator: Address;
    amount: BN;
    conviction: Conviction;
  }[];
  referendumId: ReferendumId;
  voter: Address;
  vote: AccountVote;
};

const mapSubQueryVotingToAccountVote = (voting: SubQueryVoting): AccountVote | null => {
  if (voting.standardVote) {
    return {
      type: 'Standard',
      balance: new BN(voting.standardVote.vote.amount),
      vote: {
        aye: voting.standardVote.aye,
        conviction: voting.standardVote.vote.conviction,
      },
    };
  }
  if (voting.splitVote) {
    return {
      type: 'Split',
      aye: new BN(voting.splitVote.ayeAmount),
      nay: new BN(voting.splitVote.nayAmount),
    };
  }
  if (voting.splitAbstainVote) {
    return {
      type: 'SplitAbstain',
      aye: new BN(voting.splitAbstainVote.ayeAmount),
      nay: new BN(voting.splitAbstainVote.nayAmount),
      abstain: new BN(voting.splitAbstainVote.abstainAmount),
    };
  }

  return null;
};

const $voteHistory = createStore<Record<ChainId, Record<ReferendumId, VoteHistoryRecord[]>>>({});
const $hasError = createStore(false);

const requestVoteHistory = createEvent<{ chain: Chain; referendum: Referendum }>();

type RequestVoteHistoryParams = {
  chain: Chain;
  referendum: Referendum;
};

const requestVoteHistoryFx = createEffect(({ chain, referendum }: RequestVoteHistoryParams) => {
  return votingsService.getVotingsForReferendum(chain, referendum.referendumId).then((subqueryVotes) => {
    return subqueryVotes
      .map<VoteHistoryRecord | null>((voting) => {
        const accountVote = mapSubQueryVotingToAccountVote(voting);
        if (!accountVote) {
          return null;
        }

        return {
          referendumId: voting.referendumId,
          // subquery somehow send address with incorrect prefix
          voter: toAddress(toAccountId(voting.voter), { prefix: chain.addressPrefix }),
          vote: accountVote,
          delegatorVotes: voting.delegatorVotes.nodes.map((delegatorVote) => ({
            delegator: delegatorVote.delegator,
            amount: new BN(delegatorVote.vote.amount),
            conviction: delegatorVote.vote.conviction,
          })),
        };
      })
      .filter(nonNullable);
  });
});

sample({
  clock: requestVoteHistory,
  target: requestVoteHistoryFx,
});

sample({
  clock: requestVoteHistory,
  fn: () => false,
  target: $hasError,
});

sample({
  clock: requestVoteHistoryFx.done,
  source: $voteHistory,
  fn: (history, { params, result }) => {
    return setNestedValue(history, params.chain.chainId, params.referendum.referendumId, result);
  },
  target: $voteHistory,
});

sample({
  clock: requestVoteHistoryFx.fail,
  fn: () => true,
  target: $hasError,
});

export const voteHistoryModel = {
  $voteHistory: readonly($voteHistory),
  $isLoading: requestVoteHistoryFx.pending,
  $hasError,

  events: {
    requestVoteHistory,
    voteHistoryRequestDone: requestVoteHistoryFx.done,
  },
};
