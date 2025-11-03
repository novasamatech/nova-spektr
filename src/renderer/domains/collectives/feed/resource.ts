import { gql } from '@apollo/client';
import { BN } from '@polkadot/util';
import { createStore } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, ExternalType } from '@/shared/core';
import { merge, nonNullable, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type AccountId, type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type FeedRecord } from './types';

const feedGqlSchema = z.object({
  at: z.coerce.date(),
  blockNumber: z.number().transform(pjsSchema.helpers.toBlockHeight),
  pallet: z.string(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  // event types
  activeChanged: z
    .object({
      isActive: z.boolean(),
    })
    .nullable(),
  promoted: z.object({ rank: z.number() }).nullable(),
  demoted: z.object({ rank: z.number() }).nullable(),
  proven: z.object({ rank: z.number() }).nullable(),
  imported: z.object({ rank: z.number() }).nullable(),
  requested: z
    .object({
      wish: z.enum(['Retention', 'Promotion']),
    })
    .nullable(),
  paid: z
    .object({
      beneficiary: z.string().transform(pjsSchema.helpers.toAccountId),
      amount: z.string().transform(x => new BN(x)),
    })
    .nullable(),
});

const accountActivitiesQuery = gql`
  query List($pallet: Pallet!, $accountId: String!) {
    feedEvents(filter: { pallet: { equalTo: $pallet }, accountId: { equalTo: $accountId } }) {
      nodes {
        accountId
        at
        demoted
        imported
        paid
        pallet
        promoted
        proven
        requested
        id
        activeChanged
        blockNumber
      }
    }
  }
`;

const accountAllActivities = gql`
  query List($pallet: Pallet!) {
    feedEvents(filter: { pallet: { equalTo: $pallet } }) {
      nodes {
        accountId
        at
        demoted
        imported
        paid
        pallet
        promoted
        proven
        requested
        id
        activeChanged
        blockNumber
      }
    }
  }
`;

const accountActivitiesSince = gql`
  query List($pallet: Pallet!, $blockNumber: Int!) {
    feedEvents(filter: { pallet: { equalTo: $pallet }, blockNumber: { greaterThanOrEqualTo: $blockNumber } }) {
      nodes {
        accountId
        at
        demoted
        imported
        paid
        pallet
        promoted
        proven
        requested
        id
        activeChanged
        blockNumber
      }
    }
  }
`;

function mapSubqueryFeedRecord(node: unknown): FeedRecord | null {
  const response = feedGqlSchema.parse(node);

  if (response.activeChanged) {
    return {
      type: 'activeChanged',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      isActive: response.activeChanged.isActive,
    };
  }

  if (response.promoted) {
    return {
      type: 'promoted',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      rank: response.promoted.rank,
    };
  }

  if (response.demoted) {
    return {
      type: 'demoted',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      rank: response.demoted.rank,
    };
  }

  if (response.proven) {
    return {
      type: 'proven',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      rank: response.proven.rank,
    };
  }

  if (response.imported) {
    return {
      type: 'imported',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      rank: response.imported.rank,
    };
  }

  if (response.requested) {
    return {
      type: 'requested',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      wish: response.requested.wish,
    };
  }

  if (response.paid) {
    return {
      type: 'paid',
      accountId: response.accountId,
      at: new Date(response.at),
      block: response.blockNumber,
      beneficiary: response.paid.beneficiary,
      amount: response.paid.amount,
    };
  }

  return null;
}

export async function fetchAccountActivities(
  url: string,
  pallet: CollectivePalletsType,
  accountId: AccountId,
): Promise<FeedRecord[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { pallet: CollectivePalletsType; accountId: AccountId }>(
    accountActivitiesQuery,
    { pallet, accountId },
  );

  return result.feedEvents.nodes.map(mapSubqueryFeedRecord).filter(nonNullable);
}

export async function fetchAllActivities(url: string, pallet: CollectivePalletsType): Promise<FeedRecord[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { pallet: CollectivePalletsType }>(accountAllActivities, { pallet });

  return result.feedEvents.nodes.map(mapSubqueryFeedRecord).filter(nonNullable);
}

export async function fetchActivitiesSince(
  url: string,
  pallet: CollectivePalletsType,
  blockNumber: BlockHeight,
): Promise<FeedRecord[]> {
  const client = new GraphQLClient(url);
  const result = await client.request<any, { pallet: CollectivePalletsType; blockNumber: BlockHeight }>(
    accountActivitiesSince,
    { pallet, blockNumber },
  );

  return result.feedEvents.nodes.map(mapSubqueryFeedRecord).filter(nonNullable);
}

export type FeedSubscriptionParams = {
  palletType: CollectivePalletsType;
  chain: Chain;
};

export const feedSubscriptionResource = createSubscriptionResource<FeedSubscriptionParams>({
  key: ({ palletType, chain }) => [palletType, chain.chainId],
})
  .subscribe<FeedRecord[]>(({ chain, palletType }, callback) => {
    const url = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0)?.url;
    if (nullable(url)) {
      throw new Error(`Collectives indexer doesn't support ${chain.name} chain`);
    }

    const fn = () => {
      fetchAllActivities(url, palletType).then(value => {
        callback(value);
      });
    };

    fn();

    const interval = setInterval(fn, 60000);
    return () => clearInterval(interval);
  })
  .cache<CollectivesStruct<FeedRecord[]>>({
    store: createStore({}),
    map: (state, data, { palletType, chain }) => {
      const prev = pickNestedValue(state, palletType, chain.chainId) ?? [];
      const newList = merge({
        a: prev,
        b: data,
        mergeBy: a => [a.accountId, a.block, a.type],
        sort: (a, b) => b.block - a.block,
      });

      return setNestedValue(state, palletType, chain.chainId, newList);
    },
  })
  .build();
