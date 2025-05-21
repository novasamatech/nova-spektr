import { attach, createApi, createEffect, createEvent, createStore, sample, split } from 'effector';
import uniq from 'lodash/uniq';
import { spread } from 'patronum';

import { type MultisigAccount, type ProxyAccount, type ProxyGroup, type Wallet } from '@/shared/core';
import { series } from '@/shared/effector';
import { dictionary, groupBy } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { useForgetMultisig } from '@/entities/multisig';
import { proxyModel } from '@/entities/proxy';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';

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
  accounts: AnyAccount[];
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
  ({ wallet, accounts, proxies, walletsProxyGroups }: CheckForProxiedWalletsParams): CheckForProxiedWalletsResult => {
    const walletAccountsIds = accountService.filterAccountsByWallet(accounts, wallet.id).map((a) => a.accountId);

    const proxiedAccountsToDelete = accounts.filter((a) => {
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

const walletsRemoved = createEvent<Wallet['id']>();

sample({
  clock: [forgetWallet, forgetWcWallet],
  source: {
    proxies: proxyModel.$proxies,
    accounts: accounts.$list,
    walletsProxyGroups: proxyModel.$walletsProxyGroups,
  },
  filter: ({ accounts }, { id: walletId }) => {
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);
    const accountsToDeleteMap = dictionary(accountsToDelete, 'accountId');

    return !accounts.some(
      (acc) =>
        accountsToDeleteMap[acc.accountId] &&
        !accountUtils.isWatchOnlyAccount(acc) &&
        !accountUtils.isProxiedAccount(acc) &&
        acc.walletId !== walletId,
    );
  },
  fn: (params, wallet) => ({ ...params, wallet }),
  target: findProxiedWalletsFx,
});

sample({
  clock: findProxiedWalletsFx.doneData,
  target: spread({
    proxiesToDelete: proxyModel.events.proxiesRemoved,
    proxiedWalletsToDelete: series(walletsRemoved),
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
  fn: (wallet) => wallet.accounts[0] as MultisigAccount,
  target: deleteMultisigOperationsFx,
});

sample({
  clock: forgetMultisigWallet,
  target: walletModel.events.walletHidden,
});

sample({
  clock: [forgetSimpleWallet, forgetWcWallet],
  fn: (wallet) => wallet.id,
  target: walletsRemoved,
});

sample({
  clock: walletsRemoved,
  source: accounts.$list,
  fn: (accounts, walletId) => {
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);

    if (accountsToDelete.length === 1 && accountUtils.isWatchOnlyAccount(accountsToDelete.at(0)!)) {
      return [walletId];
    }
    const accountsMap = groupBy(accounts, (a) => a.accountId);
    const accountsToDeleteMap = dictionary(accountsToDelete, 'accountId');

    const isDuplicated = accounts.find(
      (acc) =>
        accountsToDeleteMap[acc.accountId] &&
        !accountUtils.isWatchOnlyAccount(acc) &&
        !accountUtils.isProxiedAccount(acc) &&
        acc.walletId !== walletId,
    );

    if (isDuplicated) return [walletId];

    const multisigAccounts = accounts.filter(
      (acc) =>
        accountUtils.isMultisigAccount(acc) &&
        acc.signatories.some((s) => accountsToDeleteMap[s.accountId]) &&
        acc.signatories.some(
          (s) => !accountsMap[s.accountId]?.some((a) => a.walletId !== walletId && !accountUtils.isWatchOnlyAccount(a)),
        ),
    );

    return [walletId, ...multisigAccounts.map((a) => a.walletId)];
  },
  target: walletModel.events.walletsRemoved,
});

sample({
  clock: [walletModel.events.walletsRemovedSuccess, walletModel.events.walletHiddenSuccess],
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onDeleteFinished(),
  }),
});

// TODO this connection is dirty, we should decouple wallet delete logic and proxy manipulation.
sample({
  clock: [walletModel.events.walletsRemovedSuccess, walletModel.events.walletHiddenSuccess],
  target: proxiesModel.findAllProxies,
});

export const forgetWalletModel = {
  events: {
    forgetWallet,
    forgetWcWallet,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
