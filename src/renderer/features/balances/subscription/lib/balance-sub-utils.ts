import { VoidFn } from '@polkadot/api/types';
import { ApiPromise } from '@polkadot/api';

import { Account, Wallet, ChainId, ID, Chain, Balance } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { dictionary, isFulfilled } from '@shared/lib/utils';
import { balanceService } from '@shared/api/balances';
import { SubAccounts, Subscriptions } from './types';

export const balanceSubUtils = {
  getAccountsToSubscribe,
  getNewAccounts,

  getSubscriptionsWithoutChains,
  getSubscriptionsWithoutWallet,
  getSubscriptionsToBalances,
};

function getAccountsToSubscribe(wallet: Wallet, accounts: Account[]): Account[] {
  if (walletUtils.isMultisig(wallet) && accountUtils.isMultisigAccount(accounts[0])) {
    const accountsMap = dictionary(accounts, 'accountId');

    return accounts[0].signatories.reduce((acc, signatory) => {
      if (accountsMap[signatory.accountId]) {
        acc.push(accountsMap[signatory.accountId]);
      }

      return acc;
    }, accounts);
  }

  if (walletUtils.isPolkadotVault(wallet)) {
    return accounts.filter((account) => !accountUtils.isBaseAccount(account));
  }

  if (walletUtils.isProxied(wallet)) {
    // TODO: Handle proxied accounts https://app.clickup.com/t/86934k047
  }

  return accounts;
}

function getNewAccounts(subAccounts: SubAccounts, accountsToSub: Account[]): SubAccounts {
  const chainIds = Object.keys(subAccounts) as ChainId[];

  const newSubAccounts = accountsToSub.reduce<SubAccounts>((acc, account) => {
    const isBaseAccount = accountUtils.isBaseAccount(account);
    const isMultisigAccount = accountUtils.isMultisigAccount(account);

    const chainsToUpdate = isBaseAccount || isMultisigAccount ? chainIds : [account.chainId];

    chainsToUpdate.forEach((chainId) => {
      if (acc[chainId]) {
        acc[chainId][account.walletId].push(account.accountId);
      } else {
        acc[chainId] = { [account.walletId]: [account.accountId] };
      }
    });

    return acc;
  }, {});

  return chainIds.reduce<SubAccounts>((acc, chainId) => {
    acc[chainId] = { ...subAccounts[chainId], ...newSubAccounts[chainId] };

    return acc;
  }, {});
}

function getSubscriptionsWithoutChains(chainIds: ChainId[], subscriptions: Subscriptions): Subscriptions {
  if (chainIds.length === 0) return subscriptions;

  const unsubChains = chainIds.reduce<Subscriptions>((acc, chainId) => {
    const chainSubscription = subscriptions[chainId];
    if (!chainSubscription) return acc;

    Object.values(chainSubscription).forEach((unsubFn) => {
      unsubFn[0].forEach((fn) => fn());
      unsubFn[1].forEach((fn) => fn());
    });

    acc[chainId] = undefined;

    return acc;
  }, {});

  return { ...subscriptions, ...unsubChains };
}

function getSubscriptionsWithoutWallet(walletId: ID, subscriptions: Subscriptions): Subscriptions {
  return Object.entries(subscriptions).reduce<Subscriptions>((acc, [chainId, walletMap]) => {
    if (!walletMap || !walletMap[walletId]) return acc;

    const { [walletId]: walletToUnsub, ...rest } = walletMap;
    walletToUnsub[0].forEach((fn) => fn());
    walletToUnsub[1].forEach((fn) => fn());

    acc[chainId as ChainId] = Object.keys(rest).length > 0 ? rest : undefined;

    return acc;
  }, {});
}

type SubChainsParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Chain[];
  walletId?: ID;
  subAccounts: SubAccounts;
  subscriptions: Subscriptions;
};
async function getSubscriptionsToBalances(
  { apis, chains, walletId, subAccounts, subscriptions }: SubChainsParams,
  updateFn: (data: Balance[]) => void,
): Promise<Subscriptions> {
  if (chains.length === 0) return subscriptions;

  const balanceRequests = chains.reduce<Promise<[VoidFn[], VoidFn[]]>[]>((acc, chain) => {
    Object.entries(subAccounts[chain.chainId]).forEach(([id, accountIds]) => {
      if (walletId && Number(id) !== walletId) return;

      const subBalances = balanceService.subscribeBalances(apis[chain.chainId], chain, accountIds, updateFn);
      const subLocks = balanceService.subscribeLockBalances(apis[chain.chainId], chain, accountIds, updateFn);

      acc.push(Promise.all([subBalances, subLocks]));
    });

    return acc;
  }, []);

  console.log('=== req', balanceRequests.length);
  const unsubFunctions = await Promise.allSettled(balanceRequests);

  return chains.reduce<Subscriptions>(
    (acc, chain, index) => {
      Object.keys(subAccounts[chain.chainId]).forEach((id) => {
        const functions = unsubFunctions[index];
        if (walletId && Number(id) !== walletId) return;

        if (isFulfilled(functions)) {
          acc[chain.chainId] = { ...acc[chain.chainId], [Number(id)]: functions.value };
        } else {
          console.log('Balance subscription failed with error - ', functions.reason);
        }
      });

      return acc;
    },
    { ...subscriptions },
  );
}
