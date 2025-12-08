import { attach, combine, createStore } from 'effector';

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
      const chainKey = 'chainId' in account && account.chainId ? account.chainId : 'anyChain';
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
