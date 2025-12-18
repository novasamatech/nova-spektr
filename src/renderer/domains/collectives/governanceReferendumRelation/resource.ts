import { gql } from '@apollo/client';
import { createStore } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type Chain, type ChainId, ExternalType, type ReferendumId as GovernanceReferendumId } from '@/shared/core';
import { dictionary, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { createQueryResource } from '@/shared/query';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

const GET_REFERENDUMS_QUERY = gql`
  query GetReferendums($pallet: Pallet, $chainId: String!) {
    referendums(filter: { pallet: { equalTo: $pallet }, chainId: { equalTo: $chainId } }) {
      nodes {
        index
        relatedReferendum {
          chainId
          index
          id
        }
      }
    }
  }
`;

const referendumsGqlSchema = z.object({
  referendums: z.object({
    nodes: z.array(
      z.object({
        index: z.int(),
        relatedReferendum: z.nullable(
          z.object({
            chainId: z.string().startsWith('0x'),
            index: z.int(),
          }),
        ),
      }),
    ),
  }),
});

const requestCollectivesReferendumsMapToGovernance = async (url: string, chainId: ChainId) => {
  const client = new GraphQLClient(url);
  const result = await client.request(GET_REFERENDUMS_QUERY, {
    pallet: 'fellowship',
    chainId,
  });
  try {
    const parsed = referendumsGqlSchema.parse(result);
    return parsed.referendums.nodes;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export type ReferendumsMapToGovernanceParams = {
  chain: Chain;
  palletType: CollectivePalletsType;
};

export const collectivesReferendumsMapToGovernanceResource = createQueryResource<ReferendumsMapToGovernanceParams>({
  key: ({ chain, palletType }) => [chain.chainId, palletType],
})
  .request(async ({ chain }) => {
    const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    const sourceUrl = externalApi?.url;
    if (!sourceUrl) return {};

    const result = await requestCollectivesReferendumsMapToGovernance(sourceUrl, chain.chainId);

    return dictionary(result, 'index', item =>
      item.relatedReferendum
        ? {
            chainId: item.relatedReferendum.chainId,
            referendumId: String(item.relatedReferendum.index) satisfies GovernanceReferendumId,
          }
        : null,
    );
  })
  .retry({
    count: 3,
    delay: 5000,
  })
  .cache({
    store: createStore<
      CollectivesStruct<
        Record<
          ReferendumId,
          {
            chainId: ChainId;
            referendumId: GovernanceReferendumId;
          }
        >
      >
    >({}),
    staleAfter: 30 * 1000,
    map: (state, referendums, { chain, palletType }) => {
      const prev = pickNestedValue(state, palletType, chain.chainId) ?? {};
      return setNestedValue(state, palletType, chain.chainId, { ...prev, ...referendums });
    },
  })
  .build();
