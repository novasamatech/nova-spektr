import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample, createEvent, scopeBind, attach } from 'effector';
import { once, combineEvents, spread, previous } from 'patronum';
import mapValues from 'lodash/mapValues';

import { AccountId, Balance, ChainId, ConnectionStatus, Wallet, Chain, ID } from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { balanceModel } from '@entities/balance';
import { storageService } from '@shared/api/storage';
import { balanceSubUtils } from '../lib/balance-sub-utils';
import { Subscriptions, SubAccounts } from '../lib/types';
import { balanceService } from '@shared/api/balances';
import { isRejected } from '@shared/lib/utils';

const balancesSubStarted = createEvent();
const walletToUnsubSet = createEvent<Wallet>();
const walletToSubSet = createEvent<Wallet>();

const $subscriptions = createStore<Subscriptions>({});
const $subAccounts = createStore<SubAccounts>({});

const $previousWallet = previous(walletModel.$activeWallet);

const populateBalancesFx = createEffect(async (accountIds: Set<AccountId>): Promise<Balance[]> => {
  if (accountIds.size === 0) return Promise.resolve([]);

  const balances = await storageService.balances.readAll();

  return balances.filter((balance) => accountIds.has(balance.accountId));
});

type UnsubWalletParams = {
  walletId: ID;
  subscriptions: Subscriptions;
};
const unsubscribeWalletFx = createEffect(({ walletId, subscriptions }: UnsubWalletParams): Subscriptions => {
  return Object.entries(subscriptions).reduce<Subscriptions>((acc, [chainId, walletMap]) => {
    if (!walletMap || !walletMap[walletId]) {
      acc[chainId as ChainId] = walletMap;
    } else {
      const { [walletId]: walletToUnsub, ...rest } = walletMap;
      acc[chainId as ChainId] = Object.keys(rest).length > 0 ? rest : undefined;

      Promise.allSettled(walletToUnsub)
        .then((fns) => {
          fns.forEach((unsub) => {
            if (isRejected(unsub)) return;

            unsub.value();
          });
        })
        .catch((error) => {
          console.log(`Error while unsubscribing from balances for walletId - ${walletId}`, error);
        });
    }

    return acc;
  }, {});
});

type UnsubChainParams = {
  chainId: ChainId;
  subscriptions: Subscriptions;
};
const unsubscribeChainFx = createEffect(({ chainId, subscriptions }: UnsubChainParams) => {
  const chainSubscription = subscriptions[chainId];
  if (!chainSubscription) return subscriptions;

  Object.values(chainSubscription).forEach((unsubFn) => {
    Promise.allSettled(unsubFn)
      .then((fns) => {
        fns.forEach((unsub) => {
          if (isRejected(unsub)) return;

          unsub.value();
        });
      })
      .catch((error) => {
        console.log(`Error while unsubscribing from balances for chainId - ${chainId}`, error);
      });
  });

  return { ...subscriptions, [chainId]: undefined };
});

type SubChainsParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Chain[];
  walletId?: ID;
  subAccounts: SubAccounts;
  subscriptions: Subscriptions;
};
const pureSubscribeChainsFx = createEffect(
  ({ apis, chains, walletId, subAccounts, subscriptions }: SubChainsParams): Subscriptions => {
    if (chains.length === 0) return subscriptions;

    const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });

    return chains.reduce<Subscriptions>(
      (acc, chain) => {
        Object.entries(subAccounts[chain.chainId]).forEach(([id, accountIds]) => {
          if (walletId && Number(id) !== walletId) return;

          const unsubPromises = [
            ...balanceService.subscribeBalances(apis[chain.chainId], chain, accountIds, boundUpdate),
            ...balanceService.subscribeLockBalances(apis[chain.chainId], chain, accountIds, boundUpdate),
          ];

          if (acc[chain.chainId]) {
            acc[chain.chainId]![Number(id)] = unsubPromises;
          } else {
            acc[chain.chainId] = { [Number(id)]: unsubPromises };
          }
        });

        return acc;
      },
      { ...subscriptions },
    );
  },
);

const subscribeChainsFx = attach({
  effect: pureSubscribeChainsFx,
  source: $subscriptions,
  mapParams: (data: Omit<SubChainsParams, 'subscriptions'>, subscriptions) => {
    return { ...data, subscriptions };
  },
});

sample({
  clock: [unsubscribeWalletFx.doneData, unsubscribeChainFx.doneData, subscribeChainsFx.doneData],
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
  fn: (subAccounts) => {
    return Object.values(subAccounts).reduce<Set<AccountId>>((acc, walletMap) => {
      Object.values(walletMap)
        .flat()
        .forEach((accountId) => acc.add(accountId));

      return acc;
    }, new Set());
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
  source: {
    subAccounts: $subAccounts,
    accounts: walletModel.$accounts,
  },
  filter: (_, wallet) => Boolean(wallet),
  fn: ({ subAccounts, accounts }, wallet) => {
    const walletAccounts = accountUtils.getWalletAccounts(wallet!.id, accounts);
    const accountsToSub = balanceSubUtils.getAccountsToSubscribe(wallet!, walletAccounts, accounts);

    return balanceSubUtils.getNewAccounts(subAccounts, accountsToSub);
  },
  target: $subAccounts,
});

sample({
  clock: [walletToSubSet, walletModel.$activeWallet],
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    subAccounts: $subAccounts,
  },
  filter: ({ statuses }, wallet) => {
    return Boolean(wallet) && Object.values(statuses).some(networkUtils.isConnectedStatus);
  },
  fn: ({ subAccounts, statuses, ...params }, wallet) => {
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

    return { apis, chains, walletId: wallet!.id, subAccounts };
  },
  target: subscribeChainsFx,
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: $subscriptions,
  filter: (subscriptions, { chainId, status }) => {
    const isDisabled = networkUtils.isDisconnectedStatus(status);
    const isError = networkUtils.isErrorStatus(status);

    return (isDisabled || isError) && Boolean(subscriptions[chainId]);
  },
  fn: (subscriptions, { chainId }) => ({ chainId, subscriptions }),
  target: unsubscribeChainFx,
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subAccounts: $subAccounts,
    subscriptions: $subscriptions,
  },
  filter: ({ subscriptions }, { chainId, status }) => {
    return networkUtils.isConnectedStatus(status) && !subscriptions[chainId];
  },
  fn: (params, { chainId }) => ({
    apis: params.apis,
    chains: [params.chains[chainId]],
    subAccounts: params.subAccounts,
  }),
  target: subscribeChainsFx,
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
