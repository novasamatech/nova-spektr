import { type StoreValue, combine, createStore, sample } from 'effector';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
// The entity barrel re-exports contact UI, which reaches back into
// domains/network through shared/ui-entities. Importing the model directly keeps
// that cycle out of this module's graph, so contacts are always defined here.
// eslint-disable-next-line boundaries/entry-point
import { contactModel } from '@/entities/contact/model/contact-model';
import { networkModel } from '@/entities/network';
import { identity } from '../identity/store';

import { accountService } from './service';
import { accounts } from './store';
import { type AnyAccount } from './types';

export type AccountNameParams = {
  accountId: AccountId;
  chain?: Chain | null;
  title?: string;
  /**
   * A name to fall back to (typically the owning wallet's name) when the
   * account resolves to nothing better than its stored name or short address.
   */
  fallbackName?: string;
  /**
   * The specific account this name is being resolved for, when the caller
   * already knows it (e.g. resolving names for a known list of accounts rather
   * than an arbitrary accountId). Passed through to
   * accountService.resolveAccountName to avoid re-deriving it, which can't
   * disambiguate accounts that share an accountId across wallets.
   */
  account?: AnyAccount;
};

export type WalletNameParams = {
  wallet: Wallet;
};

export type AccountsNameParams = {
  accounts: AnyAccount[];
  chain?: Chain | null;
};

type NameCache = Record<string, string>;

const $nameSources = combine({
  contacts: contactModel.$contacts,
  identities: identity.$list,
  chains: networkModel.$chains,
  accounts: accounts.$list,
});

type NameSources = StoreValue<typeof $nameSources>;

/**
 * Tracked params keep the account object they were requested with, and a rename
 * keeps its cache key — so resolve from the account as it is now, not from that
 * snapshot, or the refresh keeps writing the old name back.
 */
function createAccountNameResolver(sources: NameSources) {
  const liveAccounts = new Map(sources.accounts.map(account => [account.id, account]));

  return (params: AccountNameParams): string =>
    accountService.resolveAccountName({
      accountId: params.accountId,
      chain: params.chain,
      title: params.title,
      fallbackName: params.fallbackName,
      account: params.account && (liveAccounts.get(params.account.id) ?? params.account),
      ...sources,
    });
}

function resolveWalletNameFromSources({ wallet }: WalletNameParams, sources: NameSources): string {
  return accountService.resolveWalletName({ wallet, ...sources });
}

/** Returns a copy of `cache` with every entry recomputed by `resolve`. */
function withResolvedNames<T>(cache: NameCache, entries: [key: string, params: T][], resolve: (params: T) => string) {
  const next = { ...cache };
  for (const [key, params] of entries) {
    next[key] = resolve(params);
  }
  return next;
}

const toAccountNameEntry = (params: AccountNameParams): [string, AccountNameParams] => [
  createAccountNameCacheKey(params),
  params,
];

const toWalletNameEntry = (wallet: Wallet): [string, WalletNameParams] => [
  createWalletNameCacheKey({ wallet }),
  { wallet },
];

function toAccountsNameParams({ accounts, chain }: AccountsNameParams): AccountNameParams[] {
  return accounts.map(account => ({ accountId: account.accountId, chain, account }));
}

export const createAccountNameCacheKey = ({
  accountId,
  chain,
  title,
  fallbackName,
  account,
}: AccountNameParams): string => {
  const chainKey = chain?.chainId ?? 'anyChain';
  const prefixKey = chain ? `${chain.addressPrefix}` : 'defaultPrefix';
  // accountId alone collides when different accounts (e.g. across wallets) share
  // it — key on the specific account's own id when the caller knows it, so each
  // gets its own cache slot instead of clobbering one another's resolved name.
  const identityKey = account?.id ?? accountId;

  return `${identityKey}:${chainKey}:${prefixKey}:${title ?? ''}:${fallbackName ?? ''}`;
};

export const createWalletNameCacheKey = ({ wallet }: WalletNameParams): string => {
  const accountsKey = wallet.accounts
    .map(account => {
      const isChainAccount = accountService.isChainAccount(account);
      const chainKey = isChainAccount ? account.chainId : 'anyChain';
      return `${account.accountId}:${chainKey}`;
    })
    .join(',');

  const rootAccountId = 'rootAccountId' in wallet ? wallet.rootAccountId : null;

  return [wallet.id, wallet.name, wallet.type, rootAccountId ?? 'none', accountsKey].join(':');
};

export const $accountNameCache = createStore<NameCache>({});
export const $walletNameCache = createStore<NameCache>({});

// The resources below only drive request bookkeeping (keys, pending, start /
// stop). Names are never resolved inside the request: a request reads its
// sources when it starts and completes microtasks later, so an address book
// landing in between used to be dropped and the stale short address written
// over it. Resolution happens on `push` instead, from the sources as they are
// at that moment (see "Resolve on push" below).
const noNameRequest = () => true;

export const accountNameResource = createQueryResource<AccountNameParams>({
  key: createAccountNameCacheKey,
})
  .request(noNameRequest)
  .cache({ store: $accountNameCache, map: cache => cache })
  .build();

type WalletsNameParams = {
  wallets: Wallet[];
};

export const walletsNameResource = createQueryResource<WalletsNameParams>({
  // Key on each wallet's cache key, not its id: a wallet whose name or accounts
  // change gets a new cache key, and only a new request key makes the consumer
  // request (and push) it. Keyed on ids, an unchanged wallet set would never
  // resolve the new entry and the row would fall back to the stored name.
  key: ({ wallets }) =>
    wallets
      .map(wallet => createWalletNameCacheKey({ wallet }))
      .sort()
      .join('|'),
})
  .request(noNameRequest)
  .cache({ store: $walletNameCache, map: cache => cache })
  .build();

export const accountsNameResource = createQueryResource<AccountsNameParams>({
  key: ({ accounts, chain }) => {
    const chainKey = chain?.chainId ?? 'anyChain';
    // Key on each account's own id, not accountId — two different account lists
    // sharing an accountId (e.g. across wallets) must not collide here. A
    // collision would make the second request reuse the first's cached
    // response (see requestsCache.get in createQueryResource), which skips its
    // push, so the second list's accounts would never get their own entries.
    const accountKeys = accounts
      .map(a => a.id)
      .sort()
      .join(',');
    return `${chainKey}:${accountKeys}`;
  },
})
  .request(noNameRequest)
  .cache({ store: $accountNameCache, map: cache => cache })
  .build();

// Resolve on push: write each requested name from the live sources.
sample({
  clock: accountNameResource.push,
  source: { cache: $accountNameCache, sources: $nameSources },
  fn: ({ cache, sources }, { params }) =>
    withResolvedNames(cache, [toAccountNameEntry(params)], createAccountNameResolver(sources)),
  target: $accountNameCache,
});

sample({
  clock: accountsNameResource.push,
  source: { cache: $accountNameCache, sources: $nameSources },
  fn: ({ cache, sources }, { params }) =>
    withResolvedNames(cache, toAccountsNameParams(params).map(toAccountNameEntry), createAccountNameResolver(sources)),
  target: $accountNameCache,
});

sample({
  clock: walletsNameResource.push,
  source: { cache: $walletNameCache, sources: $nameSources },
  fn: ({ cache, sources }, { params }) =>
    withResolvedNames(cache, params.wallets.map(toWalletNameEntry), p => resolveWalletNameFromSources(p, sources)),
  target: $walletNameCache,
});

// useResource only re-fetches a resource when its request params change, so
// once an account/wallet name is resolved and cached it stays cached even
// after the data it was resolved from changes (e.g. reconnecting the backend
// address book, editing a local contact, an identity resolving, or an
// account/wallet rename) — a mounted consumer (e.g. an open Transfer modal)
// would otherwise show a stale name until it remounts. Track the params
// behind every resolved cache entry, then recompute them all whenever any of
// that data changes so mounted views pick up the update live.
//
// The cap bounds how many params stay tracked: without it the map grows forever
// (full Wallet snapshots for wallet names), since nothing currently signals when
// a consumer unmounts.
const MAX_TRACKED_NAME_PARAMS = 500;

/**
 * Adds (or re-adds) entries and evicts the least recently used ones above
 * `limit`. Re-adding moves an entry to the end, so a name that keeps being
 * requested is never the one dropped — an evicted entry stops being recomputed
 * and would otherwise freeze on whatever it last resolved to.
 */
export function trackNameParams<T>(
  state: Record<string, T>,
  entries: [key: string, params: T][],
  limit: number = MAX_TRACKED_NAME_PARAMS,
): Record<string, T> {
  const next = { ...state };

  for (const [key, params] of entries) {
    delete next[key];
    next[key] = params;
  }

  const keys = Object.keys(next);
  for (const key of keys.slice(0, Math.max(0, keys.length - limit))) {
    delete next[key];
  }

  return next;
}

const $accountNameParams = createStore<Record<string, AccountNameParams>>({});

sample({
  clock: accountNameResource.push,
  source: $accountNameParams,
  fn: (state, { params }) => trackNameParams(state, [toAccountNameEntry(params)]),
  target: $accountNameParams,
});

sample({
  clock: accountsNameResource.push,
  source: $accountNameParams,
  fn: (state, { params }) => trackNameParams(state, toAccountsNameParams(params).map(toAccountNameEntry)),
  target: $accountNameParams,
});

const $walletNameParams = createStore<Record<string, WalletNameParams>>({});

sample({
  clock: walletsNameResource.push,
  source: $walletNameParams,
  fn: (state, { params }) => trackNameParams(state, params.wallets.map(toWalletNameEntry)),
  target: $walletNameParams,
});

// Clocked on the underlying stores, not on the derived $nameSources: a derived
// store as a sample clock does not track emissions per scope under fork().
const nameSourceUpdated = [contactModel.$contacts, identity.$list, accounts.$list, networkModel.$chains];

// Keeps already-resolved names fresh when a *source* of resolution changes.
// Pushes are deliberately not clocks here: each push resolves its own params
// (see "Resolve on push"), and re-resolving every tracked param on every push
// would be quadratic (mounting N rows that each hold a name hook costs N pushes
// × N params).
sample({
  clock: nameSourceUpdated,
  source: { accountParams: $accountNameParams, cache: $accountNameCache, sources: $nameSources },
  filter: ({ accountParams }) => Object.keys(accountParams).length > 0,
  fn: ({ accountParams, cache, sources }) =>
    withResolvedNames(cache, Object.entries(accountParams), createAccountNameResolver(sources)),
  target: $accountNameCache,
});

sample({
  clock: nameSourceUpdated,
  source: { walletParams: $walletNameParams, cache: $walletNameCache, sources: $nameSources },
  filter: ({ walletParams }) => Object.keys(walletParams).length > 0,
  fn: ({ walletParams, cache, sources }) =>
    withResolvedNames(cache, Object.entries(walletParams), p => resolveWalletNameFromSources(p, sources)),
  target: $walletNameCache,
});
