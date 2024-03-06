import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample, scopeBind, createEvent, combine, restore } from 'effector';
import { VoidFn } from '@polkadot/api/types';
import { throttle } from 'patronum';
import keyBy from 'lodash/keyBy';

import { Account, AccountId, Balance, Chain, ChainId, ConnectionStatus } from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { balanceModel, balanceSubscriptionService, useBalanceService } from '@entities/balance';
import { SUBSCRIPTION_DELAY } from '../common/constants';

const balanceService = useBalanceService();

type SubscriptionObject = {
  accounts: AccountId[];
  subscription: [Promise<VoidFn[]>, Promise<VoidFn[]>];
};

type BalanceSubscribeMap = Record<ChainId, SubscriptionObject>;

const balancesSubscribed = createEvent();

const $subscriptions = createStore<BalanceSubscribeMap>({});
const $subscriptionAccounts = createStore<Account[]>([]);

type SubscribeParams = {
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  statuses: Record<ChainId, ConnectionStatus>;
  subscriptions: BalanceSubscribeMap;
  accounts: Account[];
};
// TODO: Revisit this effect https://app.clickup.com/t/86939u5ut
const createSubscriptionsBalancesFx = createEffect(
  async ({
    chains,
    apis,
    statuses,
    subscriptions,
    accounts,
  }: SubscribeParams): Promise<Record<ChainId, SubscriptionObject>> => {
    const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });

    const newSubscriptions = {} as Record<ChainId, SubscriptionObject>;

    const balanceSubscriptions = Object.entries(apis).map(async (apiMap) => {
      const [chainId, api] = apiMap as [ChainId, ApiPromise];
      const chain = chains[chainId];

      const accountIds = accounts.reduce<Record<AccountId, boolean>>((acc, account) => {
        if (accountUtils.isChainIdAndCryptoTypeMatch(account, chain)) {
          acc[account.accountId] = true;
        }

        return acc;
      }, {});

      const uniqAccountIds = Object.keys(accountIds) as AccountId[];
      const networkConnected = networkUtils.isConnectedStatus(statuses[chainId]);
      const oldSubscription = subscriptions[chainId];

      if (!networkConnected || !uniqAccountIds.length) {
        await unsubscribeBalancesFx({ chainId, subscription: oldSubscription });

        return;
      }

      if (oldSubscription) {
        const sameAccounts = oldSubscription?.accounts.join(',') === uniqAccountIds.join(',');

        if (sameAccounts) return;

        await unsubscribeBalancesFx({ chainId, subscription: oldSubscription });
      }

      try {
        if (!chain) return;

        const balanceSubs = balanceSubscriptionService.subscribeBalances(chain, api, uniqAccountIds, boundUpdate);
        const locksSubs = balanceSubscriptionService.subscribeLockBalances(chain, api, uniqAccountIds, boundUpdate);

        newSubscriptions[chainId] = {
          accounts: uniqAccountIds,
          subscription: [balanceSubs, locksSubs],
        };
      } catch (error) {
        // TODO: Can't subscribe to Rococo Asset Hub testnet
        console.log('ERROR: cannot subscribe to balance for', chainId, error);
      }
    });

    // Wait unsubscribe if needed
    await Promise.all(balanceSubscriptions);

    return newSubscriptions;
  },
);

type UnsubscribeParams = {
  chainId: ChainId;
  subscription: SubscriptionObject;
};
const unsubscribeBalancesFx = createEffect(async ({ subscription }: UnsubscribeParams) => {
  if (!subscription) return;

  const [balanceUnsubs, lockUnsubs] = await Promise.all(subscription.subscription);

  balanceUnsubs.forEach((fn) => fn());
  lockUnsubs.forEach((fn) => fn());
});

const populateBalancesFx = createEffect((accounts: AccountId[]): Promise<Balance[]> => {
  return balanceService.getBalances(accounts);
});

sample({
  clock: walletModel.$activeAccounts,
  source: { accounts: walletModel.$accounts, wallet: walletModel.$activeWallet },
  fn: ({ accounts, wallet }, activeAccounts) => {
    const accountsMap = keyBy(accounts, 'accountId');

    const subscriptionAccounts = activeAccounts.filter(
      (account) => wallet && accountUtils.isNonBaseVaultAccount(account, wallet),
    );

    activeAccounts.forEach((account) => {
      if (accountUtils.isMultisigAccount(account)) {
        account.signatories.forEach((signatory) => {
          if (accountsMap[signatory.accountId]) {
            subscriptionAccounts.push(accountsMap[signatory.accountId]);
          }
        });
      }

      // TODO: Add same for proxied accounts https://app.clickup.com/t/86934k047
    });

    return subscriptionAccounts;
  },
  target: $subscriptionAccounts,
});

sample({
  clock: $subscriptionAccounts,
  fn: (accounts) => accounts.map((account) => account.accountId),
  target: populateBalancesFx,
});

sample({
  clock: populateBalancesFx.doneData,
  target: balanceModel.$balancesBuffer,
});

sample({
  clock: throttle({
    source: combine([restore(populateBalancesFx.doneData, null), networkModel.$connectionStatuses]),
    timeout: SUBSCRIPTION_DELAY,
  }),
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    subscriptions: $subscriptions,
    accounts: $subscriptionAccounts,
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
  events: {
    balancesSubscribed,
  },
};
