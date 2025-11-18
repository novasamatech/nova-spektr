import { gql } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type ArrayElement, type Chain, type ChainId, ExternalType } from '@/shared/core';
import { nonNullable, toAccountId } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';
import { mergeNested } from '../_lib/helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type Vote } from './types';

const mapChainVote = (
  pallet: CollectivePalletsType,
  chainId: ChainId,
  { vote, key }: ArrayElement<Awaited<ReturnType<typeof collectivePallet.storage.voting>>>,
): Vote | undefined => {
  if (!vote) return;

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

const $sharedVotesCache = createStore<CollectivesStruct<Vote[]>>({});

export type RequestVotesParams = {
  palletType: CollectivePalletsType;
  chain: Chain;
  api: ApiPromise;
  referendums: ReferendumId[];
  accounts: AccountId[];
};

export const votesResource = createQueryResource<RequestVotesParams>({
  key: ({ palletType, chain, referendums, accounts }) => {
    return [palletType, chain.chainId, accounts, referendums];
  },
})
  .request<Vote[]>(async ({ palletType, api, chain, referendums, accounts }) => {
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
  })
  .cache<CollectivesStruct<Vote[]>>({
    store: $sharedVotesCache,
    staleAfter: 60 * 1000,
    map(state, votes) {
      return mergeNested(state, votes, v => `${v.accountId}:${v.referendumId}`);
    },
  })
  .build();

export type RequestAllVotesParams = {
  palletType: CollectivePalletsType;
  chain: Chain;
  api: ApiPromise;
};

export const allVotesResource = createQueryResource<RequestAllVotesParams>({
  key: ({ palletType, chain }) => [palletType, chain.chainId],
})
  .request<Vote[]>(async ({ palletType, api, chain }) => {
    const votes = await collectivePallet.storage.voting(palletType, api);
    return votes.map(vote => mapChainVote(palletType, chain.chainId, vote)).filter(nonNullable);
  })
  .cache<CollectivesStruct<Vote[]>>({
    store: $sharedVotesCache,
    staleAfter: 60 * 1000,
    map(state, votes) {
      return mergeNested(state, votes, v => [v.accountId, v.referendumId]);
    },
  })
  .build();

export type VotingSubscribeParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  accounts: AccountId[];
};

export const votingSubscriptionResource = createSubscriptionResource<VotingSubscribeParams>({
  key: ({ palletType, chainId, accounts }) => [palletType, chainId, accounts.join(',')],
})
  .subscribe<Vote[]>(({ palletType, api, chainId, accounts }, callback) => {
    const number = z.string().transform(v => parseInt(v));
    const eventSchema = z.object({
      who: z.string(),
      poll: number.transform(referendaPallet.helpers.toReferendumId),
      vote: z.object({ Aye: number }).or(z.object({ Nay: number })),
    });

    const unsubscribe = polkadotjsHelpers.subscribeSystemEvents(
      { api, section: `${palletType}Collective`, methods: ['Voted'] },
      event => {
        const data = eventSchema.parse(event.data.toHuman());
        const accountId = toAccountId(data.who);
        if (!accounts.some(a => a === accountId)) {
          return;
        }

        const vote: Vote = {
          pallet: palletType,
          chainId,
          accountId,
          referendumId: data.poll,
          decision: 'Aye' in data.vote ? 'Aye' : 'Nay',
          votes: 'Aye' in data.vote ? data.vote.Aye : data.vote.Nay,
        };

        callback([vote]);
      },
    );

    return unsubscribe;
  })
  .cache<CollectivesStruct<Vote[]>>({
    store: createStore({}),
    map(state, votes) {
      return mergeNested(state, votes, v => `${v.accountId}:${v.referendumId}`);
    },
  })
  .build();
