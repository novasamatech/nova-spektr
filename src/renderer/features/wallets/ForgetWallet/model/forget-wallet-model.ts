import { createEvent, sample, createEffect, createStore, createApi, attach, split } from 'effector';
import uniq from 'lodash/uniq';
import { Dictionary } from 'lodash';
import { spread } from 'patronum';

import { Account, AccountId, ID, MultisigAccount, ProxyAccount, ProxyGroup, Wallet } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { balanceModel } from '@entities/balance';
import { useForgetMultisig } from '@entities/multisig';
import { proxyModel } from '@entities/proxy';
import { wcDetailsModel } from '@widgets/WalletDetails/model/wc-details-model';

const { deleteMultisigTxs } = useForgetMultisig();

export type Callbacks = {
  onDeleteFinished: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const forgetWallet = createEvent<Wallet>();
const forgetSimpleWallet = createEvent<Wallet>();
const forgetMultisigWallet = createEvent<Wallet>();

const deleteMultisigOperationsFx = createEffect(async (account: MultisigAccount): Promise<void> => {
  try {
    await deleteMultisigTxs(account.accountId);
  } catch (e) {
    console.error(`Error while deleting multisig wallet with id ${account.walletId}`, e);
  }
});

type CheckForProxiedWalletsProps = {
  wallet: Wallet;
  wallets: Wallet[];
  accounts: Account[];
  proxies: Dictionary<ProxyAccount[]>;
  walletsProxyGroups: Dictionary<ProxyGroup[]>;
};
type CheckForProxiedWalletsResult = {
  proxiedWalletsToDelete: ID[];
  proxiedAccountsToDelete: AccountId[];
  proxiesToDelete: ProxyAccount[];
  proxyGroupsToDelete: ProxyGroup[];
};
const checkForProxiedWalletsFx = createEffect(
  ({
    wallet,
    wallets,
    accounts,
    proxies,
    walletsProxyGroups,
  }: CheckForProxiedWalletsProps): CheckForProxiedWalletsResult => {
    const walletAccountsIds = accounts.filter((a) => a.walletId === wallet.id).map((a) => a.accountId);

    const proxiedAccountsToDelete = accounts.filter(
      (a) => accountUtils.isProxiedAccount(a) && walletAccountsIds.includes(a.proxyAccountId),
    );
    const proxiedWalletsToDelete = uniq(proxiedAccountsToDelete.map((a) => a.walletId));

    const proxiesToDelete = proxiedAccountsToDelete
      .map((a) => a.accountId)
      .concat(walletAccountsIds)
      .reduce((acc, accountId) => (proxies[accountId] ? acc.concat(proxies[accountId]) : acc), [] as ProxyAccount[]);
    const proxyGroupsToDelete = proxiedWalletsToDelete.reduce(
      (acc, walletId) => (walletsProxyGroups[walletId] ? acc.concat(walletsProxyGroups[walletId]) : acc),
      [] as ProxyGroup[],
    );

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
  clock: [forgetWallet, wcDetailsModel.events.forgetButtonClicked],
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    proxies: proxyModel.$proxies,
    walletsProxyGroups: proxyModel.$walletsProxyGroups,
  },
  fn: ({ wallets, accounts, proxies, walletsProxyGroups }, wallet) => ({
    wallets,
    accounts,
    proxies,
    walletsProxyGroups,
    wallet,
  }),
  target: checkForProxiedWalletsFx,
});

sample({
  source: checkForProxiedWalletsFx.doneData,
  target: spread({
    proxiesToDelete: proxyModel.events.proxiesRemoved,
    proxiedWalletsToDelete: walletModel.events.walletsRemoved,
    proxiedAccountsToDelete: balanceModel.events.accountsBalancesRemoved,
    proxyGroupsToDelete: proxyModel.events.proxyGroupsRemoved,
  }),
});

sample({
  clock: [forgetSimpleWallet, forgetMultisigWallet],
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accountUtils.getWalletAccounts(wallet.id, accounts).map((a) => a.accountId),
  target: balanceModel.events.accountsBalancesRemoved,
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
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
