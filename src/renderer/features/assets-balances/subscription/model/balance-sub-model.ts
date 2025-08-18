import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { previous } from 'patronum';

import { balanceService } from '@/shared/api/balances';
import { type BalanceDraft, type Chain, type ChainId, type Wallet } from '@/shared/core';
import { series } from '@/shared/effector';
import { entries, merge, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubUtils } from '../lib/balance-sub-utils';
import { type SubscriptionKey, type Subscriptions } from '../lib/types';

const subscribeWallet = createEvent<Wallet>();
const unsubscribeWallet = createEvent<Wallet>();
const fetchWallet = createEvent<Wallet>();

const subscribeAccounts = createEvent<AnyAccount[]>();
const unsubscribeAccounts = createEvent<AnyAccount[]>();
const unsubscribeChain = createEvent<ChainId>();

const fetchAccounts = createEvent<AnyAccount[]>();

const updateBalances = createEvent<Omit<BalanceDraft, 'id'>[]>();

// actual subscriptions map
const $subscriptions = createStore<Subscriptions>({});
// subscribed accounts. this array exists because some chain can be in disconnected status and $subscriptions
// doesn't represent subscription intention.
const $subscribedAccounts = createStore<AnyAccount[]>([]);

// effects

type FetchAccountParam = {
  api: ApiPromise;
  chain: Chain;
  accounts: AccountId[];
};
const fetchAccountsFx = createEffect(async ({ api, chain, accounts }: FetchAccountParam) => {
  return Promise.all([
    balanceService.fetchBalances(api, chain, accounts),
    balanceService.fetchLockBalances(api, chain, accounts),
  ]).then(([balances, lockBalances]) => balances.concat(lockBalances));
});

type SubscribeAccountParam = {
  api: ApiPromise;
  chain: Chain;
  accountId: AccountId;
};
const subscribeAccountsFx = createEffect((subscriptions: SubscribeAccountParam[]) => {
  const boundUpdate = scopeBind(updateBalances, { safe: true });
  const result: Record<SubscriptionKey, VoidFunction> = {};

  for (const { api, chain, accountId } of subscriptions) {
    const key = balanceSubUtils.getSubscriptionKey(accountId, chain.chainId);
    const unsubscribe = [
      ...balanceService.subscribeBalances(api, chain, [accountId], boundUpdate),
      ...balanceService.subscribeLockBalances(api, chain, [accountId], boundUpdate),
    ];

    result[key] = () => unsubscribe.map((u) => u.then((u) => u()));
  }

  return result;
});

type UnsubscribeAccountsParams = {
  keys: SubscriptionKey[];
  subscriptions: Subscriptions;
};
const unsubscribeFx = createEffect(({ keys, subscriptions }: UnsubscribeAccountsParams) => {
  for (const key of keys) {
    const unsubscribe = subscriptions[key];
    if (unsubscribe) {
      unsubscribe();
    }
  }
});

// balances updating

sample({
  clock: updateBalances,
  target: balanceModel.events.balancesUpdated,
});

// subscriptions updating

sample({
  clock: subscribeAccountsFx.doneData,
  source: $subscriptions,
  fn(subscriptions, result) {
    return produce(subscriptions, (draft) => {
      for (const [key, unsubscribe] of entries(result)) {
        const chainSubscription = draft[key];
        // @ts-expect-error weird type error
        if (chainSubscription) {
          console.error('subscription already exists:', key);
        }

        draft[key] = unsubscribe;
      }
    });
  },
  target: $subscriptions,
});

const accountsUnsubscribed = sample({
  clock: unsubscribeAccounts,
  source: {
    chains: networkModel.$chains,
    subscriptions: $subscriptions,
  },
  fn({ subscriptions, chains }, accounts) {
    const keys = Object.values(chains).flatMap((chain) => {
      return accounts.map((account) => balanceSubUtils.getSubscriptionKey(account.accountId, chain.chainId));
    });

    return {
      keys,
      subscriptions,
    };
  },
});

const chainUnsubscribed = sample({
  clock: unsubscribeChain,
  source: {
    subscriptions: $subscriptions,
    subscribedAccounts: $subscribedAccounts,
  },
  fn({ subscribedAccounts, subscriptions }, chainId) {
    const keys = subscribedAccounts.map((account) => balanceSubUtils.getSubscriptionKey(account.accountId, chainId));

    return {
      keys,
      subscriptions,
    };
  },
});

sample({
  clock: [accountsUnsubscribed, chainUnsubscribed],
  source: $subscriptions,
  fn(subscriptions, params) {
    return produce(subscriptions, (draft) => {
      for (const key of params.keys) {
        delete draft[key];
      }
    });
  },
  target: $subscriptions,
});

sample({
  clock: [accountsUnsubscribed, chainUnsubscribed],
  target: unsubscribeFx,
});

// wallet subscriptions

const $previousWallet = previous(walletSelect.$selectedWallet);

sample({
  clock: subscribeWallet,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
  },
  fn({ accounts, chains }, wallet) {
    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return balanceSubUtils.getSiblingAccounts(walletAccounts, accounts, Object.values(chains));
  },
  target: subscribeAccounts,
});

sample({
  clock: unsubscribeWallet,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
  },
  fn({ accounts, chains }, wallet) {
    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return balanceSubUtils.getSiblingAccounts(walletAccounts, accounts, Object.values(chains));
  },
  target: unsubscribeAccounts,
});

sample({
  clock: $previousWallet,
  filter: nonNullable,
  target: unsubscribeWallet,
});

sample({
  clock: walletSelect.$selectedWallet,
  filter: nonNullable,
  target: subscribeWallet,
});

// fetch balances when a wallet is created
sample({
  clock: walletModel.createWallet.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet as Wallet,
  target: fetchWallet,
});

// account subscriptions

sample({
  clock: subscribeAccounts,
  source: {
    subscriptions: $subscriptions,
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
  },
  fn({ subscriptions, chains, apis, statuses }, accounts) {
    if (accounts.length === 0) return [];

    const params: Record<string, SubscribeAccountParam> = {};

    for (const [chainId, status] of entries(statuses)) {
      if (!networkUtils.isConnectedStatus(status)) continue;

      const api = apis[chainId];
      const chain = chains[chainId];
      if (nullable(api) || nullable(chain)) continue;

      for (const account of accounts) {
        if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

        const key = balanceSubUtils.getSubscriptionKey(account.accountId, chainId);
        if (params[key] || subscriptions[key]) {
          continue;
        }

        params[key] = {
          api,
          chain,
          accountId: account.accountId,
        };
      }
    }

    return Object.values(params);
  },
  target: subscribeAccountsFx,
});

// $subscribedAccounts management
// WARNING! should follow account subscriptions because of race condition

sample({
  clock: unsubscribeAccounts,
  source: $subscribedAccounts,
  fn(subscribed, removed) {
    const removedIds = removed.map((a) => a.id);
    return subscribed.filter((s) => !removedIds.includes(s.id));
  },
  target: $subscribedAccounts,
});

sample({
  clock: subscribeAccounts,
  source: $subscribedAccounts,
  fn(subscribed, accounts) {
    return merge({
      a: subscribed,
      b: accounts,
      mergeBy: (a) => a.id,
    });
  },
  target: $subscribedAccounts,
});

// connection status management

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subscriptions: $subscriptions,
    subscribedAccounts: $subscribedAccounts,
  },
  filter: (_, { status }) => networkUtils.isConnectedStatus(status),
  fn: ({ apis, chains, subscribedAccounts, subscriptions }, { chainId }) => {
    const chain = chains[chainId];
    const api = apis[chainId];

    if (nullable(chain) || nullable(api)) return [];

    const params: SubscribeAccountParam[] = [];

    for (const account of subscribedAccounts) {
      const key = balanceSubUtils.getSubscriptionKey(account.accountId, chainId);
      if (nonNullable(subscriptions[key])) continue;

      if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

      params.push({
        api,
        chain,
        accountId: account.accountId,
      });
    }

    return params;
  },
  target: subscribeAccountsFx,
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  filter: ({ status }) => !networkUtils.isConnectedStatus(status),
  fn: ({ chainId }) => chainId,
  target: unsubscribeChain,
});

// account fetching

sample({
  clock: fetchWallet,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
  },
  fn({ accounts, chains }, wallet) {
    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return balanceSubUtils.getSiblingAccounts(walletAccounts, accounts, Object.values(chains));
  },
  target: fetchAccounts,
});

sample({
  clock: fetchAccounts,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
  },
  fn({ chains, apis, statuses }, accounts) {
    if (accounts.length === 0) return [];

    const params: FetchAccountParam[] = [];

    for (const [chainId, status] of entries(statuses)) {
      if (!networkUtils.isConnectedStatus(status)) continue;

      const api = apis[chainId];
      const chain = chains[chainId];
      if (nullable(api) || nullable(chain)) continue;

      const accountIds: AccountId[] = [];

      for (const account of accounts) {
        if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

        accountIds.push(account.accountId);
      }

      if (accountIds.length > 0) {
        params.push({
          api,
          chain,
          accounts: accountIds,
        });
      }
    }

    return params;
  },
  target: series(fetchAccountsFx, { parallel: true, skipErrors: true }),
});

sample({
  clock: fetchAccountsFx.doneData,
  target: updateBalances,
});

export const balanceSubModel = {
  subscribeWallet,
  unsubscribeWallet,

  subscribeAccounts,
  unsubscribeAccounts,

  fetchAccounts,
  fetchWallet,

  __test: {
    subscribeAccountsFx,
    unsubscribeFx,
    $subscribedAccounts,
    $subscriptions,
  },
};
