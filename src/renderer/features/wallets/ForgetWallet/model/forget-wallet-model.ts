import { attach, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { persist } from 'effector-storage/local';
import { spread } from 'patronum';

import { type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { accountService, accountSync, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { forgetService } from '../service';

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = flow.state.map(({ wallet }) => wallet);

const changeConnectedAccountsDoNotShowAgain = createEvent<boolean>();

const $connectedAccountsDoNotShowAgain = restore(changeConnectedAccountsDoNotShowAgain, false);

persist({
  key: 'forget_wallet_is_do_not_show_again',
  store: $connectedAccountsDoNotShowAgain,
  sync: true,
});

const changeHideWalletDoNotShowAgain = createEvent<boolean>();
const $hideWalletDoNotShowAgain = restore(changeHideWalletDoNotShowAgain, false);

persist({
  key: 'hide_wallet_do_not_show_again',
  store: $hideWalletDoNotShowAgain,
  sync: true,
});

const remove = createEvent();

const $walletToHide = createStore<number | null>(null);
const $walletsToRemove = createStore<number[]>([]);

const $isConnectedAccountsAlertNeeded = $walletsToRemove.map((walletsToRemove) => walletsToRemove.length > 1);

sample({
  clock: $wallet,
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }, wallet) => {
    if (nullable(wallet)) return { walletToHidden: null, walletsToRemove: [] };
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, wallet.id);

    const walletIdFromGraph = new Set<number>();

    for (const chain of Object.values(chains)) {
      const filteredAccounts = accounts.filter((a) => !accountUtils.isWatchOnlyAccount(a));
      const graph = accountService.createAccountGraphs(filteredAccounts, chain);

      for (const account of accountsToDelete) {
        if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

        const accountsList = forgetService.findParentAccounts(graph, account);

        for (const a of accountsList) {
          walletIdFromGraph.add(a.walletId);
        }
      }
    }

    const walletsToRemove = [...Array.from(walletIdFromGraph)];

    if (!walletUtils.isRegularMultisig(wallet)) {
      walletsToRemove.push(wallet.id);
    }

    return {
      walletToHidden: walletUtils.isRegularMultisig(wallet) ? wallet.id : null,
      walletsToRemove,
    };
  },
  target: spread({
    walletToHidden: $walletToHide,
    walletsToRemove: $walletsToRemove,
  }),
});

const walletsRemovedFx = attach({
  effect: walletModel.walletsRemoved,
});

sample({
  clock: remove,
  source: {
    walletToHide: $walletToHide,
    walletsToRemove: $walletsToRemove,
  },
  fn: ({ walletToHide, walletsToRemove }) => {
    return { walletToHide: walletToHide ?? undefined, walletsToRemove };
  },
  target: spread({
    walletToHide: walletModel.walletHidden,
    walletsToRemove: walletsRemovedFx,
  }),
});

sample({
  clock: walletsRemovedFx,
  source: accounts.$list,
  fn: (accounts, walletIds) => {
    return accounts.filter((a) => walletIds.includes(a.walletId)).map((a) => a.accountId);
  },
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: walletsRemovedFx.done,
  target: accountSync.syncAccounts,
});

export const forgetWalletModel = {
  flow,

  $wallet,
  $isConnectedAccountsAlertNeeded,
  $connectedAccountsDoNotShowAgain,
  $hideWalletDoNotShowAgain,
  remove,
  changeConnectedAccountsDoNotShowAgain,
  changeHideWalletDoNotShowAgain,
};
