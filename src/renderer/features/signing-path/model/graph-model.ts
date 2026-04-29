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
import { accountUtils } from '@/entities/wallet';

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
      /**
       * Set when the option is shown but cannot be picked — e.g. a proxy
       * delegate whose proxyType doesn't allow the operation we're building. UI
       * should render the row but disable the click and explain why.
       */
      disabled?: boolean;
      disabledReason?: string;
    }
  | { kind: 'signer'; accountId: AccountId; name: string };

const isMultisigContact = (c: BackendContact): boolean =>
  Array.isArray(c.signatories) && c.signatories.length > 0 && typeof c.threshold === 'number' && c.threshold >= 1;

type MultisigInfo = {
  signatories: AccountId[];
  threshold: number;
};

type MultisigByAccountId = Map<AccountId, MultisigInfo>;
type ContactsByAccountId = Map<AccountId, BackendContact>;

// Backend-contact lookup is still used by buildSources to surface external
// proxied accounts (non-multisig contacts whose proxy graph leads to a
// multisig signer). Multisig metadata is now sourced from $multisigByAccountId
// — see below — which merges contacts with own multisig wallets.
const $contactByAccountId = contactModel.$backendContacts.map<ContactsByAccountId>(
  (contacts) => new Map(contacts.map((c) => [c.accountId, c])),
);

// Unified "is this accountId a multisig and what are its signatories?" lookup
// merging two sources: backend contacts (richer multisig metadata, including
// for multisigs the user doesn't own) and accounts.$list (own multisig
// wallets, which may not have a corresponding contact entry — e.g. an Assets
// proxy delegate). Without this merge, an own multisig that isn't synced as
// a contact wouldn't surface in the picker at all.
//
// When both sources have the same accountId, contact data wins because it's
// the canonical multisig structure and stays in sync with the backend.
const $multisigByAccountId = combine(
  contactModel.$backendContacts,
  accounts.$list,
  (contacts, accountList): MultisigByAccountId => {
    const result = new Map<AccountId, MultisigInfo>();

    for (const account of accountList) {
      if (accountUtils.isAnyMultisigAccount(account)) {
        result.set(account.accountId, {
          signatories: account.signatories.map((s) => s.accountId),
          threshold: account.threshold,
        });
      }
    }

    for (const contact of contacts) {
      if (isMultisigContact(contact)) {
        result.set(contact.accountId, {
          signatories: (contact.signatories ?? []) as AccountId[],
          threshold: contact.threshold!,
        });
      }
    }

    return result;
  },
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
 * Build a memoized "can a path that traverses multisigs starting at `id` reach
 * an own signer?" predicate. Walks the multisig graph DFS through nested
 * signatories, with cycle protection.
 *
 * `allowedSet` is treated as terminal: any accountId in the set short-circuits
 * to true, no matter whether it has a multisig entry. Non-multisig accountIds
 * outside the set return false (dead end).
 */
function makeReachabilityChecker(multisigByAccountId: MultisigByAccountId, allowedSet: Set<AccountId>) {
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
    const multisig = multisigByAccountId.get(id);
    let result = false;
    if (multisig) {
      result = multisig.signatories.some((sig) => check(sig, visiting));
    }
    visiting.delete(id);
    memo.set(id, result);

    return result;
  };

  return (id: AccountId) => check(id, new Set());
}

function buildSources(
  contactByAccountId: ContactsByAccountId,
  multisigByAccountId: MultisigByAccountId,
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
  allowedSet: Set<AccountId> | null,
  resolveName: AccountNameResolver,
): PathSource[] {
  const sources: PathSource[] = [];
  const seenAccounts = new Set<AccountId>();
  const canReach = allowedSet ? makeReachabilityChecker(multisigByAccountId, allowedSet) : null;

  // 1. Direct multisig sources — anything in the merged lookup (own +
  //    backend contacts). Iterating the unified map means own multisigs
  //    surface here even when the user hasn't synced them as a contact.
  for (const accountId of multisigByAccountId.keys()) {
    if (canReach && !canReach(accountId)) continue;
    seenAccounts.add(accountId);
    sources.push({
      accountId,
      name: resolveName(accountId, chainId),
      isProxy: false,
      walletType: null,
    });
  }

  // 2. Proxied sources — non-multisig contacts whose proxy graph leads to
  //    a multisig signer (so the path can continue). Iterating contacts
  //    here matches the historical semantics for drafts: surfaces external
  //    proxied accounts the user wants to write drafts for.
  for (const contact of contactByAccountId.values()) {
    if (seenAccounts.has(contact.accountId)) continue;
    if (isMultisigContact(contact)) continue;

    const signers = proxies[contact.accountId] ?? [];
    const hasMultisigSigner = signers.some((p) => {
      if (p.chainId !== chainId) return false;
      if (!multisigByAccountId.has(p.accountId)) return false;
      // restrictToOwn: only count the proxy as a viable source if its signing
      // multisig leads to one of the user's own signers — otherwise the user
      // could pick the source but never complete the path.
      if (canReach && !canReach(p.accountId)) return false;

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
  multisigByAccountId: MultisigByAccountId,
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
  allowedSet: Set<AccountId> | null,
  allowedProxyTypes: ReadonlySet<string> | null,
  disabledProxyReason: string | null,
  resolveName: AccountNameResolver,
): PathNextOption[] {
  if (node.kind === 'signer') return [];

  const canReach = allowedSet ? makeReachabilityChecker(multisigByAccountId, allowedSet) : null;
  const nodeAccountId = node.accountId as AccountId;

  if (node.kind === 'proxied') {
    const signers = proxies[nodeAccountId] ?? [];
    const seen = new Set<string>();

    return signers
      .filter((p) => p.chainId === chainId)
      .flatMap((p) => {
        const multisig = multisigByAccountId.get(p.accountId);
        if (!multisig) return [];

        const dedupKey = `${p.accountId}|${p.proxyType}|${p.delay}`;
        if (seen.has(dedupKey)) return [];
        seen.add(dedupKey);

        // Surface delegates whose proxyType doesn't match the requested set
        // as disabled rows rather than hiding them — the user should see
        // that the delegate exists but understand why they can't pick it.
        const isProxyTypeAllowed = !allowedProxyTypes || allowedProxyTypes.has(p.proxyType);

        // Reachability still hides delegates that can't possibly complete a
        // path (no own signer downstream); proxyType-mismatch is a softer
        // disable that needs to be visible.
        if (canReach && isProxyTypeAllowed && !canReach(p.accountId)) return [];

        return [
          {
            kind: 'multisig' as const,
            accountId: p.accountId,
            name: resolveName(p.accountId, chainId),
            threshold: multisig.threshold,
            signatoriesCount: multisig.signatories.length,
            proxyType: p.proxyType,
            ...(isProxyTypeAllowed
              ? {}
              : {
                  disabled: true,
                  disabledReason: disabledProxyReason ?? undefined,
                }),
          },
        ];
      });
  }

  const multisig = multisigByAccountId.get(nodeAccountId);
  if (!multisig) return [];

  return multisig.signatories.flatMap<PathNextOption>((sigAccountId) => {
    if (canReach && !canReach(sigAccountId)) return [];
    const nestedMultisig = multisigByAccountId.get(sigAccountId);

    if (nestedMultisig) {
      return [
        {
          kind: 'multisig',
          accountId: sigAccountId,
          name: resolveName(sigAccountId, chainId),
          threshold: nestedMultisig.threshold,
          signatoriesCount: nestedMultisig.signatories.length,
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
  /**
   * When set, multisig delegates whose proxyType isn't in this list are still
   * surfaced in the picker but marked `disabled` with `disabledReason` — users
   * see the delegate exists, with a tooltip explaining why they can't pick it.
   * Use for flows that target a specific extrinsic (e.g. edit flexible multisig
   * builds `proxy.addProxy`, which only "Any" allows).
   */
  allowedProxyTypes?: readonly string[];
  /**
   * Tooltip copy attached to disabled options when their proxyType isn't in
   * `allowedProxyTypes`. Caller-provided so the message can reference the
   * specific operation ("can't add new proxies", "can't transfer", …).
   */
  disabledProxyReason?: string;
};

const sourcesForCache = new Map<string, Store<PathSource[]>>();

const optsCacheSegment = (opts?: GraphOptions): string => {
  const restrict = opts?.restrictToOwn ? 'own' : 'all';
  const allowed = opts?.allowedProxyTypes ? `[${[...opts.allowedProxyTypes].sort().join(',')}]` : '*';
  // disabledProxyReason is display-only and doesn't affect what's returned,
  // so it's intentionally excluded from the cache key.
  return `${restrict}:${allowed}`;
};

function $sourcesFor(chainId: ChainId, opts?: GraphOptions): Store<PathSource[]> {
  const restrictToOwn = opts?.restrictToOwn ?? false;
  const cacheKey = `${chainId}:${optsCacheSegment(opts)}`;
  const $cached = sourcesForCache.get(cacheKey);
  if ($cached) return $cached;

  const $store = restrictToOwn
    ? combine(
        {
          contactByAccountId: $contactByAccountId,
          multisigByAccountId: $multisigByAccountId,
          proxies: proxyModel.$proxies,
          allowed: $ownSignerAccountIds,
          resolveName: $nameResolver,
        },
        ({ contactByAccountId, multisigByAccountId, proxies, allowed, resolveName }) =>
          buildSources(
            contactByAccountId,
            multisigByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            allowed,
            resolveName,
          ),
      )
    : combine(
        {
          contactByAccountId: $contactByAccountId,
          multisigByAccountId: $multisigByAccountId,
          proxies: proxyModel.$proxies,
          resolveName: $nameResolver,
        },
        ({ contactByAccountId, multisigByAccountId, proxies, resolveName }) =>
          buildSources(
            contactByAccountId,
            multisigByAccountId,
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
  const allowedProxyTypes = opts?.allowedProxyTypes ? new Set(opts.allowedProxyTypes) : null;
  const disabledProxyReason = opts?.disabledProxyReason ?? null;
  const key = `${node.kind}:${node.accountId}:${chainId}:${optsCacheSegment(opts)}`;
  const $cached = nextOptionsCache.get(key);
  if ($cached) return $cached;

  const $store = restrictToOwn
    ? combine(
        {
          multisigByAccountId: $multisigByAccountId,
          proxies: proxyModel.$proxies,
          allowed: $ownSignerAccountIds,
          resolveName: $nameResolver,
        },
        ({ multisigByAccountId, proxies, allowed, resolveName }) =>
          buildNextOptions(
            node,
            multisigByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            allowed,
            allowedProxyTypes,
            disabledProxyReason,
            resolveName,
          ),
      )
    : combine(
        { multisigByAccountId: $multisigByAccountId, proxies: proxyModel.$proxies, resolveName: $nameResolver },
        ({ multisigByAccountId, proxies, resolveName }) =>
          buildNextOptions(
            node,
            multisigByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            chainId,
            null,
            allowedProxyTypes,
            disabledProxyReason,
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
