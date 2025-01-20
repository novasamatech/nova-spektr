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

const mapChainVote = ({
  vote,
  key,
}: ArrayElement<Awaited<ReturnType<typeof collectivePallet.storage.voting>>>): Vote | undefined => {
  if (!vote) return;

  return {
    accountId: key.accountId,
    referendumId: key.referendumId,
    votes: vote.data,
    decision: vote.type,
  };
};

export const requestFromChain = async (api: ApiPromise, pallet: CollectivePalletsType, referendums: ReferendumId[]) => {
  const requests = referendums.map(referendum => collectivePallet.storage.voting(pallet, api, referendum));
  const votes = await Promise.all(requests).then(l => l.flat());

  return votes.map(mapChainVote).filter(nonNullable);
};

const GET_VOTES_QUERY = gql`
  query VotingHistory($referendums: [String!]) {
    votes(filter: { referendumId: { in: $referendums } }) {
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

export const requestFromSubQuery = async (url: string, pallet: CollectivePalletsType, referendums: ReferendumId[]) => {
  const client = new GraphQLClient(url);
  const result = await client.request<SubqueryResponse, { referendums: string[] }>(GET_VOTES_QUERY, {
    referendums: referendums.map(r => `${pallet}:${r}`),
  });

  return result.votes.nodes.map(mapSubqueryVote);
};
