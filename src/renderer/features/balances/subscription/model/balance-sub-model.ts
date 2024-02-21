import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample, createEvent, scopeBind } from 'effector';
import { throttle, once, combineEvents, spread, previous, not } from 'patronum';
import mapValues from 'lodash/mapValues';

import { AccountId, Balance, ChainId, ConnectionStatus, Wallet, Chain, ID } from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { balanceModel } from '@entities/balance';
import { storageService } from '@shared/api/storage';
import { balanceSubUtils } from '../lib/balance-sub-utils';
import { Subscriptions, SubAccounts } from '../lib/types';
import { SUBSCRIPTION_DELAY } from '../lib/constants';

const balancesSubStarted = createEvent();
const walletToUnsubSet = createEvent<Wallet>();
const walletToSubSet = createEvent<Wallet>();

const proceedWalletToSub = createEvent<Wallet>();
const proceedConnectionToUpdate = createEvent<Record<ChainId, ConnectionStatus>>();

const $subscriptions = createStore<Subscriptions>({});
const $subAccounts = createStore<SubAccounts>({});

const $latestWalletToSub = createStore<Wallet | null>(null);
const $latestConnectionsToUpdate = createStore<Record<ChainId, ConnectionStatus> | null>(null);

const $previousWallet = previous(walletModel.$activeWallet);

const populateBalancesFx = createEffect((accountIds: AccountId[]): Promise<Balance[]> => {
  return storageService.balances.readAll({ accountId: accountIds });
});

type UnsubWalletParams = {
  walletId: ID;
  subscriptions: Subscriptions;
};
const unsubscribeWalletFx = createEffect(({ walletId, subscriptions }: UnsubWalletParams): Subscriptions => {
  return balanceSubUtils.getSubscriptionsWithoutWallet(walletId, subscriptions);
});

type SubChainsParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Chain[];
  walletId?: ID;
  subAccounts: SubAccounts;
  subscriptions: Subscriptions;
};
const subscribeChainsFx = createEffect(async (params: SubChainsParams): Promise<Subscriptions> => {
  // console.log('=== SUB');
  const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });

  return balanceSubUtils.getSubscriptionsToBalances(params, boundUpdate);
});

type UpdateChainsParams = {
  subscriptions: Subscriptions;
  unsubChains: ChainId[];
  subParams: Omit<SubChainsParams, 'subscriptions'>;
};
const updateChainsSubscriptionsFx = createEffect(
  async ({ subscriptions, unsubChains, subParams }: UpdateChainsParams): Promise<Subscriptions> => {
    const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });

    let newSubscription = balanceSubUtils.getSubscriptionsWithoutChains(unsubChains, subscriptions);

    return balanceSubUtils.getSubscriptionsToBalances({ ...subParams, subscriptions: newSubscription }, boundUpdate);
  },
);

sample({
  clock: [unsubscribeWalletFx.doneData, subscribeChainsFx.doneData, updateChainsSubscriptionsFx.doneData],
  target: $subscriptions,
});

sample({
  clock: once(combineEvents([walletModel.$activeWallet.updates, networkModel.$chains.updates])),
  filter: ([wallet]) => Boolean(wallet),
  fn: ([wallet, chains]) => ({
    subAccounts: mapValues(chains, () => ({ [wallet!.id]: [] })),
    walletToSub: wallet,
  }),
  target: spread({
    subAccounts: $subAccounts,
    walletToSub: walletToSubSet,
  }),
});

sample({
  clock: $subAccounts,
  source: networkModel.$connectionStatuses,
  fn: (statuses, subAccounts) => {
    return Object.entries(subAccounts).reduce<AccountId[]>((acc, entry) => {
      const [chainId, walletMap] = entry as [ChainId, Record<ID, AccountId[]>];

      if (networkUtils.isConnectedStatus(statuses[chainId])) {
        acc.push(...Object.values(walletMap).flat());
      }

      return acc;
    }, []);
  },
  target: populateBalancesFx,
});

sample({
  clock: populateBalancesFx.doneData,
  target: balanceModel.$balancesBuffer,
});

sample({
  clock: [walletToUnsubSet, $previousWallet],
  source: $subAccounts,
  filter: (_, wallet) => Boolean(wallet),
  fn: (subAccounts, wallet) => {
    return Object.entries(subAccounts).reduce<SubAccounts>((acc, [chainId, walletMap]) => {
      const { [wallet!.id]: _, ...rest } = walletMap;
      acc[chainId as ChainId] = rest;

      return acc;
    }, {});
  },
  target: $subAccounts,
});

sample({
  clock: [walletToUnsubSet, $previousWallet],
  source: $subscriptions,
  filter: (_, wallet) => Boolean(wallet),
  fn: (subscriptions, wallet) => ({ walletId: wallet!.id, subscriptions }),
  target: unsubscribeWalletFx,
});

sample({
  clock: [walletToSubSet, walletModel.$activeWallet],
  source: unsubscribeWalletFx.pending,
  filter: (_, wallet) => Boolean(wallet),
  fn: (isPending, wallet) => {
    return isPending ? { hold: wallet! } : { proceed: wallet! };
  },
  target: spread({
    hold: $latestWalletToSub,
    proceed: proceedWalletToSub,
  }),
});

sample({
  clock: unsubscribeWalletFx.doneData,
  source: $latestWalletToSub,
  filter: (latest) => Boolean(latest),
  fn: (wallet) => wallet!,
  target: [proceedWalletToSub, $latestWalletToSub.reinit],
});

sample({
  clock: proceedWalletToSub,
  source: {
    subAccounts: $subAccounts,
    accounts: walletModel.$accounts,
  },
  filter: (_, wallet) => Boolean(wallet),
  fn: ({ subAccounts, accounts }, wallet) => {
    const walletAccounts = accountUtils.getWalletAccounts(wallet!.id, accounts);
    const accountsToSub = balanceSubUtils.getAccountsToSubscribe(wallet!, walletAccounts);

    return balanceSubUtils.getNewAccounts(subAccounts, accountsToSub);
  },
  target: $subAccounts,
});

sample({
  clock: proceedWalletToSub,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    subAccounts: $subAccounts,
    subscriptions: $subscriptions,
  },
  filter: ({ statuses }, wallet) => {
    return Boolean(wallet) && Object.values(statuses).some(networkUtils.isConnectedStatus);
  },
  fn: ({ subAccounts, subscriptions, statuses, ...params }, wallet) => {
    const { apis, chains } = Object.entries(statuses).reduce(
      (acc, entry) => {
        const [chainId, status] = entry as [ChainId, ConnectionStatus];
        if (!networkUtils.isConnectedStatus(status)) return acc;

        acc.apis[chainId] = params.apis[chainId];
        acc.chains.push(params.chains[chainId]);

        return acc;
      },
      { apis: {} as Record<ChainId, ApiPromise>, chains: [] as Chain[] },
    );

    return { apis, chains, walletId: wallet!.id, subAccounts, subscriptions };
  },
  target: subscribeChainsFx,
});

const throttleXXX = throttle({
  source: networkModel.$connectionStatuses,
  timeout: SUBSCRIPTION_DELAY,
});

sample({
  clock: throttleXXX,
  filter: updateChainsSubscriptionsFx.pending,
  fn: (x) => {
    console.log('=== waiting');

    return x;
  },
  target: $latestConnectionsToUpdate,
});

sample({
  clock: throttleXXX,
  filter: not(updateChainsSubscriptionsFx.pending),
  fn: (x) => {
    console.log('=== NOT waiting');

    return x;
  },
  target: proceedConnectionToUpdate,
});

sample({
  clock: updateChainsSubscriptionsFx.doneData,
  source: $latestConnectionsToUpdate,
  filter: (latest) => Boolean(latest),
  fn: (statuses) => {
    console.log('=== wait > start');

    return statuses!;
  },
  target: [proceedConnectionToUpdate, $latestConnectionsToUpdate.reinit],
});

updateChainsSubscriptionsFx.pending.watch((v) => {
  console.log('=== pending ', v);
});

sample({
  clock: proceedConnectionToUpdate,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subAccounts: $subAccounts,
    subscriptions: $subscriptions,
  },
  fn: ({ subAccounts, subscriptions, ...params }, statuses) => {
    const { apis, chains, disconnected } = Object.entries(statuses).reduce(
      (acc, entry) => {
        const [chainId, connectionStatus] = entry as [ChainId, ConnectionStatus];
        const isConnected = networkUtils.isConnectedStatus(connectionStatus);
        const isDisabled = networkUtils.isDisconnectedStatus(connectionStatus);
        const isError = networkUtils.isErrorStatus(connectionStatus);

        if (isConnected && !subscriptions[chainId]) {
          acc.apis[chainId] = params.apis[chainId];
          acc.chains.push(params.chains[chainId]);
        } else if ((isDisabled || isError) && subscriptions[chainId]) {
          acc.disconnected.push(chainId);
        }

        return acc;
      },
      { apis: {} as Record<ChainId, ApiPromise>, chains: [] as Chain[], disconnected: [] as ChainId[] },
    );

    return {
      subscriptions,
      unsubChains: disconnected,
      subParams: { apis, chains, subAccounts },
    };
  },
  target: updateChainsSubscriptionsFx,
});

export const balanceSubModel = {
  events: {
    balancesSubStarted,
    walletToSubSet,
    walletToUnsubSet,
  },

  /* Internal API (tests only) */
  __$subscriptions: $subscriptions,
  __$subAccounts: $subAccounts,
};
