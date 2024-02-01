import { ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample, createEvent } from 'effector';
import { previous, throttle } from 'patronum';

import { AccountId, Balance, ChainId, ConnectionStatus, Wallet, Chain } from '@shared/core';
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

const chainsUnsubscribed = createEvent<ChainId[]>();
const chainsSubscribed = createEvent<ChainId[]>();

const $subscriptions = createStore<Subscriptions>({});
const $subAccounts = createStore<SubAccounts>({});
const $previousWallet = previous(walletModel.$activeWallet);

const populateBalancesFx = createEffect((accountIds: AccountId[]): Promise<Balance[]> => {
  return storageService.balances.readAll({ accountId: accountIds });
});

type UnsubParams = {
  chainIds: ChainId[];
  subscriptions: Subscriptions;
};
const unsubscribeFromChainsFx = createEffect(({ chainIds, subscriptions }: UnsubParams): Subscriptions => {
  console.log('=== UNSUB');

  return chainIds.reduce<Subscriptions>((acc, chainId) => {
    const chainSubscription = acc[chainId];
    if (!chainSubscription) return acc;

    Object.values(chainSubscription).forEach((unsubFn) => {
      unsubFn[0]();
      unsubFn[1]();
    });

    acc[chainId] = undefined;

    return acc;
  }, subscriptions);
});

type SubParams = {
  apis: Record<ChainId, ApiPromise>;
  chains: Chain[];
  // chainIds: ChainId[];
  subAccounts: SubAccounts;
  subscriptions: Subscriptions;
};
const subscribeToChainsFx = createEffect(({ apis, chains, subAccounts, subscriptions }: SubParams): Subscriptions => {
  console.log('=== SUB');

  // const newSubscriptions: Record<ChainId, UnsubMap> = {};

  // const x = chains.reduce((acc, chain) => {}, []);

  return { ...subscriptions };
  // const boundUpdate = scopeBind(balanceModel.events.balancesUpdated);
  //
  // const x = chainIds.map((chainId) => {});
  //
  // const x = Object.entries(subAccounts).map(([walletName, account]) => {});
  //
  // balanceService.subscribeBalances(api, chain, accs, boundUpdate);
  // balanceService.subscribeLockBalances(api, chain, accs, boundUpdate);
  //
  // return chainIds.reduce<Subscription>((acc, chainId) => {
  //   const chainSubscription = subscriptions[chainId];
  //   if (!chainSubscription) return acc;
  //
  //   acc[chainId] = {
  //     a: {
  //       accounts: [],
  //       unsubFn: [],
  //     },
  //   };

  //   Object.values(chainSubscription).forEach((sub) => {
  //     sub.unsubFn[0]();
  //     sub.unsubFn[1]();
  //   });
  //
  //   return acc;
  // }, subscriptions);
});

// TODO: might not work for $previousWallet
// TODO: run unsub for concrete wallet + all chains
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

/*
 *
 * subs: {
 *  [chainId]: {
 *    [walletId]: [unsub, unsub],
 *  }
 * }
 *
 * subs: {
 *  [chainId]: {
 *    [walletId]: [acc_id1, acc_id2],
 *  }
 * }
 *
 */

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

// type SubscribeParams = {
//   chains: Record<ChainId, Chain>;
//   apis: Record<ChainId, ApiPromise>;
//   statuses: Record<ChainId, ConnectionStatus>;
//   subscriptions: BalanceSubscribeMap;
//   accounts: Account[];
// };
// // TODO: Revisit this effect https://app.clickup.com/t/86939u5ut
// const createSubscriptionsBalancesFx = createEffect(
//   async ({
//     chains,
//     apis,
//     statuses,
//     subscriptions,
//     accounts,
//   }: SubscribeParams): Promise<Record<ChainId, SubscriptionObject>> => {
//     const boundUpdate = scopeBind(balanceModel.events.balancesUpdated, { safe: true });
//
//     const newSubscriptions = {} as Record<ChainId, SubscriptionObject>;
//
//     const balanceSubscriptions = Object.entries(apis).map(async ([chainId, api]) => {
//       const accountIds = accounts.reduce<Record<AccountId, boolean>>((acc, account) => {
//         if (accountUtils.isChainIdMatch(account, chainId as ChainId)) {
//           acc[account.accountId] = true;
//         }
//
//         return acc;
//       }, {});
//
//       const uniqAccountIds = Object.keys(accountIds) as AccountId[];
//       const networkConnected = statuses[chainId as ChainId] === ConnectionStatus.CONNECTED;
//       const oldSubscription = subscriptions[chainId as ChainId];
//
//       if (!networkConnected) {
//         await unsubscribeBalancesFx({
//           chainId: chainId as ChainId,
//           subscription: oldSubscription,
//         });
//
//         return;
//       }
//
//       if (oldSubscription) {
//         const sameAccounts = oldSubscription?.accounts.join(',') === uniqAccountIds.join(',');
//
//         if (sameAccounts) return;
//
//         await unsubscribeBalancesFx({
//           chainId: chainId as ChainId,
//           subscription: oldSubscription,
//         });
//       }
//
//       const chain = chains[chainId as ChainId];
//
//       try {
//         const balanceSubs = balanceService.subscribeBalances(api, chain, uniqAccountIds, boundUpdate);
//         const locksSubs = balanceService.subscribeLockBalances(api, chain, uniqAccountIds, boundUpdate);
//
//         newSubscriptions[chainId as ChainId] = {
//           accounts: uniqAccountIds,
//           subscription: [balanceSubs, locksSubs],
//         };
//       } catch (e) {
//         // TODO: Can't subscribe to Rococo Asset Hub testnet
//         console.log('ERROR: cannot subscribe to balance for', chainId, e);
//       }
//     });
//
//     // Wait unsubscribe if needed
//     await Promise.all(balanceSubscriptions);
//
//     return newSubscriptions;
//   },
// );
//
// type UnsubscribeParams = {
//   chainId: ChainId;
//   subscription: SubscriptionObject;
// };
// const unsubscribeBalancesFx = createEffect(async ({ subscription }: UnsubscribeParams) => {
//   if (!subscription) return;
//
//   const [balanceUnsubs, lockUnsubs] = await Promise.all(subscription.subscription);
//
//   balanceUnsubs.forEach((fn) => fn());
//   lockUnsubs.forEach((fn) => fn());
// });
//
// sample({
//   clock: $accountsToSubscribe,
//   fn: (accounts) => accounts.map((account) => account.accountId),
//   target: populateBalancesFx,
// });
//
// sample({
//   clock: populateBalancesFx.doneData,
//   target: balanceModel.$balancesBuffer,
// });
//
// sample({
//   clock: throttle({
//     source: combine([restore(populateBalancesFx.doneData, null), networkModel.$connectionStatuses]),
//     timeout: SUBSCRIPTION_DELAY,
//   }),
//   source: {
//     apis: networkModel.$apis,
//     chains: networkModel.$chains,
//     subscriptions: $subscriptions,
//     accounts: $accountsToSubscribe,
//     statuses: networkModel.$connectionStatuses,
//   },
//   target: createSubscriptionsBalancesFx,
// });
//
// sample({
//   clock: createSubscriptionsBalancesFx.doneData,
//   source: $subscriptions,
//   fn: (subscriptions, newSubscriptions) => ({ ...subscriptions, ...newSubscriptions }),
//   target: $subscriptions,
// });

export const balanceSubModel = {
  events: {
    balancesSubStarted,
    walletToSubSet,
    walletToUnsubSet,
  },
};
