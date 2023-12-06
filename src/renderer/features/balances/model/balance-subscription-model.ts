import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample } from 'effector';
import { VoidFn } from '@polkadot/api/types';

import { AccountId, Chain, ChainId, ConnectionStatus } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { balanceModel, balanceSubscriptionService } from '@entities/balance';

type SubscriptionObject = {
  accounts: AccountId[];
  subscription: Promise<[VoidFn[], VoidFn[]]>;
};

type BalanceSubscribeMap = Record<ChainId, SubscriptionObject>;

const $subscriptions = createStore<BalanceSubscribeMap>({});

type SubscribeParams = {
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  statuses: Record<ChainId, ConnectionStatus>;
  subscriptions: BalanceSubscribeMap;
  accountIds: AccountId[];
};
const createSubscriptionsBalancesFx = createEffect(
  ({ chains, apis, statuses, subscriptions, accountIds }: SubscribeParams): Record<ChainId, SubscriptionObject> => {
    const newSubscriptions = {} as Record<ChainId, SubscriptionObject>;

    Object.entries(apis).forEach(async ([chainId, api]) => {
      const networkConnected = statuses[chainId as ChainId] === ConnectionStatus.CONNECTED;
      const oldSubscription = subscriptions[chainId as ChainId];

      if (!networkConnected) {
        await unsubscribeBalancesFx({
          chainId: chainId as ChainId,
          subscription: oldSubscription,
        });

        return;
      }

      if (oldSubscription) {
        const sameAccounts = oldSubscription?.accounts.join(',') === accountIds.join(',');

        if (sameAccounts) {
          return;
        }

        await unsubscribeBalancesFx({
          chainId: chainId as ChainId,
          subscription: oldSubscription,
        });
      }

      const chain = chains[chainId as ChainId];

      const balanceSubs = balanceSubscriptionService.subscribeBalances(chain, api, accountIds, (balances) => {
        balances.forEach((balance) => balanceModel.events.balanceUpdated(balance));
      });
      const locksSubs = balanceSubscriptionService.subscribeLockBalances(chain, api, accountIds, (balances) => {
        balances.forEach((balance) => balanceModel.events.balanceUpdated(balance));
      });

      newSubscriptions[chainId as ChainId] = {
        accounts: accountIds,
        subscription: Promise.all([balanceSubs, locksSubs]),
      };
    });

    return newSubscriptions;
  },
);

type UnsubscribeParams = {
  chainId: ChainId;
  subscription: SubscriptionObject;
};
const unsubscribeBalancesFx = createEffect(async ({ subscription }: UnsubscribeParams) => {
  if (!subscription) {
    return;
  }

  const [balanceUnsubs, lockUnsubs] = await subscription.subscription;

  balanceUnsubs.forEach((fn) => fn());
  lockUnsubs.forEach((fn) => fn());
});

sample({
  clock: [networkModel.$connectionStatuses, walletModel.$activeAccounts],
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subscriptions: $subscriptions,
    accounts: walletModel.$activeAccounts,
    statuses: networkModel.$connectionStatuses,
  },
  fn: ({ statuses, apis, chains, subscriptions, accounts }) => ({
    apis,
    chains,
    statuses,
    subscriptions,
    accountIds: [...new Set(accounts.map((account) => account.accountId))],
  }),
  target: createSubscriptionsBalancesFx,
});

sample({
  clock: createSubscriptionsBalancesFx.doneData,
  source: $subscriptions,
  fn: (subscriptions, newSubscriptions) => ({ ...subscriptions, ...newSubscriptions }),
  target: $subscriptions,
});

export const balanceSubscriptionModel = {
  $subscriptions,
};
