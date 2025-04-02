import { attach, createApi, createEffect, createEvent, createStore, sample, split } from 'effector';
import uniq from 'lodash/uniq';
import { spread } from 'patronum';

import { type ProxyAccount, type ProxyGroup, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceModel } from '@/entities/balance';
import { proxyModel } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
// TODO: fix circular dependencies
// eslint-disable-next-line boundaries/entry-point
import { proxiesModel } from '@/features/proxies';

export type Callbacks = {
  onDeleteFinished: () => void;
};

const forgetWallet = createEvent<Wallet>();
const forgetSimpleWallet = createEvent<Wallet>();
const forgetMultisigWallet = createEvent<Wallet>();
const forgetWcWallet = createEvent<Wallet>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

type CheckForProxiedWalletsParams = {
  wallet: Wallet;
  wallets: Wallet[];
  proxies: Record<AccountId, ProxyAccount[]>;
  walletsProxyGroups: Record<Wallet['id'], ProxyGroup[]>;
};
type CheckForProxiedWalletsResult = {
  proxiedWalletsToDelete: number[];
  proxiedAccountsToDelete: AccountId[];
  proxiesToDelete: ProxyAccount[];
  proxyGroupsToDelete: ProxyGroup[];
};
const findProxiedWalletsFx = createEffect(
  ({ wallet, wallets, proxies, walletsProxyGroups }: CheckForProxiedWalletsParams): CheckForProxiedWalletsResult => {
    const walletAccountsIds = wallet.accounts.map((a) => a.accountId);

    const proxiedAccountsToDelete = walletUtils.getAccountsBy(wallets, (a) => {
      return accountUtils.isProxiedAccount(a) && walletAccountsIds.includes(a.proxyAccountId);
    });
    const proxiedWalletsToDelete = uniq(proxiedAccountsToDelete.map((a) => a.walletId));

    const proxiesToDelete = proxiedAccountsToDelete
      .map((a) => a.accountId)
      .concat(walletAccountsIds)
      .reduce<ProxyAccount[]>((acc, accountId) => {
        if (proxies[accountId]) {
          acc.push(...proxies[accountId]);
        }

        return acc;
      }, []);

    const proxyGroupsToDelete = proxiedWalletsToDelete.reduce((acc, walletId) => {
      if (walletsProxyGroups[walletId]) {
        acc.push(...walletsProxyGroups[walletId]);
      }

      return acc;
    }, [] as ProxyGroup[]);

    return {
      proxiedWalletsToDelete,
      proxiesToDelete,
      proxiedAccountsToDelete: proxiedAccountsToDelete.map((a) => a.accountId),
      proxyGroupsToDelete,
    };
  },
);

split({
  source: forgetWallet,
  match: {
    multisigWallet: (wallet: Wallet) => walletUtils.isMultisig(wallet),
  },
  cases: {
    multisigWallet: forgetMultisigWallet,
    __: forgetSimpleWallet,
  },
});

sample({
  clock: [forgetWallet, forgetWcWallet],
  source: {
    proxies: proxyModel.$proxies,
    wallets: walletModel.$allWallets,
    walletsProxyGroups: proxyModel.$walletsProxyGroups,
  },
  fn: (params, wallet) => ({ ...params, wallet }),
  target: findProxiedWalletsFx,
});

sample({
  clock: findProxiedWalletsFx.doneData,
  target: spread({
    proxiesToDelete: proxyModel.events.proxiesRemoved,
    proxiedWalletsToDelete: walletModel.events.walletsRemoved,
    proxiedAccountsToDelete: balanceModel.events.balancesRemoved,
    proxyGroupsToDelete: proxyModel.events.proxyGroupsRemoved,
  }),
});

sample({
  clock: [forgetSimpleWallet, forgetMultisigWallet],
  fn: (wallet) => wallet.accounts.map((a) => a.accountId),
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: forgetMultisigWallet,
  target: walletModel.events.walletHidden,
});

sample({
  clock: forgetSimpleWallet,
  fn: (wallet) => wallet.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: [walletModel.events.walletRemovedSuccess, walletModel.events.walletHiddenSuccess],
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onDeleteFinished(),
  }),
});

// TODO this connection is dirty, we should decouple wallet delete logic and proxy manipulation.
sample({
  clock: [walletModel.events.walletRemovedSuccess, walletModel.events.walletHiddenSuccess],
  target: proxiesModel.findAllProxies,
});

export const forgetWalletModel = {
  events: {
    forgetWallet,
    forgetWcWallet,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
