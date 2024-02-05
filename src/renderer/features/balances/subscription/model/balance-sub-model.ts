import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample, createEvent, scopeBind } from 'effector';
import { previous, throttle, once, combineEvents, spread } from 'patronum';
import mapValues from 'lodash/mapValues';
import { VoidFn } from '@polkadot/api/types';

import { AccountId, Balance, ChainId, ConnectionStatus, Wallet, Chain } from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { balanceService } from '@shared/api/balances';
import { balanceModel } from '@entities/balance';
import { storageService } from '@shared/api/storage';
import { balanceSubUtils } from '../lib/balance-sub-utils';
import { Subscriptions, SubAccounts } from '../lib/types';
import { SUBSCRIPTION_DELAY } from '../lib/constants';

const balancesSubStarted = createEvent();
const walletToUnsubSet = createEvent<Wallet>();
const walletToSubSet = createEvent<Wallet>();

const chainsUnsubscribed = createEvent<ChainId[]>();
const chainsSubscribed = createEvent<ChainId[]>();

const $subscriptions = createStore<Subscriptions>({});
const $subAccounts = createStore<SubAccounts>({});

const populateBalancesFx = createEffect((accountIds: AccountId[]): Promise<Balance[]> => {
  return storageService.balances.readAll({ accountId: accountIds });
});

type UnsubParams = {
  chainIds: ChainId[];
  subscriptions: Subscriptions;
};
const unsubscribeFromChainsFx = createEffect(({ chainIds, subscriptions }: UnsubParams): Subscriptions => {
  return chainIds.reduce<Subscriptions>((acc, chainId) => {
    const chainSubscription = acc[chainId];
    if (!chainSubscription) return acc;

    Object.values(chainSubscription).forEach((unsubFn) => {
      unsubFn[0].forEach((fn) => fn());
      unsubFn[1].forEach((fn) => fn());
    });

    acc[chainId] = undefined;

    return acc;
  }, subscriptions);
});

type SubParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Chain[];
  subAccounts: SubAccounts;
  subscriptions: Subscriptions;
};
const subscribeToChainsFx = createEffect(
  async ({ apis, chains, subAccounts, subscriptions }: SubParams): Promise<Subscriptions> => {
    const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });

    const balanceRequests = chains.reduce<Promise<[VoidFn[], VoidFn[]]>[]>((acc, chain) => {
      Object.values(subAccounts[chain.chainId]).forEach((accountIds) => {
        const subBalances = balanceService.subscribeBalances(apis[chain.chainId], chain, accountIds, boundUpdate);
        const subLocks = balanceService.subscribeLockBalances(apis[chain.chainId], chain, accountIds, boundUpdate);

        acc.push(Promise.all([subBalances, subLocks]));
      });

      return acc;
    }, []);

    const unsubFunctions = await Promise.all(balanceRequests);

    return chains.reduce((acc, chain, index) => {
      Object.keys(subAccounts[chain.chainId]).forEach((walletId) => {
        const subChain = acc[chain.chainId];

        if (subChain) {
          subChain[Number(walletId)] = unsubFunctions[index];
        } else {
          acc[chain.chainId] = { [Number(walletId)]: unsubFunctions[index] };
        }
      });

      return acc;
    }, subscriptions);
  },
);

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

// TODO: run unsub for concrete wallet + all chains
sample({
  clock: [walletToUnsubSet, previous(walletModel.$activeWallet)],
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

// TODO: run unsub for concrete wallet + chain
// TODO: run sub for concrete wallet + chain
sample({
  clock: [walletToSubSet, walletModel.$activeWallet],
  source: {
    subAccounts: $subAccounts,
    accounts: walletModel.$accounts,
  },
  filter: (_, wallet) => Boolean(wallet),
  fn: ({ subAccounts, accounts }, wallet) => {
    const walletAccounts = accountUtils.getWalletAccounts(wallet!.id, accounts);
    const accountsToSub = balanceSubUtils.getAccountsToSubscribe(wallet!, walletAccounts);

    return balanceSubUtils.addNewAccounts(subAccounts, accountsToSub);
  },
  target: $subAccounts,
});

sample({
  clock: $subAccounts,
  fn: (subAccounts) => {
    return Object.values(subAccounts).reduce<AccountId[]>((acc, walletMap) => {
      acc.push(...Object.values(walletMap).flat());

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
  clock: throttle({
    source: networkModel.$connectionStatuses,
    timeout: SUBSCRIPTION_DELAY,
  }),
  source: $subscriptions,
  fn: (subscriptions, statuses) => {
    return Object.entries(statuses).reduce<ChainId[]>((acc, entry) => {
      const [chainId, connectionStatus] = entry as [ChainId, ConnectionStatus];
      const isDisabled = networkUtils.isDisconnectedStatus(connectionStatus);
      const isError = networkUtils.isErrorStatus(connectionStatus);

      if ((isDisabled || isError) && subscriptions[chainId]) {
        acc.push(chainId);
      }

      return acc;
    }, []);
  },
  target: chainsUnsubscribed,
});

sample({
  clock: throttle({
    source: networkModel.$connectionStatuses,
    timeout: SUBSCRIPTION_DELAY,
  }),
  source: $subscriptions,
  fn: (subscriptions, statuses) => {
    return Object.entries(statuses).reduce<ChainId[]>((acc, entry) => {
      const [chainId, connectionStatus] = entry as [ChainId, ConnectionStatus];

      if (networkUtils.isConnectedStatus(connectionStatus) && !subscriptions[chainId]) {
        acc.push(chainId);
      }

      return acc;
    }, []);
  },
  target: chainsSubscribed,
});

sample({
  clock: chainsUnsubscribed,
  source: $subscriptions,
  filter: (_, chainIds) => chainIds.length > 0,
  fn: (subscriptions, chainIds) => ({ chainIds, subscriptions }),
  target: unsubscribeFromChainsFx,
});

sample({
  clock: chainsSubscribed,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subAccounts: $subAccounts,
    subscriptions: $subscriptions,
  },
  filter: (_, chainIds) => chainIds.length > 0,
  fn: ({ subAccounts, subscriptions, ...params }, chainIds) => {
    const { apis, chains } = chainIds.reduce(
      (acc, chainId) => {
        acc.apis[chainId] = params.apis[chainId];
        acc.chains.push(params.chains[chainId]);

        return acc;
      },
      { apis: {} as Record<ChainId, ApiPromise>, chains: [] as Chain[] },
    );

    return { apis, chains, subAccounts, subscriptions };
  },
  target: subscribeToChainsFx,
});

sample({
  clock: [unsubscribeFromChainsFx.doneData, subscribeToChainsFx.doneData],
  target: $subscriptions,
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
