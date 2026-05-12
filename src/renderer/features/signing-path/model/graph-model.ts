import { type Store, combine, createEffect, createEvent, createStore, sample } from 'effector';

import { type ChainId, SigningType, WalletType } from '@/shared/core';
import { type BackendContact } from '@/shared/core/types/contact';
import { type ProxyAccount, type ProxyType } from '@/shared/core/types/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts, identity } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { accountUtils } from '@/entities/wallet';
import { MAX_PATH_DEPTH } from '../lib/path-validation';

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
  | {
      kind: 'signer';
      accountId: AccountId;
      name: string;
      /**
       * When the signer is reached as a direct proxy delegate (not via a
       * multisig), the proxy type the user picks is recorded back on the source
       * node — same mechanism as for multisig delegates.
       */
      proxyType?: ProxyType;
      disabled?: boolean;
      disabledReason?: string;
    };

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
        // For flexible multisig accounts, `account.accountId` is the pure
        // proxy (the principal), not the multisig itself — the actual multisig
        // lives at `multisigAccountId`. Keying by `accountId` here would
        // incorrectly surface the pure proxy as a direct multisig source,
        // skipping the proxy hop in the signing path. Use the proper multisig
        // accountId so the pure proxy is left to surface as a proxied source
        // via the proxy graph below.
        const multisigAccountId = accountUtils.isFlexibleMultisigAccount(account)
          ? account.multisigAccountId
          : account.accountId;
        result.set(multisigAccountId, {
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
  (list) => new Set(list.filter((a) => a.signingType !== SigningType.WATCH_ONLY).map((a) => a.accountId)),
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
  accountList: AnyAccount[],
  chainId: ChainId,
  allowedSet: Set<AccountId> | null,
  resolveName: AccountNameResolver,
): PathSource[] {
  const sources: PathSource[] = [];
  const seenAccounts = new Set<AccountId>();
  const canReach = allowedSet ? makeReachabilityChecker(multisigByAccountId, allowedSet) : null;

  const hasReachableMultisigDelegate = (proxiedAccountId: AccountId) => {
    const signers = proxies[proxiedAccountId] ?? [];
    return signers.some((p) => {
      if (p.chainId !== chainId) return false;
      if (!multisigByAccountId.has(p.accountId)) return false;
      // restrictToOwn: only count the proxy as a viable source if its signing
      // multisig leads to one of the user's own signers — otherwise the user
      // could pick the source but never complete the path.
      //
      // Note: direct proxied → signer paths (no multisig in between) aren't
      // surfaced here. Drafts route through multisigs for proposal/approval,
      // so a multisig hop is the only viable path shape for source picking.
      // Transfer uses the user's selected wallet as initiator directly, not
      // via this source list.
      if (canReach && !canReach(p.accountId)) return false;
      return true;
    });
  };

  // 1. Own flex multisig facades — surface as proxy sources, not multisig
  //    sources. A flex multisig's `accountId` is a pure proxy delegating to
  //    `multisigAccountId`, so the path it produces is `proxied → multisig →
  //    signer` (same shape as pure proxy + multisig). $multisigByAccountId
  //    already keys the inner multisig; here we register the facade itself.
  for (const account of accountList) {
    if (!accountUtils.isFlexibleMultisigAccount(account)) continue;
    if (account.chainId !== chainId) continue;
    if (seenAccounts.has(account.accountId)) continue;
    if (!hasReachableMultisigDelegate(account.accountId)) continue;

    seenAccounts.add(account.accountId);
    sources.push({
      accountId: account.accountId,
      name: resolveName(account.accountId, chainId),
      isProxy: true,
      walletType: WalletType.FLEXIBLE_MULTISIG,
    });
  }

  // 2. Direct multisig sources — anything in the merged lookup (own +
  //    backend contacts). Iterating the unified map means own multisigs
  //    surface here even when the user hasn't synced them as a contact.
  for (const accountId of multisigByAccountId.keys()) {
    if (seenAccounts.has(accountId)) continue;
    if (canReach && !canReach(accountId)) continue;
    seenAccounts.add(accountId);
    sources.push({
      accountId,
      name: resolveName(accountId, chainId),
      isProxy: false,
      walletType: null,
    });
  }

  // 3. Proxied sources — non-multisig contacts whose proxy graph leads to
  //    a multisig signer (so the path can continue). Iterating contacts
  //    here matches the historical semantics for drafts: surfaces external
  //    proxied accounts the user wants to write drafts for.
  for (const contact of contactByAccountId.values()) {
    if (seenAccounts.has(contact.accountId)) continue;
    if (isMultisigContact(contact)) continue;
    if (!hasReachableMultisigDelegate(contact.accountId)) continue;

    sources.push({
      accountId: contact.accountId,
      name: resolveName(contact.accountId, chainId),
      isProxy: true,
      walletType: null,
    });
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
  const nodeAccountId = node.accountId;

  if (node.kind === 'proxied') {
    const signers = proxies[nodeAccountId] ?? [];
    const seen = new Set<string>();

    return signers
      .filter((p) => p.chainId === chainId)
      .flatMap<PathNextOption>((p) => {
        const dedupKey = `${p.accountId}|${p.proxyType}|${p.delay}`;
        if (seen.has(dedupKey)) return [];
        seen.add(dedupKey);

        // Surface delegates whose proxyType doesn't match the requested set
        // as disabled rows rather than hiding them — the user should see
        // that the delegate exists but understand why they can't pick it.
        const isProxyTypeAllowed = !allowedProxyTypes || allowedProxyTypes.has(p.proxyType);
        const disabledExtras = isProxyTypeAllowed
          ? {}
          : { disabled: true, disabledReason: disabledProxyReason ?? undefined };

        const multisig = multisigByAccountId.get(p.accountId);
        if (multisig) {
          // Reachability still hides delegates that can't possibly complete
          // a path (no own signer downstream); proxyType-mismatch is a
          // softer disable that needs to be visible.
          if (canReach && isProxyTypeAllowed && !canReach(p.accountId)) return [];

          return [
            {
              kind: 'multisig',
              accountId: p.accountId,
              name: resolveName(p.accountId, chainId),
              threshold: multisig.threshold,
              signatoriesCount: multisig.signatories.length,
              proxyType: p.proxyType,
              ...disabledExtras,
            },
          ];
        }

        // Direct signer delegate (proxied → signer, 2-hop path). Hide non-
        // reachable when restrictToOwn is set — a delegate we don't own
        // can't sign and would dead-end the path.
        if (canReach && isProxyTypeAllowed && !canReach(p.accountId)) return [];

        return [
          {
            kind: 'signer',
            accountId: p.accountId,
            name: resolveName(p.accountId, chainId),
            proxyType: p.proxyType,
            ...disabledExtras,
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

type PickDefaultPathParams = {
  initiator: AnyAccount;
  chainId: ChainId;
  multisigByAccountId: MultisigByAccountId;
  proxies: Record<AccountId, ProxyAccount[] | undefined>;
  ownSignerAccountIds: Set<AccountId>;
  resolveName: AccountNameResolver;
  allowedProxyTypes?: readonly string[];
  /**
   * When set, the BFS terminates only at this specific signer accountId. Used
   * to translate a dropdown signatory pick back into a concrete signing path.
   * Without it, the first reachable own signer wins.
   */
  targetSigner?: AccountId;
};

/**
 * Walks the graph from `initiator` picking the first valid `PathNextOption` at
 * each step until reaching a signer. Reuses `buildNextOptions` so the default
 * selection matches exactly what StepPath would offer the user — same
 * reachability, same proxyType filtering, same dedup. Returns [] when the
 * initiator is a regular account or no own-signer-terminating branch exists.
 */
function pickDefaultPath({
  initiator,
  chainId,
  multisigByAccountId,
  proxies,
  ownSignerAccountIds,
  resolveName,
  allowedProxyTypes,
  targetSigner,
}: PickDefaultPathParams): PathNode[] {
  const isMultisig = accountUtils.isAnyMultisigAccount(initiator);
  const isProxied = accountUtils.isProxiedAccount(initiator);
  if (!isMultisig && !isProxied) return [];

  const allowedProxyTypeSet = allowedProxyTypes ? new Set<string>(allowedProxyTypes) : null;
  // Reachability set: when targetSigner is set, restrict to paths reaching
  // exactly that signer; otherwise fall back to any own signer.
  const reachabilitySet = targetSigner ? new Set<AccountId>([targetSigner]) : ownSignerAccountIds;

  // Flex multisig's facade is a pure proxy delegating to an inner multisig —
  // start the path at `proxied` so BFS hops via the proxy graph into the
  // multisig, matching the structure the chain actually requires
  // (proxy.proxy(real=facade, call=...) signed by the multisig).
  const isFlexibleMultisig = accountUtils.isFlexibleMultisigAccount(initiator);
  let firstNode: PathNode;
  if (isProxied || isFlexibleMultisig) {
    firstNode = { kind: 'proxied', accountId: initiator.accountId };
  } else {
    firstNode = { kind: 'multisig', accountId: initiator.accountId };
  }

  const path: PathNode[] = [firstNode];

  while (path.length < MAX_PATH_DEPTH) {
    const last = path[path.length - 1]!;
    if (last.kind === 'signer') return path;

    const options = buildNextOptions(
      last,
      multisigByAccountId,
      proxies,
      chainId,
      reachabilitySet,
      allowedProxyTypeSet,
      null,
      resolveName,
    );
    const next = options.find((opt) => opt.kind !== 'multisig' || !opt.disabled);
    if (!next) return [];

    if (next.proxyType && path[0]!.kind === 'proxied') {
      // Mirror StepPath: when stepping from a proxied source into either a
      // multisig delegate or a direct signer delegate, the chosen proxyType
      // is recorded on the source node.
      path[0] = { ...path[0]!, proxyType: next.proxyType };
    }

    path.push({ kind: next.kind, accountId: next.accountId });
  }

  return path[path.length - 1]!.kind === 'signer' ? path : [];
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
          accountList: accounts.$list,
          allowed: $ownSignerAccountIds,
          resolveName: $nameResolver,
        },
        ({ contactByAccountId, multisigByAccountId, proxies, accountList, allowed, resolveName }) =>
          buildSources(
            contactByAccountId,
            multisigByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            accountList,
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
          accountList: accounts.$list,
          resolveName: $nameResolver,
        },
        ({ contactByAccountId, multisigByAccountId, proxies, accountList, resolveName }) =>
          buildSources(
            contactByAccountId,
            multisigByAccountId,
            proxies as Record<AccountId, ProxyAccount[] | undefined>,
            accountList,
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

const defaultPathCache = new Map<string, Store<PathNode[]>>();

function $defaultPathFor(
  initiatorStore: Store<AnyAccount | null>,
  chainIdStore: Store<ChainId | null>,
  opts?: GraphOptions,
): Store<PathNode[]> {
  const allowedProxyTypes = opts?.allowedProxyTypes;
  // Two callers passing the same input stores + opts share one combine — keeps
  // graph traversal cheap when consumers re-render. Identity of the input
  // stores is part of the key so different forms get distinct caches.
  const cacheKey = `${initiatorStore.shortName}:${chainIdStore.shortName}:${allowedProxyTypes ? [...allowedProxyTypes].sort().join(',') : '*'}`;
  const $cached = defaultPathCache.get(cacheKey);
  if ($cached) return $cached;

  const $store = combine(
    {
      initiator: initiatorStore,
      chainId: chainIdStore,
      multisigByAccountId: $multisigByAccountId,
      proxies: proxyModel.$proxies,
      ownSignerAccountIds: $ownSignerAccountIds,
      resolveName: $nameResolver,
    },
    ({ initiator, chainId, multisigByAccountId, proxies, ownSignerAccountIds, resolveName }): PathNode[] => {
      if (!initiator || !chainId) return [];

      return pickDefaultPath({
        initiator,
        chainId,
        multisigByAccountId,
        proxies: proxies as Record<AccountId, ProxyAccount[] | undefined>,
        ownSignerAccountIds,
        resolveName,
        allowedProxyTypes,
      });
    },
  );
  defaultPathCache.set(cacheKey, $store);

  return $store;
}

const $empty = createStore<PathNextOption[]>([]);

// `cachesCleared` is the existing API — clears ALL three caches. New code
// should prefer `nextOptionsCacheCleared` because the sources / default-path
// caches are bounded (chainId × opts × initiator-store-identity); only the
// node-keyed `nextOptionsCache` grows unboundedly with user navigation.
const cachesCleared = createEvent();
const nextOptionsCacheCleared = createEvent();
const clearCachesFx = createEffect(() => {
  nextOptionsCache.clear();
  sourcesForCache.clear();
  defaultPathCache.clear();
});
const clearNextOptionsCacheFx = createEffect(() => {
  nextOptionsCache.clear();
});
sample({ clock: cachesCleared, target: clearCachesFx });
sample({ clock: nextOptionsCacheCleared, target: clearNextOptionsCacheFx });

export const graphModel = {
  $sourcesFor,
  $nextOptionsForNode,
  $defaultPathFor,
  $nameResolver,
  $multisigByAccountId,
  $ownSignerAccountIds,
  $empty,
  cachesCleared,
  nextOptionsCacheCleared,
  pickDefaultPath,
};
