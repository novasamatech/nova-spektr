import { GraphQLClient } from 'graphql-request';

import { FILTER_PURE_PROXIED_ACCOUNT_IDS } from './graphql/queries/pureProxies';
import type { AccountId } from '@shared/core';

export const pureProxiesService = {
  filterPureProxiedAccountIds,
};

async function filterPureProxiedAccountIds(client: GraphQLClient, accountIds: AccountId[]): Promise<AccountId[]> {
  const data = await client.request(FILTER_PURE_PROXIED_ACCOUNT_IDS, { accountIds });

  const filteredAccountIds = (data as any)?.pureProxies?.nodes?.map((node: any) => node.id);

  return filteredAccountIds || [];
}
