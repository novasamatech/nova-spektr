import { type Store, combine, createEffect, createEvent, createStore, sample } from 'effector';

import { type ChainId, type WalletType, SigningType } from '@/shared/core';
import { type BackendContact } from '@/shared/core/types/contact';
import { type ProxyAccount, type ProxyType } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { accountService, accounts, identity } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';

export type PathSource = {
  accountId: AccountId;
  name: string;
  isProxy: boolean;
  walletType?: WalletType | null;
};

export type PathNextOption =
  | {
      kind: 'multisig';
      accountId: AccountId;
      name: string;
      threshold?: number;
      signatoriesCount?: number;
      proxyType?: ProxyType;
    }
  | { kind: 'signer'; accountId: AccountId; name: string };

const isMultisigContact = (c: BackendContact): boolean =>
  Array.isArray(c.signatories) && c.signatories.length > 0 && typeof c.threshold === 'number' && c.threshold >= 1;

type ContactsByAccountId = Map<AccountId, BackendContact>;

const $contactByAccountId = contactModel.$backendContacts.map<ContactsByAccountId>(
  (contacts) => new Map(contacts.map((c) => [c.accountId, c])),
);

// AccountIds the user actually owns and that can sign (i.e. the leaf set
// `findSignatories` would consider). Watch-only is excluded because it can't
// produce signatures. Used by the restrictToOwn graph mode to hide any path
// that doesn't terminate at one of these.
const $ownSignerAccountIds = accounts.$list.map<Set<AccountId>>(
  (list) => new Set(list.filter((a) => a.signingType !== SigningType.WATCH_ONLY).map((a) => a.accountId as AccountId)),
);

/**
 * Canonical name resolver — same priority as the rest of the app (custom wallet
 * name → local contact → backend contact → on-chain identity → truncated
 * address). Returns a chain-bound resolver: pass it the chainId once and call
 * it per accountId. Used everywhere the path UI needs to label an account.
 */
type AccountNameResolver = (accountId: AccountId, chainId: ChainId) => string;

const $nameResolver = combine(
  {
    allAccounts: accounts.$list,
    contacts: contactModel.$contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
  },
  ({ allAccounts, contacts, identities, chains }): AccountNameResolver => {
    return (accountId, chainId) =>
      accountService.resolveAccountName({
        accountId,
        chain: chains[chainId] ?? null,
        accounts: allAccounts,
        contacts,
        identities,
        chains,
      });
  },
);

/**
 * Build a memoized "can a path that traverses contacts starting at `id` reach
 * an own signer?" predicate. Walks the contact graph DFS through nested
 * multisig signatories, with cycle protection.
 *
 * `allowedSet` is treated as terminal: any accountId in the set short-circuits
 * to true, no matter whether it has a contact entry. Non-multisig contacts and
 * unknown accountIds outside the set return false (dead end).
 */
function makeReachabilityChecker(contactByAccountId: ContactsByAccountId, allowedSet: Set<AccountId>) {
  const memo = new Map<AccountId, boolean>();

  const check = (id: AccountId, visiting: Set<AccountId>): boolean => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return false;

    if (allowedSet.has(id)) {
      memo.set(id, true);

      return true;
    }

    visiting.add(id);
    const contact = contactByAccountId.get(id);
    let result = false;
    if (contact && isMultisigContact(contact)) {
      result = (contact.signatories ?? []).some((sig) => check(sig as AccountId, visiting));
    }
    visiting.delete(id);
    memo.set(id, result);

    return result;
  };

  return (id: AccountId) => check(id, new Set());
}

function buildSources(
  contactByAccountId: ContactsByAccountId,
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
  allowedSet: Set<AccountId> | null,
  resolveName: AccountNameResolver,
): PathSource[] {
  const sources: PathSource[] = [];
  const canReach = allowedSet ? makeReachabilityChecker(contactByAccountId, allowedSet) : null;

  for (const contact of contactByAccountId.values()) {
    if (isMultisigContact(contact)) {
      if (canReach && !canReach(contact.accountId)) continue;
      sources.push({
        accountId: contact.accountId,
        name: resolveName(contact.accountId, chainId),
        isProxy: false,
        walletType: null,
      });
      continue;
    }

    const signers = proxies[contact.accountId] ?? [];
    const hasMultisigSigner = signers.some((p) => {
      if (p.chainId !== chainId) return false;
      const signerContact = contactByAccountId.get(p.accountId);
      if (!signerContact || !isMultisigContact(signerContact)) return false;
      // restrictToOwn: only count the proxy as a viable source if its signing
      // multisig leads to one of the user's own signers — otherwise the user
      // could pick the source but never complete the path.
      if (canReach && !canReach(signerContact.accountId)) return false;

      return true;
    });

    if (hasMultisigSigner) {
      sources.push({
        accountId: contact.accountId,
        name: resolveName(contact.accountId, chainId),
        isProxy: true,
        walletType: null,
      });
    }
  }

  return sources;
}

function buildNextOptions(
  node: PathNode,
  contactByAccountId: ContactsByAccountId,
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
  allowedSet: Set<AccountId> | null,
  resolveName: AccountNameResolver,
): PathNextOption[] {
  if (node.kind === 'signer') return [];

  const canReach = allowedSet ? makeReachabilityChecker(contactByAccountId, allowedSet) : null;
  const nodeAccountId = node.accountId as AccountId;

  if (node.kind === 'proxied') {
    const signers = proxies[nodeAccountId] ?? [];
    const seen = new Set<string>();

    return signers
      .filter((p) => p.chainId === chainId)
      .flatMap((p) => {
        const contact = contactByAccountId.get(p.accountId);
        if (!contact || !isMultisigContact(contact)) return [];
        if (canReach && !canReach(contact.accountId)) return [];

        const dedupKey = `${contact.accountId}|${p.proxyType}|${p.delay}`;
        if (seen.has(dedupKey)) return [];
        seen.add(dedupKey);

        return [
          {
            kind: 'multisig' as const,
            accountId: contact.accountId,
            name: resolveName(contact.accountId, chainId),
            threshold: contact.threshold ?? undefined,
            signatoriesCount: contact.signatories?.length ?? undefined,
            proxyType: p.proxyType,
          },
        ];
      });
  }

  const multisigContact = contactByAccountId.get(nodeAccountId);
  if (!multisigContact || !isMultisigContact(multisigContact)) return [];

  return (multisigContact.signatories ?? []).flatMap<PathNextOption>((sigId) => {
    const sigAccountId = sigId as AccountId;
    if (canReach && !canReach(sigAccountId)) return [];
    const sigContact = contactByAccountId.get(sigAccountId);

    if (sigContact && isMultisigContact(sigContact)) {
      return [
        {
          kind: 'multisig',
          accountId: sigAccountId,
          name: resolveName(sigAccountId, chainId),
          threshold: sigContact.threshold ?? undefined,
          signatoriesCount: sigContact.signatories?.length ?? undefined,
        },
      ];
    }

    return [
      {
        kind: 'signer',
        accountId: sigAccountId,
        name: resolveName(sigAccountId, chainId),
      },
    ];
  });
}

export type GraphOptions = {
  /**
   * If true, hide any branch of the graph that doesn't terminate at one of the
   * user's own signing accounts. Use when the consumer is preparing a
   * transaction the user will sign themselves (e.g. edit flexible multisig);
   * leave off for proposal flows where someone else may sign (e.g. drafts).
   */
  restrictToOwn?: boolean;
};

const sourcesForCache = new Map<string, Store<PathSource[]>>();

function $sourcesFor(chainId: ChainId, opts?: GraphOptions): Store<PathSource[]> {
  const restrictToOwn = opts?.restrictToOwn ?? false;
  const cacheKey = `${chainId}:${restrictToOwn ? 'own' : 'all'}`;
  const $cached = sourcesForCache.get(cacheKey);
  if ($cached) return $cached;

  const $store = restrictToOwn
    ? combine(
        {
          contactByAccountId: $contactByAccountId,
          proxies: proxyModel.$proxies,
          allowed: $ownSignerAccountIds,
          resolveName: $nameResolver,
        },
        ({ contactByAccountId, proxies, allowed, resolveName }) =>
          buildSources(
            contactByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            allowed,
            resolveName,
          ),
      )
    : combine(
        { contactByAccountId: $contactByAccountId, proxies: proxyModel.$proxies, resolveName: $nameResolver },
        ({ contactByAccountId, proxies, resolveName }) =>
          buildSources(
            contactByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            null,
            resolveName,
          ),
      );
  sourcesForCache.set(cacheKey, $store);

  return $store;
}

const nextOptionsCache = new Map<string, Store<PathNextOption[]>>();

function $nextOptionsForNode(node: PathNode, chainId: ChainId, opts?: GraphOptions): Store<PathNextOption[]> {
  const restrictToOwn = opts?.restrictToOwn ?? false;
  const key = `${node.kind}:${node.accountId}:${chainId}:${restrictToOwn ? 'own' : 'all'}`;
  const $cached = nextOptionsCache.get(key);
  if ($cached) return $cached;

  const $store = restrictToOwn
    ? combine(
        {
          contactByAccountId: $contactByAccountId,
          proxies: proxyModel.$proxies,
          allowed: $ownSignerAccountIds,
          resolveName: $nameResolver,
        },
        ({ contactByAccountId, proxies, allowed, resolveName }) =>
          buildNextOptions(
            node,
            contactByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            allowed,
            resolveName,
          ),
      )
    : combine(
        { contactByAccountId: $contactByAccountId, proxies: proxyModel.$proxies, resolveName: $nameResolver },
        ({ contactByAccountId, proxies, resolveName }) =>
          buildNextOptions(
            node,
            contactByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            null,
            resolveName,
          ),
      );
  nextOptionsCache.set(key, $store);

  return $store;
}

const $empty = createStore<PathNextOption[]>([]);

const cachesCleared = createEvent();
const clearCachesFx = createEffect(() => {
  nextOptionsCache.clear();
  sourcesForCache.clear();
});
sample({ clock: cachesCleared, target: clearCachesFx });

export const graphModel = {
  $sourcesFor,
  $nextOptionsForNode,
  $nameResolver,
  $empty,
  cachesCleared,
};
