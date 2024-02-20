import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample, createEvent, scopeBind } from 'effector';
import { throttle, once, combineEvents, spread, previous } from 'patronum';
import { VoidFn } from '@polkadot/api/types';
import mapValues from 'lodash/mapValues';

import { AccountId, Balance, ChainId, ConnectionStatus, Wallet, Chain, ID } from '@shared/core';
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

const proceedWalletToSub = createEvent<Wallet>();

const $subscriptions = createStore<Subscriptions>({});
const $subAccounts = createStore<SubAccounts>({});
const $newestWalletToSub = createStore<Wallet | null>(null);

const $previousWallet = previous(walletModel.$activeWallet);

const populateBalancesFx = createEffect((accountIds: AccountId[]): Promise<Balance[]> => {
  return storageService.balances.readAll({ accountId: accountIds });
});

type UnsubChainsParams = {
  chainIds: ChainId[];
  subscriptions: Subscriptions;
};
const unsubscribeChainsFx = createEffect(({ chainIds, subscriptions }: UnsubChainsParams): Subscriptions => {
  return chainIds.reduce<Subscriptions>(
    (acc, chainId) => {
      const chainSubscription = acc[chainId];
      if (!chainSubscription) return acc;

      Object.values(chainSubscription).forEach((unsubFn) => {
        unsubFn[0].forEach((fn) => fn());
        unsubFn[1].forEach((fn) => fn());
      });

      acc[chainId] = undefined;

      return acc;
    },
    { ...subscriptions },
  );
});

type UnsubWalletParams = {
  walletId: ID;
  subscriptions: Subscriptions;
};
const unsubscribeWalletFx = createEffect(({ walletId, subscriptions }: UnsubWalletParams): Subscriptions => {
  return Object.entries(subscriptions).reduce<Subscriptions>((acc, [chainId, walletMap]) => {
    if (!walletMap || !walletMap[walletId]) return acc;

    const { [walletId]: walletToUnsub, ...rest } = walletMap;
    walletToUnsub[0].forEach((fn) => fn());
    walletToUnsub[1].forEach((fn) => fn());

    acc[chainId as ChainId] = Object.keys(rest).length > 0 ? rest : undefined;

    return acc;
  }, {});
});

type SubChainsParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Chain[];
  walletId?: ID;
  subAccounts: SubAccounts;
  subscriptions: Subscriptions;
};
const subscribeChainsFx = createEffect(
  async ({ apis, chains, walletId, subAccounts, subscriptions }: SubChainsParams): Promise<Subscriptions> => {
    const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });

    const balanceRequests = chains.reduce<Promise<[VoidFn[], VoidFn[]]>[]>((acc, chain) => {
      Object.entries(subAccounts[chain.chainId]).forEach(([id, accountIds]) => {
        if (walletId && Number(id) !== walletId) return;

        const subBalances = balanceService.subscribeBalances(apis[chain.chainId], chain, accountIds, boundUpdate);
        const subLocks = balanceService.subscribeLockBalances(apis[chain.chainId], chain, accountIds, boundUpdate);

        acc.push(Promise.all([subBalances, subLocks]));
      });

      return acc;
    }, []);

    const unsubFunctions = await Promise.all(balanceRequests);

    return chains.reduce<Subscriptions>(
      (acc, chain, index) => {
        Object.keys(subAccounts[chain.chainId]).forEach((id) => {
          if (walletId && Number(id) !== walletId) return;

          acc[chain.chainId] = { ...acc[chain.chainId], [Number(id)]: unsubFunctions[index] };
        });

        return acc;
      },
      { ...subscriptions },
    );
  },
);

type UpdateChainsParams = {
  subscriptions: Subscriptions;
  unsubParams: Omit<UnsubChainsParams, 'subscriptions'>;
  subParams: Omit<SubChainsParams, 'subscriptions'>;
};
const updateChainsSubscriptionsFx = createEffect(
  async ({ subscriptions, unsubParams, subParams }: UpdateChainsParams): Promise<Subscriptions> => {
    const newSubscription = await unsubscribeChainsFx({ ...unsubParams, subscriptions });

    return subscribeChainsFx({ ...subParams, subscriptions: newSubscription });
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
    hold: $newestWalletToSub,
    proceed: proceedWalletToSub,
  }),
});

sample({
  clock: unsubscribeWalletFx.doneData,
  source: $newestWalletToSub,
  filter: (wallet) => Boolean(wallet),
  fn: (wallet) => wallet!,
  target: [proceedWalletToSub, $newestWalletToSub.reinit],
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

sample({
  clock: throttle({
    source: networkModel.$connectionStatuses,
    timeout: SUBSCRIPTION_DELAY,
  }),
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
      unsubParams: { chainIds: disconnected },
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
