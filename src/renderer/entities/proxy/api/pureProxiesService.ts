import { type GraphQLClient } from 'graphql-request';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { FILTER_PURE_PROXIED_ACCOUNT_IDS } from './graphql/queries/pureProxies';

export const pureProxiesService = {
  filterPureProxiedAccountIds,
};

type PureProxied = {
  accountId: AccountId;
  blockNumber: number;
  extrinsicIndex: number;
};

async function filterPureProxiedAccountIds(client: GraphQLClient, accountIds: AccountId[]): Promise<PureProxied[]> {
  const data = await client.request(FILTER_PURE_PROXIED_ACCOUNT_IDS, { accountIds });

  const filteredAccountIds = (data as any)?.pureProxies?.nodes?.map(({ id, blockNumber, extrinsicIndex }: any) => ({
    accountId: id,
    blockNumber,
    extrinsicIndex,
  }));

  return filteredAccountIds || [];
}
