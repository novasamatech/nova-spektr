import { gql } from '@apollo/client';
import { GraphQLClient } from 'graphql-request';
import { capitalize } from 'lodash';
import { z } from 'zod';

import { type ArrayElement, type Chain, type ChainId, ExternalType } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { papiHelpers } from '@/shared/papi-helpers';
import { papiSchema } from '@/shared/papi-schemas';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createRemoteResource, createSubscriptionResource } from '@/shared/resource';
import { getChainRegistry } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';

import { type Vote } from './types';

const mapChainVote = (
  pallet: CollectivePalletsType,
  chainId: ChainId,
  { vote, key }: ArrayElement<Awaited<ReturnType<typeof collectivePallet.storage.voting>>>,
): Vote | undefined => {
  if (nullable(vote)) return;

  return {
    pallet,
    chainId,
    accountId: key.accountId,
    referendumId: key.referendumId,
    votes: vote.data,
    decision: vote.type,
  };
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

const mapSubqueryVote = (
  pallet: CollectivePalletsType,
  chainId: ChainId,
  vote: ArrayElement<SubqueryResponse['votes']['nodes']>,
): Vote => {
  return {
    pallet,
    chainId,
    accountId: vote.accountId,
    referendumId: vote.referendum.index,
    votes: vote.votes,
    decision: vote.decision === 'aye' ? 'Aye' : 'Nay',
  };
};

const requestFromSubQuery = async (
  url: string,
  pallet: CollectivePalletsType,
  chainId: ChainId,
  referendums: ReferendumId[],
) => {
  const client = new GraphQLClient(url);
  const result = await client.request<SubqueryResponse, { referendums: string[] }>(GET_VOTES_QUERY, {
    referendums: referendums.map(r => `${pallet}:${r}`),
  });

  return result.votes.nodes.map(vote => mapSubqueryVote(pallet, chainId, vote));
};

type RequestVotesParams = {
  palletType: CollectivePalletsType;
  chain: Chain;
  referendums: ReferendumId[];
  accounts: AccountId[];
};

export const requestResource = createRemoteResource<RequestVotesParams, Vote[]>({
  pool: ({ palletType, chain }) => `${palletType}:${chain.chainId}`,
  cache: {
    key: ({ palletType, chain, referendums, accounts }) => {
      return `${palletType}:${chain.chainId}:${accounts.join(',')}:${referendums.join(',')}`;
    },
    ttl: 60 * 1000,
  },
  async fn({ palletType, chain, referendums, accounts }) {
    if (referendums.length === 0) return [];

    if (api) {
      try {
        const chainId = api.genesisHash.toHex();
        const keys = referendums.flatMap(r => accounts.map(a => [r, a] as const));
        const votes = await collectivePallet.storage.voting(palletType, api, keys);
        return votes.map(vote => mapChainVote(palletType, chainId, vote)).filter(nonNullable);
      } catch (e) {
        /* skip */
        console.error(e);
      }
    }

    const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    const sourceUrl = externalApi?.url;

    if (!sourceUrl) return [];

    return requestFromSubQuery(sourceUrl, palletType, chain.chainId, referendums);
  },
});

type RequestAllVotesParams = {
  palletType: CollectivePalletsType;
  chain: Chain;
  api: ApiPromise;
};

export const requestAllResource = createRemoteResource<RequestAllVotesParams, Vote[]>({
  pool: ({ palletType, chain }) => `${palletType}:${chain.chainId}`,
  cache: {
    key: ({ palletType, chain }) => `${palletType}:${chain.chainId}`,
    ttl: 60 * 1000,
  },
  async fn({ palletType, api, chain }) {
    const votes = await collectivePallet.storage.voting(palletType, api);
    return votes.map(vote => mapChainVote(palletType, chain.chainId, vote)).filter(nonNullable);
  },
});

type VotingSubscribeParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  accounts: AccountId[];
};

export const subscribeResource = createSubscriptionResource<VotingSubscribeParams, Vote[]>({
  pool: ({ palletType, chainId, accounts }) => `${palletType}:${chainId}:${accounts.join(',')}`,
  async fn({ palletType, chainId, accounts }, callback) {
    const payloadSchema = z.object({
      who: papiSchema.accountId,
      poll: z.number().transform(referendaPallet.helpers.toReferendumId),
      vote: z.object({ Aye: z.number() }).or(z.object({ Nay: z.number() })),
    });

    const papi = getChainRegistry().getApi(chainId);
    const subscription = papiHelpers.getTypedApis(papi, ['dot_col'], ({ api }) => {
      const pallet = `${capitalize(palletType)}Collective` as const;

      return api.event[pallet].Voted.watch().subscribe(({ payload }) => {
        const parsedData = payloadSchema.parse(payload);
        const accountMatch = accounts.some(a => a === parsedData.who);

        if (!accountMatch) return;

        const vote: Vote = {
          pallet: palletType,
          chainId,
          accountId: parsedData.who,
          referendumId: parsedData.poll,
          decision: 'Aye' in parsedData.vote ? 'Aye' : 'Nay',
          votes: 'Aye' in parsedData.vote ? parsedData.vote.Aye : parsedData.vote.Nay,
        };

        callback({
          value: [vote],
          done: true,
        });
      });
    });

    return subscription.unsubscribe;
  },
});
