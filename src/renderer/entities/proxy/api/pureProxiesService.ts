import { GraphQLClient } from 'graphql-request';

import { CHECK_PURE_PROXIES } from './graphql/queries/pureProxies';
import type { AccountId } from '@shared/core';

export const checkPureProxies = async (client: GraphQLClient, accountIds: AccountId[]): Promise<AccountId[]> => {
  const data = await client.request(CHECK_PURE_PROXIES, {
    accountIds,
  });

  const checkedProxies = (data as any)?.pureProxies?.nodes?.map((node: any) => node.id) || [];

  return checkedProxies;
};
