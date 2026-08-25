import { type Store, combine, createStore } from 'effector';
import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { contactModel } from '@/entities/contact';
import { type PathNextOption, type PathSource, graphModel } from '@/features/signing-path';

const $emptySources = createStore<PathSource[]>([]);

export type DraftSources = {
  /** Sources the picker may offer, in the graph's own order. */
  sources: PathSource[];
  /** Multisig hops past the source must be address-book entries too. */
  filterNextOption: (option: PathNextOption) => boolean;
};

/**
 * Where a draft on this chain may start.
 *
 * Two rules, both narrower than "any address in the address book":
 *
 * The signing-path graph only ever offers **multisigs** and **proxied accounts
 * whose delegation reaches a multisig** as sources, because a draft has to
 * terminate at somebody's key and a bare address delegates to nobody. An
 * ordinary stash address kept as a contact is therefore not a draft source and
 * never will be, however the address book is configured.
 *
 * On top of that, drafts are shared through the external address book, so a
 * source has to be an entry in it — a co-signer who opens the draft elsewhere
 * has to be able to see the same account.
 *
 * Published rather than computed per screen: the picker uses it to decide what
 * to offer, and a dashboard row uses it to decide whether to offer the action
 * at all. Two spellings of this rule means a row that opens a flow whose source
 * list is empty — a dead end with nothing on screen explaining it.
 */
export const useDraftSources = (chainId: ChainId | null, allowedProxyTypes?: readonly string[]): DraftSources => {
  const sourcesStore = useMemo(
    () => (chainId ? graphModel.$sourcesFor(chainId, { allowedProxyTypes }) : $emptySources),
    [chainId, allowedProxyTypes],
  );
  const allSources = useUnit(sourcesStore);
  const backendContacts = useUnit(contactModel.$backendContacts);

  const addressBookIds = useMemo(() => new Set(backendContacts.map((c) => c.accountId)), [backendContacts]);

  return useMemo(() => {
    return {
      sources: allSources.filter((source) => addressBookIds.has(source.accountId)),
      filterNextOption: (option: PathNextOption) => option.kind !== 'multisig' || addressBookIds.has(option.accountId),
    };
  }, [allSources, addressBookIds]);
};

const $noSources = createStore(new Map<ChainId, Set<AccountId>>());

/**
 * One store per chain set, kept for the life of the process.
 *
 * Same reason `graphModel` keeps `sourcesForCache`: `combine` builds a derived
 * unit permanently subscribed to its sources, and nothing here ever destroys
 * one. Creating a fresh store per render — and the dashboard re-renders this
 * every time another chain's positions arrive — would leave a growing pile of
 * live subscriptions recomputing on every contact and proxy update.
 */
const sourcesByChainsCache = new Map<string, Store<Map<ChainId, Set<AccountId>>>>();

/** `chainIds` must be deduplicated and sorted — it is also the cache key. */
function $sourcesForChains(chainIds: ChainId[]): Store<Map<ChainId, Set<AccountId>>> {
  if (chainIds.length === 0) return $noSources;

  const cacheKey = chainIds.join(',');
  const $cached = sourcesByChainsCache.get(cacheKey);
  if ($cached) return $cached;

  const $store = combine(
    chainIds.map((chainId) => graphModel.$sourcesFor(chainId)),
    (lists) => new Map(chainIds.map((chainId, index) => [chainId, new Set(lists[index]!.map((s) => s.accountId))])),
  );
  sourcesByChainsCache.set(cacheKey, $store);

  return $store;
}

/**
 * The same rule as `useDraftSources`, asked across several chains at once.
 *
 * A staking dashboard shows positions from every staking network in one table,
 * so the per-chain hook cannot serve it — the answer differs per chain (proxy
 * edges are chain-scoped) and hooks cannot be called in a loop. The chain set
 * is small and stable, so the per-chain stores are simply combined.
 */
export const useDraftSourceLookup = (chainIds: ChainId[]): ((accountId: AccountId, chainId: ChainId) => boolean) => {
  // Not memoised: callers derive the chain set from a store, so it is a new
  // array on every render anyway. The store cache keys by the set's *content*,
  // so the identity churn stops here rather than propagating into `useUnit`.
  const sourcesByChain = useUnit($sourcesForChains([...new Set(chainIds)].sort()));
  const backendContacts = useUnit(contactModel.$backendContacts);
  const addressBookIds = useMemo(() => new Set(backendContacts.map((c) => c.accountId)), [backendContacts]);

  return useCallback(
    (accountId: AccountId, chainId: ChainId) =>
      addressBookIds.has(accountId) && (sourcesByChain.get(chainId)?.has(accountId) ?? false),
    [addressBookIds, sourcesByChain],
  );
};
