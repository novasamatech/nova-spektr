import { GraphQLClient } from 'graphql-request';

import { type Chain, type ReferendumId, ExternalType } from '@/shared/core';
import { type SubQueryVoting } from '../lib/types';

import { GET_VOTINGS_FOR_REFERENDUM, GET_VOTINGS_FOR_VOTER } from './votings/queries';

const getGraphQLClient = (chain: Chain) => {
  const externalApi = chain.externalApi?.[ExternalType.DELEGATIONS]?.at(0);
  const sourceType = externalApi?.type;
  const sourceUrl = externalApi?.url;

  if (sourceType === 'subquery' && sourceUrl) {
    try {
      return new GraphQLClient(sourceUrl);
    } catch {
      return null;
    }
  }

  return null;
};

async function getVotingsForReferendum(chain: Chain, referendumId: ReferendumId): Promise<SubQueryVoting[]> {
  const client = getGraphQLClient(chain);
  if (!client) {
    return [];
  }

  return client.request(GET_VOTINGS_FOR_REFERENDUM, { referendumId }).then((x: any) => x.castingVotings.nodes);
}

async function getVotingsForVoter(chain: Chain, voter: string): Promise<Record<ReferendumId, SubQueryVoting>> {
  const client = getGraphQLClient(chain);
  if (!client) {
    return {};
  }

  return client
    .request(GET_VOTINGS_FOR_VOTER, { voter })
    .then((data: any) => {
      const result: Record<ReferendumId, SubQueryVoting> = {};

      for (const node of data.castingVotings.nodes) {
        result[node.referendum.id as ReferendumId] = {
          at: node.at,
          standardVote: node.standardVote,
          splitAbstainVote: node.splitAbstainVote,
          splitVote: node.splitVote,
        } as SubQueryVoting;
      }

      return result;
    })
    .catch(() => ({}));
}

export const votingsService = {
  getVotingsForReferendum,
  getVotingsForVoter,
};
