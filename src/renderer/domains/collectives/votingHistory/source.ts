import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { GraphQLClient } from 'graphql-request';

import { type ArrayElement } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

import { type Vote } from './types';

const mapChainVote = (
  vote: ArrayElement<Awaited<ReturnType<typeof collectivePallet.storage.voting>>>,
): Vote | undefined => {
  if (!vote.vote) return;

  return {
    accountId: vote.key.accountId,
    referendumId: vote.key.referendumId,
    votes: vote.vote.data,
    decision: vote.vote.type,
  };
};

export const requestFromChain = async (api: ApiPromise, pallet: CollectivePalletsType, referendumId: ReferendumId) => {
  const votes = await collectivePallet.storage.voting(pallet, api, referendumId);

  return votes.map(mapChainVote).filter(nonNullable);
};

const GET_VOTES_QUERY = gql`
  query VotingHistory($referendumId: String!) {
    votes(filter: { referendumId: { equalTo: $referendumId } }) {
      nodes {
        accountId
        decision
        votes
        referendum {
          index
        }
      }
    }
  }
`;

type SubqueryResponse = {
  votes: {
    nodes: {
      accountId: AccountId;
      decision: 'aye' | 'nay';
      votes: number;
      referendum: {
        index: ReferendumId;
      };
    }[];
  };
};

const mapSubqueryVote = (vote: ArrayElement<SubqueryResponse['votes']['nodes']>): Vote => {
  return {
    accountId: vote.accountId,
    referendumId: vote.referendum.index,
    votes: vote.votes,
    decision: vote.decision === 'aye' ? 'Aye' : 'Nay',
  };
};

export const requestFromSubQuery = async (url: string, pallet: CollectivePalletsType, referendumId: ReferendumId) => {
  const client = new GraphQLClient(url);

  const result = await client.request<SubqueryResponse, { referendumId: string }>(GET_VOTES_QUERY, {
    referendumId: `${pallet}:${referendumId}`,
  });

  return result.votes.nodes.map(mapSubqueryVote);
};
