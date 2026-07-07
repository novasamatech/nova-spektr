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

export const createAccountNameCacheKey = ({ accountId, chain, title }: AccountNameParams): string => {
  const chainKey = chain?.chainId ?? 'anyChain';
  const prefixKey = chain ? `${chain.addressPrefix}` : 'defaultPrefix';

  return `${accountId}:${chainKey}:${prefixKey}:${title ?? ''}`;
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
    const accountIds = accounts
      .map(a => a.accountId)
      .sort()
      .join(',');
    return `${chainKey}:${accountIds}`;
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
          });
          const name = accountService.resolveAccountName({
            accountId: account.accountId,
            chain,
            title: undefined,
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
// address book, or editing a local contact) — a mounted consumer (e.g. an
// open Transfer modal) would otherwise show a stale name until it remounts.
// Track the params behind every resolved cache entry, then recompute them
// all whenever contacts change so mounted views pick up the update live.
const $contacts = getContactsStore();

const $accountNameParams = createStore<Record<string, AccountNameParams>>({});

sample({
  clock: accountNameResource.push,
  source: $accountNameParams,
  fn: (state, { params }) => ({ ...state, [createAccountNameCacheKey(params)]: params }),
  target: $accountNameParams,
});

sample({
  clock: accountsNameResource.push,
  source: $accountNameParams,
  fn: (state, { params }) => {
    const next = { ...state };

    for (const account of params.accounts) {
      const accountParams: AccountNameParams = { accountId: account.accountId, chain: params.chain };
      next[createAccountNameCacheKey(accountParams)] = accountParams;
    }

    return next;
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

    return next;
  },
  target: $walletNameParams,
});

sample({
  clock: $contacts,
  source: {
    accountParams: $accountNameParams,
    contacts: $contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  filter: ({ accountParams }) => Object.keys(accountParams).length > 0,
  fn: ({ accountParams, contacts, identities, chains, accounts: allAccounts }) => {
    const next: NameCache = {};

    for (const [key, params] of Object.entries(accountParams)) {
      next[key] = accountService.resolveAccountName({
        accountId: params.accountId,
        chain: params.chain,
        title: params.title,
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
  clock: $contacts,
  source: {
    walletParams: $walletNameParams,
    contacts: $contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  filter: ({ walletParams }) => Object.keys(walletParams).length > 0,
  fn: ({ walletParams, contacts, identities, chains, accounts: allAccounts }) => {
    const next: NameCache = {};

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
