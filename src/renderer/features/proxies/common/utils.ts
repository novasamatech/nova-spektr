import { Account, Chain, ChainId } from '@shared/core';
import { ProxyStore } from './types';

export const isRegularProxy = (chain: Chain) => chain.options?.includes('regular_proxy');

export const getAccountsProxy = (accounts: Account[], proxies: ProxyStore) => {
  const proxyAccounts = accounts.reduce<ProxyStore>((acc, account) => {
    Object.entries(proxies).forEach(([chainId, chainProxies]) => {
      const typedChainId = chainId as ChainId;

      if (chainProxies[account.accountId]) {
        if (!acc[typedChainId]) {
          acc[typedChainId] = {};
        }

        acc[typedChainId] = {
          ...acc[typedChainId],
          [account.accountId]: chainProxies[account.accountId],
        };
      }
    });

    return acc;
  }, {});

  return proxyAccounts;
};
