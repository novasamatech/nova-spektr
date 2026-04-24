import { combine, createEffect, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { GraphQLClient, gql } from 'graphql-request';
import { z } from 'zod';

import { type NoID, type ProxyAccount, type ProxyType } from '@/shared/core';
import { entries, isHex } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { INDEXER_URL } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { proxyModel } from '@/entities/proxy';
import { backendConfigurationModel } from '@/aggregates/backend';

// GraphQL query: find proxy relationships where the contact is the proxied account
const CONTACT_PROXIES_QUERY = gql`
  query ContactProxies($accountIds: [String!]) {
    proxieds(filter: { accountId: { in: $accountIds }, delay: { equalTo: 0 }, isPureProxy: { equalTo: true } }) {
      nodes {
        accountId
        proxyAccountId
        chainId
        type
      }
    }
  }
`;

const contactProxySchema = z.object({
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  proxyAccountId: z.string().transform(pjsSchema.helpers.toAccountId),
  chainId: z.string().transform((id, ctx) => {
    if (isHex(id)) return id;
    ctx.addIssue(`not chain id: ${id}`);

    return z.NEVER;
  }),
  type: z.string(),
});

async function fetchContactProxies(accountIds: AccountId[]): Promise<NoID<ProxyAccount>[]> {
  if (accountIds.length === 0) return [];

  const client = new GraphQLClient(INDEXER_URL);
  const response = await client.request<{ proxieds: { nodes: unknown[] } }, { accountIds: AccountId[] }>(
    CONTACT_PROXIES_QUERY,
    { accountIds },
  );

  return response.proxieds.nodes.map((node) => {
    const parsed = contactProxySchema.parse(node);

    return {
      accountId: parsed.proxyAccountId,
      proxiedAccountId: parsed.accountId,
      chainId: parsed.chainId,
      proxyType: parsed.type as ProxyType,
      delay: 0,
    };
  });
}

// Track which proxied account IDs were fetched from contacts,
// so we can clean them up when the backend is disconnected.
const $contactProxiedIds = createStore<Set<AccountId>>(new Set());

const fetchContactProxiesFx = createEffect(fetchContactProxies);

// Cache the slow subquery response in localStorage so subsequent sessions can render
// the proxy list immediately, before the fresh fetch completes.
const $cachedContactProxies = createStore<NoID<ProxyAccount>[]>([]);

persist({
  key: 'spektr_contact_proxies_v1',
  store: $cachedContactProxies,
  sync: true,
});

$cachedContactProxies.on(fetchContactProxiesFx.doneData, (_, proxies) => proxies);
$cachedContactProxies.reset(backendConfigurationModel.events.urlCleared);

// Live proxies (from IndexedDB / fresh fetch) take precedence; cached entries fill in
// for proxiedIds that haven't been hydrated yet.
const $contactProxyMap = combine(
  proxyModel.$proxies,
  $cachedContactProxies,
  (live, cached): Record<AccountId, NoID<ProxyAccount>[]> => {
    const result: Record<AccountId, NoID<ProxyAccount>[]> = {};

    for (const proxy of cached) {
      const bucket = result[proxy.proxiedAccountId];
      if (bucket) {
        bucket.push(proxy);
      } else {
        result[proxy.proxiedAccountId] = [proxy];
      }
    }

    for (const [id, liveBucket] of entries(live)) {
      if (liveBucket.length > 0) {
        result[id] = liveBucket;
      }
    }

    return result;
  },
);

// When backend contacts change, fetch proxy relationships for non-multisig contacts.
// Non-multisig contacts are candidates for being "flexible multisigs" (pure proxy + multisig pair).
sample({
  clock: contactModel.$backendContacts,
  filter: (contacts) => contacts.some((c) => !c.signatories?.length || !c.threshold),
  fn: (contacts) => {
    return contacts
      .filter((c) => !c.signatories?.length || !c.threshold)
      .map((c) => pjsSchema.helpers.toAccountId(c.accountId));
  },
  target: fetchContactProxiesFx,
});

// Pipe fetched proxies into the proxy store
sample({
  clock: fetchContactProxiesFx.doneData,
  filter: (proxies) => proxies.length > 0,
  target: proxyModel.events.proxiesAdded,
});

// Track which proxied account IDs came from contacts
sample({
  clock: fetchContactProxiesFx.doneData,
  source: $contactProxiedIds,
  fn: (existing, proxies) => {
    const next = new Set(existing);
    for (const proxy of proxies) {
      next.add(proxy.proxiedAccountId);
    }

    return next;
  },
  target: $contactProxiedIds,
});

// Clean up contact-sourced proxies when backend URL is cleared
sample({
  clock: backendConfigurationModel.events.urlCleared,
  source: { proxies: proxyModel.$proxies, contactProxiedIds: $contactProxiedIds },
  filter: ({ contactProxiedIds }) => contactProxiedIds.size > 0,
  fn: ({ proxies, contactProxiedIds }) => {
    const toRemove: ProxyAccount[] = [];
    for (const proxiedId of contactProxiedIds) {
      const proxyEntries = proxies[proxiedId];
      if (proxyEntries) {
        toRemove.push(...proxyEntries);
      }
    }

    return toRemove;
  },
  target: proxyModel.events.proxiesRemoved,
});

$contactProxiedIds.on(backendConfigurationModel.events.urlCleared, () => new Set());

export const contactProxiesModel = {
  $isLoading: fetchContactProxiesFx.pending,
  $contactProxyMap,
};
