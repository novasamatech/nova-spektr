import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { throttle } from 'patronum';
import { VoidFn } from '@polkadot/api/types';

import { AccountId, Balance, Chain, ChainId, kernelModel } from '@shared/core';
import { NetworkStatus, networkModel } from './network-model';
import { useBalance } from '../../newAsset';
import { walletModel } from '../../wallet';

type BalanceUnsubs = Record<ChainId, Promise<[VoidFn[], VoidFn[]]>>;

const balanceService = useBalance();

const balanceUpdated = createEvent<Balance>();

const $balances = createStore<Balance[]>([]);
const $subscriptions = createStore<BalanceUnsubs>({});

type SubscribeBalanceType = {
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  statuses: Record<ChainId, NetworkStatus>;
  subscriptions: BalanceUnsubs;
  accountIds: AccountId[];
};
const subscribeBalancesFx = createEffect(
  async ({
    chains,
    apis,
    statuses,
    subscriptions,
    accountIds,
  }: SubscribeBalanceType): Promise<Record<ChainId, Promise<[VoidFn[], VoidFn[]]>>> => {
    const newSubscriptions = {} as Record<ChainId, Promise<[VoidFn[], VoidFn[]]>>;
    const apisList = Object.entries(apis);

    apisList.forEach(async ([chainId, api]) => {
      if (!subscriptions[chainId as ChainId] && statuses[chainId as ChainId] === NetworkStatus.CONNECTED) {
        const chain = chains[chainId as ChainId];

        newSubscriptions[chainId as ChainId] = Promise.all([
          balanceService.subscribeBalances(chain, api, accountIds, (balances) => {
            balances.forEach((balance) => {
              console.log('xcmBalanceUpdated', chainId);
              balanceUpdated(balance);
            });
          }),
          balanceService.subscribeLockBalances(chain, api, accountIds, (balances) => {
            balances.forEach((balance) => {
              console.log('xcmBalanceUpdatedLock', chainId);

              balanceUpdated(balance);
            });
          }),
        ]);
      }
    });

    return newSubscriptions;
  },
);

const insertBalancesFx = createEffect(async (balances: Balance[]): Promise<void> => {
  await balanceService.insertBalances(balances);
});

const populateBalancesFx = createEffect(async (): Promise<Balance[]> => {
  return balanceService.getAllBalances();
});

forward({
  from: kernelModel.events.appStarted,
  to: populateBalancesFx,
});

sample({
  clock: populateBalancesFx.doneData,
  filter: (balances) => {
    console.log('xcmBalancePop', balances.length);

    return true;
  },
  target: $balances,
});

throttle({
  source: $balances,
  timeout: 5000,
  target: insertBalancesFx,
});

sample({
  clock: [networkModel.$networkStatuses, walletModel.$activeAccounts],
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subscriptions: $subscriptions,
    accounts: walletModel.$activeAccounts,
    statuses: networkModel.$networkStatuses,
  },
  fn: ({ statuses, apis, chains, subscriptions, accounts }) => ({
    apis,
    chains,
    statuses,
    subscriptions,
    accountIds: [...new Set(accounts.map((account) => account.accountId))],
  }),
  target: subscribeBalancesFx,
});

sample({
  clock: subscribeBalancesFx.doneData,
  source: {
    subscriptions: $subscriptions,
  },
  fn: ({ subscriptions }, newSubscriptions) => {
    return {
      ...subscriptions,
      ...newSubscriptions,
    };
  },
  target: $subscriptions,
});

sample({
  clock: balanceUpdated,
  source: $balances,
  fn: (balances, newBalance) => {
    const oldBalanceIndex = balances.findIndex((balance) => {
      const isSameAccount = balance.accountId === newBalance.accountId;
      const isSameAssetId = balance.assetId === newBalance.assetId;
      const isSameChainId = balance.chainId === newBalance.chainId;

      return isSameAccount && isSameAssetId && isSameChainId;
    });

    if (oldBalanceIndex !== -1) {
      balances[oldBalanceIndex] = {
        ...balances[oldBalanceIndex],
        ...newBalance,
      };
    } else {
      balances.push(newBalance);
    }

    // console.log('xcmNewBalance', newBalance);

    return [...balances];
  },
  target: $balances,
});

export const balanceModel = {
  $balances,
};
