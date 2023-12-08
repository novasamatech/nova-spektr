import { ApiPromise } from '@polkadot/api';
import { combine, createEffect, createStore, sample } from 'effector';
import { VoidFn } from '@polkadot/api/types';
import { throttle } from 'patronum';

import { Account, AccountId, Balance, Chain, ChainId, ConnectionStatus } from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { balanceModel, balanceSubscriptionService, useBalanceService } from '@entities/balance';

const balanceService = useBalanceService();

type SubscriptionObject = {
  accounts: AccountId[];
  subscription: [Promise<VoidFn[]>, Promise<VoidFn[]>];
};

type BalanceSubscribeMap = Record<ChainId, SubscriptionObject>;

const $subscriptions = createStore<BalanceSubscribeMap>({});

type SubscribeParams = {
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  statuses: Record<ChainId, ConnectionStatus>;
  subscriptions: BalanceSubscribeMap;
  accounts: Account[];
};
const createSubscriptionsBalancesFx = createEffect(
  async ({
    chains,
    apis,
    statuses,
    subscriptions,
    accounts,
  }: SubscribeParams): Promise<Record<ChainId, SubscriptionObject>> => {
    const newSubscriptions = {} as Record<ChainId, SubscriptionObject>;

    await Promise.all(
      Object.entries(apis).map(async ([chainId, api]) => {
        try {
          const accountIds = [
            ...new Set(
              accounts
                .filter((a) => accountUtils.isChainIdMatch(a, chainId as ChainId))
                .map((account) => account.accountId),
            ),
          ];

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
            subscription: [balanceSubs, locksSubs],
          };
        } catch (e) {
          // TODO: Can't subscribe to Rococo Asset Hub testnet
          console.log('ERROR: cannot subscribe to balance for', chainId, e);
        }
      }),
    );

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

  const [balanceUnsubs, lockUnsubs] = await Promise.all(subscription.subscription);

  balanceUnsubs.forEach((fn) => fn());
  lockUnsubs.forEach((fn) => fn());
});

const populateBalancesFx = createEffect((accounts: AccountId[]): Promise<Balance[]> => {
  return balanceService.getBalances(accounts);
});

sample({
  clock: walletModel.$activeAccounts,
  fn: (accounts) => accounts.map((account) => account.accountId),
  target: populateBalancesFx,
});

sample({
  clock: populateBalancesFx.doneData,
  target: balanceModel.$balances,
});

sample({
  clock: throttle({
    source: combine([networkModel.$connectionStatuses, walletModel.$activeAccounts]),
    timeout: 500,
  }),
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subscriptions: $subscriptions,
    accounts: walletModel.$activeAccounts,
    statuses: networkModel.$connectionStatuses,
  },
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
