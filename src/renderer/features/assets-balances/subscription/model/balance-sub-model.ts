import { type ApiPromise } from '@polkadot/api';
import { attach, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import mapValues from 'lodash/mapValues';
import { combineEvents, once, previous, spread } from 'patronum';

import { balanceService } from '@/shared/api/balances';
import { balanceMapper, storageService } from '@/shared/api/storage';
import {
  type AccountId,
  type Balance,
  type Chain,
  type ChainId,
  type ConnectionStatus,
  type ID,
  type Wallet,
} from '@/shared/core';
import { isFulfilled } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { balanceSubUtils } from '../lib/balance-sub-utils';
import { type SubAccounts, type Subscriptions } from '../lib/types';

const walletToUnsubSet = createEvent<Wallet>();
const walletToSubSet = createEvent<Wallet>();
const balancesUpdated = createEvent<Omit<Balance, 'id'>[]>();

const $subscriptions = createStore<Subscriptions>({});
const $subAccounts = createStore<SubAccounts>({});
const $balancesBucket = createStore<Balance[]>([]);

const $previousWallet = previous(walletModel.$activeWallet);

const populateBalancesFx = createEffect(async (accountIds: Set<AccountId>): Promise<Balance[]> => {
  if (accountIds.size === 0) return Promise.resolve([]);

  const balances = await storageService.balances.readAll();

  return balances.filter((balance) => accountIds.has(balance.accountId)).map(balanceMapper.fromDB);
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
          for (const unsub of fns) {
            if (isFulfilled(unsub)) unsub.value();
          }
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

  for (const unsubFn of Object.values(chainSubscription)) {
    Promise.allSettled(unsubFn)
      .then((fns) => {
        for (const unsub of fns) {
          if (isFulfilled(unsub)) unsub.value();
        }
      })
      .catch((error) => {
        console.log(`Error while unsubscribing from balances for chainId - ${chainId}`, error);
      });
  }

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

    const boundUpdate = scopeBind(balancesUpdated, { safe: true });

    return chains.reduce<Subscriptions>(
      (acc, chain) => {
        for (const [id, accountIds] of Object.entries(subAccounts[chain.chainId])) {
          if (walletId && Number(id) !== walletId) continue;

          const unsubPromises = [
            ...balanceService.subscribeBalances(apis[chain.chainId], chain, accountIds, boundUpdate),
            ...balanceService.subscribeLockBalances(apis[chain.chainId], chain, accountIds, boundUpdate),
          ];

          if (acc[chain.chainId]) {
            acc[chain.chainId]![Number(id)] = unsubPromises;
          } else {
            acc[chain.chainId] = { [Number(id)]: unsubPromises };
          }
        }

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
    walletToSub: wallet!,
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
      for (const accountId of Object.values(walletMap).flat()) {
        acc.add(accountId);
      }

      return acc;
    }, new Set());
  },
  target: populateBalancesFx,
});

sample({
  clock: populateBalancesFx.doneData,
  source: $balancesBucket,
  fn: (balancesBucket, oldBalances) => {
    if (balancesBucket.length === 0) return { set: oldBalances };

    return {
      bucket: [],
      set: balanceUtils.getMergeBalances(oldBalances, balancesBucket),
    };
  },
  target: spread({
    bucket: $balancesBucket,
    set: balanceModel.events.balancesSet,
  }),
});

sample({
  clock: balancesUpdated,
  source: {
    balancesBucket: $balancesBucket,
    isPending: populateBalancesFx.pending,
  },
  fn: ({ balancesBucket, isPending }, newBalances) => {
    const updatedBalances = balanceUtils.getMergeBalances(balancesBucket, newBalances as Balance[]);

    return {
      bucket: isPending ? updatedBalances : [],
      update: updatedBalances,
    };
  },
  target: spread({
    bucket: $balancesBucket,
    update: balanceModel.events.balancesUpdated,
  }),
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
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
  },
  filter: (_, wallet) => Boolean(wallet),
  fn: ({ subAccounts, wallets, chains }, wallet) => {
    const accountsToSub = balanceSubUtils.getSiblingAccounts(wallet!, wallets, chains);

    return balanceSubUtils.formSubAccounts(wallet!.id, accountsToSub, subAccounts, chains);
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
    walletToSubSet,
    walletToUnsubSet,
  },

  _test: {
    $subscriptions,
    $subAccounts,
  },
};
