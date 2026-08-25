import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { previous, spread } from 'patronum';

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
import { type RequestedAccount, type SubscriptionKey, type Subscriptions } from '../lib/types';

const subscribeWallet = createEvent<Wallet>();
const unsubscribeWallet = createEvent<Wallet>();
const fetchWallet = createEvent<Wallet>();

const subscribeKnownAccounts = createEvent<AnyAccount[]>();
// low level subscription
const subscribeAccounts = createEvent<RequestedAccount[]>();
const unsubscribeAccounts = createEvent<RequestedAccount[]>();
const unsubscribeChain = createEvent<ChainId>();

const fetchAccounts = createEvent<AnyAccount[]>();
// low level request
const fetchAccountIds = createEvent<RequestedAccount[]>();

const updateBalances = createEvent<Omit<BalanceDraft, 'id'>[]>();

// actual subscriptions map
const $subscriptions = createStore<Subscriptions>({});
// subscribed accounts. this array exists because some chain can be in disconnected status and $subscriptions
// doesn't represent subscription intention.
const $subscribedAccounts = createStore<RequestedAccount[]>([]);
// one-shot fetches that arrived while their chain was disconnected, replayed once it connects.
// Without it a balance requested for an offline chain (a testnet still connecting, a node in
// failover) is silently never fetched — and a flow that later needs it fails its fee check.
const $deferredFetches = createStore<Record<ChainId, AccountId[]>>({});

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

type SubscribeAccountParam = RequestedAccount & { api: ApiPromise };
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
  target: balanceModel.balancesUpdated,
});

// subscriptions updating

sample({
  clock: subscribeAccountsFx.doneData,
  source: $subscriptions,
  fn(subscriptions, result) {
    return produce(subscriptions, (draft) => {
      for (const [key, unsubscribe] of entries(result)) {
        const chainSubscription = draft[key];
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
    chains: networkModel.$chainsList,
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
    chains: networkModel.$chainsList,
  },
  fn({ accounts, chains }, wallet) {
    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return balanceSubUtils.getSiblingAccounts(walletAccounts, accounts, chains);
  },
  target: subscribeAccounts,
});

sample({
  clock: unsubscribeWallet,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chainsList,
  },
  fn({ accounts, chains }, wallet) {
    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return balanceSubUtils.getSiblingAccounts(walletAccounts, accounts, chains);
  },
  target: unsubscribeAccounts,
});

sample({
  clock: $previousWallet,
  filter: nonNullable,
  target: unsubscribeWallet,
});

sample({
  clock: [walletSelect.$selectedWallet, walletModel.$availableAccounts],
  source: walletSelect.$selectedWallet,
  filter: nonNullable,
  target: subscribeWallet,
});

// fetch balances when a wallet is created
sample({
  clock: walletModel.createWallet.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet,
  target: fetchWallet,
});

// account subscriptions

sample({
  clock: subscribeKnownAccounts,
  source: networkModel.$chainsList,
  fn: (chains, accounts) => balanceSubUtils.getRequestedAccounts(accounts, chains),
  target: subscribeAccounts,
});

sample({
  clock: subscribeAccounts,
  source: {
    subscriptions: $subscriptions,
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
  },
  fn({ subscriptions, chains, apis, statuses }, requests) {
    const params: Record<string, SubscribeAccountParam> = {};

    for (const [chainId, status] of entries(statuses)) {
      if (!networkUtils.isConnectedStatus(status)) continue;

      for (const request of requests) {
        if (request.chain.chainId !== chainId) continue;

        const api = apis[chainId];
        const chain = chains[chainId];
        if (nullable(api) || nullable(chain)) continue;

        const key = balanceSubUtils.getSubscriptionKey(request.accountId, chainId);
        if (subscriptions[key] || params[key]) {
          continue;
        }

        params[key] = {
          api,
          chain,
          accountId: request.accountId,
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
    const removedIds = removed.map((a) => balanceSubUtils.getSubscriptionKey(a.accountId, a.chain.chainId));
    return subscribed.filter((s) => {
      return !removedIds.includes(balanceSubUtils.getSubscriptionKey(s.accountId, s.chain.chainId));
    });
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
      mergeBy: (a) => balanceSubUtils.getSubscriptionKey(a.accountId, a.chain.chainId),
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

    for (const subscribed of subscribedAccounts) {
      const key = balanceSubUtils.getSubscriptionKey(subscribed.accountId, chainId);
      if (nonNullable(subscriptions[key])) continue;

      if (chain.chainId !== subscribed.chain.chainId) continue;

      params.push({
        api,
        chain,
        accountId: subscribed.accountId,
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
    chains: networkModel.$chainsList,
  },
  fn({ accounts, chains }, wallet) {
    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return balanceSubUtils.getSiblingAccounts(walletAccounts, accounts, chains);
  },
  target: fetchAccountIds,
});

sample({
  clock: fetchAccounts,
  source: networkModel.$chainsList,
  fn: (chains, accounts) => balanceSubUtils.getRequestedAccounts(accounts, chains),
  target: fetchAccountIds,
});

const fetchNow = createEvent<FetchAccountParam[]>();
const deferFetch = createEvent<RequestedAccount[]>();

sample({
  clock: fetchAccountIds,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
  },
  fn({ chains, apis, statuses }, requests) {
    const params: FetchAccountParam[] = [];
    const deferred: RequestedAccount[] = [];

    if (requests.length === 0) return { params, deferred };

    for (const [chainId, status] of entries(statuses)) {
      const api = apis[chainId];
      const chain = chains[chainId];
      const chainRequests = requests.filter((request) => request.chain.chainId === chainId);
      if (chainRequests.length === 0) continue;

      if (!networkUtils.isConnectedStatus(status) || nullable(api) || nullable(chain)) {
        deferred.push(...chainRequests);
        continue;
      }

      params.push({ api, chain, accounts: chainRequests.map((request) => request.accountId) });
    }

    return { params, deferred };
  },
  target: spread({ params: fetchNow, deferred: deferFetch }),
});

sample({
  clock: fetchNow,
  target: series(fetchAccountsFx, { parallel: true, skipErrors: true }),
});

$deferredFetches.on(deferFetch, (deferred, requests) =>
  produce(deferred, (draft) => {
    for (const { accountId, chain } of requests) {
      const accountIds = (draft[chain.chainId] ??= []);
      if (!accountIds.includes(accountId)) accountIds.push(accountId);
    }
  }),
);

// a chain came online: replay whatever one-shot fetches were waiting for it
sample({
  clock: networkModel.output.connectionStatusChanged,
  source: { deferred: $deferredFetches, chains: networkModel.$chains },
  filter: ({ deferred }, { chainId, status }) =>
    networkUtils.isConnectedStatus(status) && (deferred[chainId]?.length ?? 0) > 0,
  fn: ({ deferred, chains }, { chainId }) => {
    const chain = chains[chainId];
    if (nullable(chain)) return { requests: [], rest: deferred };

    const { [chainId]: accountIds = [], ...rest } = deferred;

    return { requests: accountIds.map((accountId) => ({ accountId, chain })), rest };
  },
  target: spread({ requests: fetchAccountIds, rest: $deferredFetches }),
});

sample({
  clock: fetchAccountsFx.doneData,
  target: updateBalances,
});

// removing old balances

sample({
  clock: walletModel.$availableAccounts,
  fn: (accounts) => ({ existingAccounts: accounts.map((a) => a.accountId) }),
  target: balanceModel.clearUnwantedBalances,
});

export const balanceSubModel = {
  subscribeWallet,
  unsubscribeWallet,

  subscribeKnownAccounts,
  subscribeAccounts,
  unsubscribeAccounts,

  fetchAccounts,
  fetchAccountIds,
  fetchWallet,

  __test: {
    subscribeAccountsFx,
    unsubscribeFx,
    $subscribedAccounts,
    $subscriptions,
    $deferredFetches,
    fetchAccountsFx,
  },
};
