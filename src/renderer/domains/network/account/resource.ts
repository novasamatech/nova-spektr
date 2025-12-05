import { attach, combine, createStore } from 'effector';

import { type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { identity } from '../identity/store';

import { accountService } from './service';
import { accounts } from './store';

export type AccountNameParams = {
  accountId: AccountId;
  chain?: Chain | null;
  title?: string;
};

export type WalletNameParams = {
  wallet: Wallet;
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

const $accountNameCache = createStore<NameCache>({});
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
