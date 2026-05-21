import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { GraphQLClient, gql } from 'graphql-request';
import { z } from 'zod';

import { type ChainId, type NoID, type ProxyAccount, type ProxyType, CryptoType } from '@/shared/core';
import { entries, isEthereumAccountId, isHex } from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { INDEXER_URL, multisigOperationService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { backendConfigurationModel } from '@/aggregates/backend';

const MAX_HOPS = 5;

// One BFS hop. No `isPureProxy` filter per spec — all proxy variants are followed uniformly.
const PROXIEDS_HOP_QUERY = gql`
  query ProxiedsHop($accountIds: [String!]) {
    proxieds(filter: { accountId: { in: $accountIds }, delay: { equalTo: 0 } }) {
      nodes {
        accountId
        proxyAccountId
        chainId
        type
      }
    }
  }
`;

const proxyRowSchema = z.object({
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  proxyAccountId: z.string().transform(pjsSchema.helpers.toAccountId),
  chainId: z.string().transform((id, ctx) => {
    if (isHex(id)) return id;
    ctx.addIssue(`not chain id: ${id}`);

    return z.NEVER;
  }),
  type: z.string(),
});

type MultisigCandidate = {
  accountId: AccountId;
  signatories: AccountId[];
  threshold: number;
};

type FetchInput = {
  plainSeeds: AccountId[];
  multisigCandidates: MultisigCandidate[];
  apis: Record<ChainId, ApiPromise>;
};

type Hop = { proxied: AccountId; proxy: AccountId; type: ProxyType; chainId: ChainId };

type CandidateEdge = {
  proxiedAccountId: AccountId;
  accountId: AccountId;
  chainId: ChainId;
  proxyType: ProxyType;
  hops: Hop[];
};

type ParentLink = { parent: AccountId; type: ProxyType; chainId: ChainId };

function reconstructPath(leaf: AccountId, root: AccountId, parents: Map<AccountId, ParentLink[]>): Hop[] {
  if (leaf === root) return [];

  const queue: { node: AccountId; path: Hop[] }[] = [{ node: leaf, path: [] }];
  const visited = new Set<AccountId>([leaf]);

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const parentList = parents.get(next.node) ?? [];
    for (const { parent, type, chainId } of parentList) {
      const newPath: Hop[] = [{ proxied: parent, proxy: next.node, type, chainId }, ...next.path];
      if (parent === root) return newPath;
      if (visited.has(parent)) continue;
      visited.add(parent);
      queue.push({ node: parent, path: newPath });
    }
  }

  return [];
}

async function fetchContactProxies(input: FetchInput): Promise<NoID<ProxyAccount>[]> {
  const { plainSeeds, multisigCandidates, apis } = input;
  if (plainSeeds.length === 0) return [];

  // Step 1 — Local multisig re-derivation. Drop multisig contacts whose stored accountId
  // doesn't match the locally-derived id (defense against stale or tampered indexer/contact data).
  const validMultisigIds = new Set<AccountId>();
  for (const m of multisigCandidates) {
    const cryptoType = isEthereumAccountId(m.accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const derived = multisigOperationService.getMultisigAccountId(m.signatories, m.threshold, cryptoType);
    if (derived === m.accountId) {
      validMultisigIds.add(m.accountId);
    }
  }
  if (validMultisigIds.size === 0) return [];

  // Step 2 — BFS up to MAX_HOPS along the proxy graph. Seed = plain candidates;
  // walk proxied → proxy at each hop. Emit when the reached proxy is a re-derived multisig.
  const client = new GraphQLClient(INDEXER_URL);
  const seen = new Set<AccountId>(plainSeeds);
  const rootsByNode = new Map<AccountId, Set<AccountId>>();
  for (const seed of plainSeeds) rootsByNode.set(seed, new Set([seed]));

  const parents = new Map<AccountId, ParentLink[]>();
  let frontier: AccountId[] = plainSeeds;
  const candidateEdges: CandidateEdge[] = [];

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (frontier.length === 0) break;

    const response = await client.request<{ proxieds: { nodes: unknown[] } }, { accountIds: AccountId[] }>(
      PROXIEDS_HOP_QUERY,
      { accountIds: frontier },
    );
    const rows = response.proxieds.nodes.map((n) => proxyRowSchema.parse(n));

    const nextFrontier = new Set<AccountId>();

    for (const row of rows) {
      const proxiedId = row.accountId;
      const proxyId = row.proxyAccountId;
      const proxyType = row.type as ProxyType;
      const chainId = row.chainId as ChainId;

      const parentList = parents.get(proxyId) ?? [];
      parentList.push({ parent: proxiedId, type: proxyType, chainId });
      parents.set(proxyId, parentList);

      const proxiedRoots = rootsByNode.get(proxiedId);
      if (!proxiedRoots) continue;

      const proxyRoots = rootsByNode.get(proxyId) ?? new Set<AccountId>();
      for (const r of proxiedRoots) proxyRoots.add(r);
      rootsByNode.set(proxyId, proxyRoots);

      if (validMultisigIds.has(proxyId)) {
        for (const root of proxiedRoots) {
          const hops = reconstructPath(proxyId, root, parents);
          if (hops.length === 0) continue;
          // Reject mixed-chain hop chains: a real on-chain delegation lives on one chain.
          const chainIds = new Set(hops.map((h) => h.chainId));
          if (chainIds.size > 1) continue;
          candidateEdges.push({
            proxiedAccountId: root,
            accountId: proxyId,
            chainId,
            proxyType,
            hops,
          });
        }
      }

      if (!seen.has(proxyId)) {
        seen.add(proxyId);
        nextFrontier.add(proxyId);
      }
    }

    frontier = [...nextFrontier];
  }

  if (candidateEdges.length === 0) return [];

  // Step 3 — On-chain re-verification. Per spec, every flex-proxy link must be mirrored on-chain.
  // Group hops by chainId, batch-fetch on-chain proxies for unique proxied accountIds,
  // then drop any candidate edge whose hops aren't all mirrored.
  const proxiedsByChain = new Map<ChainId, Set<AccountId>>();
  for (const edge of candidateEdges) {
    for (const h of edge.hops) {
      const set = proxiedsByChain.get(h.chainId) ?? new Set<AccountId>();
      set.add(h.proxied);
      proxiedsByChain.set(h.chainId, set);
    }
  }

  const verificationMap = new Map<ChainId, Map<AccountId, Set<string>>>();
  const verifyTasks: Promise<void>[] = [];
  for (const [chainId, proxiedSet] of proxiedsByChain) {
    const api = apis[chainId];
    if (!api) continue;
    const proxiedIds = [...proxiedSet];
    verifyTasks.push(
      proxyPallet.storage
        .proxies(api, proxiedIds)
        .then((results) => {
          const chainMap = verificationMap.get(chainId) ?? new Map<AccountId, Set<string>>();
          for (const item of results) {
            const set = new Set<string>();
            if (item.value) {
              for (const proxy of item.value.proxies) {
                if (proxy.delay > 0) continue;
                set.add(`${proxy.delegate}:${proxy.proxyType}`);
              }
            }
            chainMap.set(item.account, set);
          }
          verificationMap.set(chainId, chainMap);
        })
        .catch(() => {
          // RPC failure on this chain → leave verification empty → drop those hops.
        }),
    );
  }
  await Promise.all(verifyTasks);

  const verifiedEdges = candidateEdges.filter((edge) =>
    edge.hops.every((h) => {
      const chainMap = verificationMap.get(h.chainId);
      const onChainSet = chainMap?.get(h.proxied);

      return onChainSet?.has(`${h.proxy}:${h.type}`) ?? false;
    }),
  );

  return verifiedEdges.map((edge) => ({
    accountId: edge.accountId,
    proxiedAccountId: edge.proxiedAccountId,
    chainId: edge.chainId,
    proxyType: edge.proxyType,
    delay: 0,
  }));
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

// Trigger BFS+verification when contacts change. Pull the latest chains/apis snapshot at the
// same moment so on-chain verification uses live API handles.
sample({
  clock: contactModel.$backendContacts,
  source: networkModel.$apis,
  filter: (_apis, contacts) => contacts.some((c) => !c.signatories?.length || !c.threshold),
  fn: (apis, contacts): FetchInput => {
    const plainSeeds: AccountId[] = [];
    const multisigCandidates: MultisigCandidate[] = [];
    for (const c of contacts) {
      const accountId = pjsSchema.helpers.toAccountId(c.accountId);
      if (c.signatories?.length && c.threshold) {
        multisigCandidates.push({
          accountId,
          signatories: c.signatories.map((s) => pjsSchema.helpers.toAccountId(s)),
          threshold: c.threshold,
        });
      } else {
        plainSeeds.push(accountId);
      }
    }

    return { plainSeeds, multisigCandidates, apis };
  },
  target: fetchContactProxiesFx,
});

// Pipe verified proxies into the proxy store
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
