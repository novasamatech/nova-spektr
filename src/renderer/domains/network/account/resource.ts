import { attach, combine, createStore, sample } from 'effector';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { contactModel } from '@/entities/contact';
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

const getContactsStore = () => contactModel?.$contacts ?? createStore([]);

const getNameResolverSource = () => {
  return combine({
    contacts: getContactsStore(),
    identities: identity.$list,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  });
};

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

export const accountNameResource = createQueryResource<AccountNameParams>({
  key: createAccountNameCacheKey,
})
  .request(
    attach({
      source: getNameResolverSource(),
      effect: ({ contacts, identities, chains, accounts }, params) => {
        return accountService.resolveAccountName({
          accountId: params.accountId,
          chain: params.chain,
          title: params.title,
          fallbackName: params.fallbackName,
          account: params.account,
          contacts,
          identities,
          chains,
          accounts,
        });
      },
    }),
  )
  .cache({
    store: $accountNameCache,
    map(cache, result, params) {
      const key = createAccountNameCacheKey(params);

      return {
        ...cache,
        [key]: result,
      };
    },
  })
  .build();

type WalletsNameParams = {
  wallets: Wallet[];
};

export const walletsNameResource = createQueryResource<WalletsNameParams>({
  key: ({ wallets }) =>
    wallets
      .map(w => w.id)
      .sort()
      .join(','),
})
  .request(
    attach({
      source: getNameResolverSource(),
      effect: ({ contacts, identities, chains, accounts }, { wallets }) => {
        const result: Record<string, string> = {};

        for (const wallet of wallets) {
          const key = createWalletNameCacheKey({ wallet });
          const name = accountService.resolveWalletName({
            wallet,
            contacts,
            identities,
            chains,
            accounts,
          });
          result[key] = name;
        }

        return result;
      },
    }),
  )
  .cache({
    store: $walletNameCache,
    map(cache, result) {
      return {
        ...cache,
        ...result,
      };
    },
  })
  .build();

export const accountsNameResource = createQueryResource<AccountsNameParams>({
  key: ({ accounts, chain }) => {
    const chainKey = chain?.chainId ?? 'anyChain';
    // Key on each account's own id, not accountId — two different account lists
    // sharing an accountId (e.g. across wallets) must not collide here. A
    // collision would make the second request reuse the first's cached
    // response wholesale (see requestsCache.get in createQueryResource), and
    // since that response is keyed per-account by createAccountNameCacheKey,
    // the second list's accounts would never get their own entries written.
    const accountKeys = accounts
      .map(a => a.id)
      .sort()
      .join(',');
    return `${chainKey}:${accountKeys}`;
  },
})
  .request(
    attach({
      source: getNameResolverSource(),
      effect: ({ contacts, identities, chains, accounts: allAccounts }, { accounts, chain }) => {
        const result: Record<string, string> = {};

        for (const account of accounts) {
          const key = createAccountNameCacheKey({
            accountId: account.accountId,
            chain,
            title: undefined,
            account,
          });
          const name = accountService.resolveAccountName({
            accountId: account.accountId,
            chain,
            title: undefined,
            account,
            contacts,
            identities,
            chains,
            accounts: allAccounts,
          });
          result[key] = name;
        }

        return result;
      },
    }),
  )
  .cache({
    store: $accountNameCache,
    map(cache, result) {
      return {
        ...cache,
        ...result,
      };
    },
  })
  .build();

// useResource only re-fetches a resource when its request params change, so
// once an account/wallet name is resolved and cached it stays cached even
// after the data it was resolved from changes (e.g. reconnecting the backend
// address book, editing a local contact, an identity resolving, or an
// account/wallet rename) — a mounted consumer (e.g. an open Transfer modal)
// would otherwise show a stale name until it remounts. Track the params
// behind every resolved cache entry, then recompute them all whenever any of
// that data changes so mounted views pick up the update live.
const $contacts = getContactsStore();

// Bounds how many resolved-name params stay tracked for live recompute.
// Without a cap this grows forever (full Wallet snapshots for wallet names),
// since nothing currently signals when a consumer unmounts.
const MAX_TRACKED_NAME_PARAMS = 500;

function withCapacityLimit<T>(next: Record<string, T>, limit: number): Record<string, T> {
  const keys = Object.keys(next);
  const excess = keys.length - limit;
  if (excess <= 0) {
    return next;
  }

  for (const key of keys.slice(0, excess)) {
    delete next[key];
  }

  return next;
}

const $accountNameParams = createStore<Record<string, AccountNameParams>>({});

sample({
  clock: accountNameResource.push,
  source: $accountNameParams,
  fn: (state, { params }) =>
    withCapacityLimit({ ...state, [createAccountNameCacheKey(params)]: params }, MAX_TRACKED_NAME_PARAMS),
  target: $accountNameParams,
});

sample({
  clock: accountsNameResource.push,
  source: $accountNameParams,
  fn: (state, { params }) => {
    const next = { ...state };

    for (const account of params.accounts) {
      const accountParams: AccountNameParams = { accountId: account.accountId, chain: params.chain, account };
      next[createAccountNameCacheKey(accountParams)] = accountParams;
    }

    return withCapacityLimit(next, MAX_TRACKED_NAME_PARAMS);
  },
  target: $accountNameParams,
});

const $walletNameParams = createStore<Record<string, WalletNameParams>>({});

sample({
  clock: walletsNameResource.push,
  source: $walletNameParams,
  fn: (state, { params }) => {
    const next = { ...state };

    for (const wallet of params.wallets) {
      const walletParams: WalletNameParams = { wallet };
      next[createWalletNameCacheKey(walletParams)] = walletParams;
    }

    return withCapacityLimit(next, MAX_TRACKED_NAME_PARAMS);
  },
  target: $walletNameParams,
});

// Keeps already-resolved names fresh when a *source* of resolution changes.
// The resources' own pushes are deliberately not clocks here: a push already
// carries the name resolved from these very sources and writes it to the cache
// itself, so re-resolving on push is pure duplicate work — and quadratic, since
// every push re-resolves every tracked param (mounting N rows that each hold a
// name hook then costs N pushes × N params).
sample({
  clock: [$contacts, identity.$list, accounts.$list, networkModel.$chains],
  source: {
    accountParams: $accountNameParams,
    cache: $accountNameCache,
    contacts: $contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  filter: ({ accountParams }) => Object.keys(accountParams).length > 0,
  fn: ({ accountParams, cache, contacts, identities, chains, accounts: allAccounts }) => {
    const next = { ...cache };

    for (const [key, params] of Object.entries(accountParams)) {
      next[key] = accountService.resolveAccountName({
        accountId: params.accountId,
        chain: params.chain,
        title: params.title,
        fallbackName: params.fallbackName,
        account: params.account,
        contacts,
        identities,
        chains,
        accounts: allAccounts,
      });
    }

    return next;
  },
  target: $accountNameCache,
});

sample({
  clock: [$contacts, identity.$list, accounts.$list, networkModel.$chains],
  source: {
    walletParams: $walletNameParams,
    cache: $walletNameCache,
    contacts: $contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  filter: ({ walletParams }) => Object.keys(walletParams).length > 0,
  fn: ({ walletParams, cache, contacts, identities, chains, accounts: allAccounts }) => {
    const next = { ...cache };

    for (const [key, params] of Object.entries(walletParams)) {
      next[key] = accountService.resolveWalletName({
        wallet: params.wallet,
        contacts,
        identities,
        chains,
        accounts: allAccounts,
      });
    }

    return next;
  },
  target: $walletNameCache,
});
