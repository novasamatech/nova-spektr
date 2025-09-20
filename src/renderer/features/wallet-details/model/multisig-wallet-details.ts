import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type Contact, type ProxyAccount, type Wallet } from '@/shared/core';
import { dictionary, keys, nullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const $multisigAccount = $wallet.map(wallet => {
  if (nullable(wallet) || !walletUtils.isMultisig(wallet)) return null;

  return wallet.accounts.filter(account => accountUtils.isAnyMultisigAccount(account)).at(0);
});

const $signatories = combine(
  {
    multisigAccount: $multisigAccount,
    wallets: walletModel.$wallets,
    contacts: contactModel.$contacts,
  },
  ({
    multisigAccount,
    wallets,
    contacts,
  }): { wallets: [Wallet, AccountId][]; contacts: Contact[]; people: AccountId[] } => {
    if (!multisigAccount) {
      return { wallets: [], contacts: [], people: [] };
    }

    const signatoriesMap = dictionary(multisigAccount.signatories, 'accountId', true);

    const walletSignatories: [Wallet, AccountId][] = [];
    for (const wallet of wallets) {
      for (const account of wallet.accounts) {
        if (!signatoriesMap[multisigAccount.accountId]) continue;

        delete signatoriesMap[multisigAccount.accountId];
        walletSignatories.push([wallet, account.accountId]);
      }
    }

    const contactSignatories: Contact[] = [];
    for (const contact of contacts) {
      if (!signatoriesMap[multisigAccount.accountId]) continue;

      contactSignatories.push(contact);
      delete signatoriesMap[contact.accountId];
    }

    return {
      wallets: walletSignatories,
      contacts: contactSignatories,
      people: keys(signatoriesMap),
    };
  },
);

const fetchAllProxiesFx = createEffect(
  async ({
    wallet,
    chains,
    apis,
  }: {
    wallet: Wallet;
    chains: Record<ChainId, Chain>;
    apis: Record<ChainId, ApiPromise>;
  }): Promise<Record<ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]>> => {
    const chainIds = keys(chains);

    const fetchChainProxies = async (chainId: ChainId): Promise<[ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]]> => {
      const api = apis[chainId];
      const chain = chains[chainId];
      if (!api || !chain) return [chainId, []];

      if (!networkUtils.isProxySupported(chain.options)) {
        return [chainId, []];
      }

      const accountProxiesPromises = wallet.accounts.map(async account => {
        try {
          const result = await proxyService.getProxiesForAccount(api, account.accountId);

          return result.accounts.map(proxy => ({
            accountId: toAccountId(proxy.address),
            proxiedAccountId: account.accountId,
            chainId,
            proxyType: proxy.proxyType,
          }));
        } catch (error) {
          console.log(`Failed to fetch proxies for account ${account.accountId} on chain ${chainId}:`, error);
          return [];
        }
      });

      const accountsProxies = await Promise.all(accountProxiesPromises);
      return [chainId, accountsProxies.flat()];
    };

    const chainProxiesPromises = chainIds.map(fetchChainProxies);
    const chainProxiesResults = await Promise.all(chainProxiesPromises);

    return Object.fromEntries(chainProxiesResults);
  },
);

const $chainsProxies = createStore<Record<ChainId, Omit<ProxyAccount, 'id' | 'delay'>[]>>({});

sample({
  source: {
    wallet: $wallet,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  filter: ({ wallet }) => !nullable(wallet),
  fn: ({ wallet, chains, apis }) => ({ wallet: wallet!, chains, apis }),
  target: fetchAllProxiesFx,
});

sample({
  clock: fetchAllProxiesFx.doneData,
  target: $chainsProxies,
});

const $hasProxies = combine($chainsProxies, chainsProxies => {
  return Object.values(chainsProxies).some(accounts => accounts.length > 0);
});

export const multisigWalletDetailsModel = {
  flow,
  $signatories,

  $chainsProxies,
  $hasProxies,
};
