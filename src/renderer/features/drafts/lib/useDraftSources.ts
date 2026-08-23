import { combine, createStore } from 'effector';
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
  /** Whether a draft can be sourced at this address on this chain at all. */
  isDraftSource: (accountId: AccountId) => boolean;
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
    const sources = allSources.filter((source) => addressBookIds.has(source.accountId));
    const sourceIds = new Set(sources.map((source) => source.accountId));

    return {
      sources,
      isDraftSource: (accountId: AccountId) => sourceIds.has(accountId),
      filterNextOption: (option: PathNextOption) => option.kind !== 'multisig' || addressBookIds.has(option.accountId),
    };
  }, [allSources, addressBookIds]);
};

const $noSources = createStore(new Map<ChainId, Set<AccountId>>());

/**
 * The same rule as `useDraftSources`, asked across several chains at once.
 *
 * A staking dashboard shows positions from every staking network in one table,
 * so the per-chain hook cannot serve it — the answer differs per chain (proxy
 * edges are chain-scoped) and hooks cannot be called in a loop. The chain set
 * is small and stable, so the per-chain stores are simply combined.
 */
export const useDraftSourceLookup = (chainIds: ChainId[]): ((accountId: AccountId, chainId: ChainId) => boolean) => {
  // Keyed by content, not by array identity: callers derive the chain set from
  // a store, so it is a new array on every render and memoising on it directly
  // would rebuild the combined store each time.
  const chainKey = useMemo(() => [...new Set(chainIds)].sort().join(','), [chainIds]);

  const sourcesStore = useMemo(() => {
    const ids = [...new Set(chainIds)].sort();
    if (ids.length === 0) return $noSources;

    return combine(
      ids.map((chainId) => graphModel.$sourcesFor(chainId)),
      (lists) => new Map(ids.map((chainId, index) => [chainId, new Set(lists[index]!.map((s) => s.accountId))])),
    );
    // `chainKey` is `chainIds` by value — recomputing on it keeps the store
    // stable while the set is unchanged, and current when it is not.
  }, [chainKey]);

  const sourcesByChain = useUnit(sourcesStore);
  const backendContacts = useUnit(contactModel.$backendContacts);
  const addressBookIds = useMemo(() => new Set(backendContacts.map((c) => c.accountId)), [backendContacts]);

  return useCallback(
    (accountId: AccountId, chainId: ChainId) =>
      addressBookIds.has(accountId) && (sourcesByChain.get(chainId)?.has(accountId) ?? false),
    [addressBookIds, sourcesByChain],
  );
};
