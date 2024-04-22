import { createEvent, sample, createEffect, createStore, createApi, attach, split } from 'effector';
import uniq from 'lodash/uniq';
import { spread } from 'patronum';

import { AccountId, ID, MultisigAccount, ProxyAccount, ProxyGroup, Wallet, Account } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { balanceModel } from '@entities/balance';
import { useForgetMultisig } from '@entities/multisig';
import { proxyModel } from '@entities/proxy';

const { deleteMultisigTxs } = useForgetMultisig();

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

const deleteMultisigOperationsFx = createEffect(async (account: MultisigAccount): Promise<void> => {
  try {
    await deleteMultisigTxs(account.accountId);
  } catch (e) {
    console.error(`Error while deleting multisig wallet with id ${account.walletId}`, e);
  }
});

type CheckForProxiedWalletsParams = {
  wallet: Wallet;
  accounts: Account[];
  proxies: Record<AccountId, ProxyAccount[]>;
  walletsProxyGroups: Record<Wallet['id'], ProxyGroup[]>;
};
type CheckForProxiedWalletsResult = {
  proxiedWalletsToDelete: ID[];
  proxiedAccountsToDelete: ID[];
  proxiesToDelete: ProxyAccount[];
  proxyGroupsToDelete: ProxyGroup[];
};
const findProxiedWalletsFx = createEffect(
  ({ wallet, accounts, proxies, walletsProxyGroups }: CheckForProxiedWalletsParams): CheckForProxiedWalletsResult => {
    const walletAccountsIds = accountUtils.getWalletAccounts(wallet.id, accounts).map((a) => a.accountId);

    const proxiedAccountsToDelete = accounts.filter(
      (a) => accountUtils.isProxiedAccount(a) && walletAccountsIds.includes(a.proxyAccountId),
    );
    const proxiedWalletsToDelete = uniq(proxiedAccountsToDelete.map((a) => a.walletId));

    const proxiesToDelete = proxiedAccountsToDelete
      .map((a) => a.accountId)
      .concat(walletAccountsIds)
      .reduce<ProxyAccount[]>((acc, accountId) => (proxies[accountId] ? acc.concat(proxies[accountId]) : acc), []);
    const proxyGroupsToDelete = proxiedWalletsToDelete.reduce((acc, walletId) => {
      if (walletsProxyGroups[walletId]) {
        acc.push(...walletsProxyGroups[walletId]);
      }

      return acc;
    }, [] as ProxyGroup[]);

    return {
      proxiedWalletsToDelete,
      proxiesToDelete,
      proxiedAccountsToDelete: proxiedAccountsToDelete.map((a) => a.id),
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
    accounts: walletModel.$accounts,
    proxies: proxyModel.$proxies,
    walletsProxyGroups: proxyModel.$walletsProxyGroups,
  },
  fn: (params, wallet) => ({ ...params, wallet }),
  target: findProxiedWalletsFx,
});

sample({
  source: findProxiedWalletsFx.doneData,
  target: spread({
    proxiesToDelete: proxyModel.events.proxiesRemoved,
    proxiedWalletsToDelete: walletModel.events.walletsRemoved,
    proxiedAccountsToDelete: balanceModel.events.balancesRemoved,
    proxyGroupsToDelete: proxyModel.events.proxyGroupsRemoved,
  }),
});

sample({
  clock: [forgetSimpleWallet, forgetMultisigWallet],
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accountUtils.getWalletAccounts(wallet.id, accounts).map((a) => a.id),
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: forgetMultisigWallet,
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accounts.find((a) => a.walletId === wallet.id) as MultisigAccount,
  target: deleteMultisigOperationsFx,
});

sample({
  clock: forgetWallet,
  fn: (wallet) => wallet.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onDeleteFinished(),
  }),
});

export const forgetWalletModel = {
  events: {
    forgetWallet,
    forgetWcWallet,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
