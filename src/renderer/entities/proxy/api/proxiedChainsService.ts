import { type ApiPromise } from '@polkadot/api';
import { type GraphQLClient } from 'graphql-request';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { isHex } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { PROXIED_CHAINS_BY_ACCOUNT_ID } from './graphql/queries/proxiedChains';

const chainIdSchema = z
  .string()
  .refine(isHex)
  .transform((id) => id as ChainId);

const proxiedChainSchema = z.object({
  accountId: z.string(),
  chainId: chainIdSchema,
});

async function getProxiedChainIds(client: GraphQLClient, accountId: AccountId): Promise<ChainId[]> {
  const response = await client.request<{ proxieds: { nodes: unknown[] } }, { accountIds: AccountId[] }>(
    PROXIED_CHAINS_BY_ACCOUNT_ID,
    { accountIds: [accountId] },
  );

  const parsed = response.proxieds.nodes.map((x) => proxiedChainSchema.parse(x));

  return [...new Set(parsed.map((p) => p.chainId))];
}

async function verifyProxiesOnChain(
  accountId: AccountId,
  chainIds: ChainId[],
  apis: Partial<Record<ChainId, ApiPromise>>,
): Promise<ChainId[]> {
  const results = await Promise.all(
    chainIds.map(async (chainId) => {
      const api = apis[chainId];
      if (!api) return chainId;

      try {
        const proxies = await proxyPallet.storage.proxies(api, [accountId]);
        const record = proxies.at(0)?.value;

        return record && record.proxies.length > 0 ? chainId : null;
      } catch {
        return chainId;
      }
    }),
  );

  return results.filter((id): id is ChainId => id !== null);
}

export const proxiedChainsService = {
  getProxiedChainIds,
  verifyProxiesOnChain,
};
