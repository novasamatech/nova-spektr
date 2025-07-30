import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { persist } from 'effector-storage/local';
import { spread } from 'patronum';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { forgetService } from '../service';

const gate = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = gate.state.map(({ wallet }) => wallet);

const changeDoNotShowAgain = createEvent<boolean>();

const $doNotShowAgain = restore(changeDoNotShowAgain, false);

persist({
  key: 'forget_wallet_is_do_not_show_again',
  store: $doNotShowAgain,
  sync: true,
});

const remove = createEvent();

const $walletToHide = createStore<number | null>(null);
const $walletsToRemove = createStore<number[]>([]);

const $isConnectedAccountsAlertNeeded = combine(
  {
    walletsToRemove: $walletsToRemove,
  },
  ({ walletsToRemove }) => {
    return walletsToRemove.length > 1;
  },
);

const processAccountGraphs = (
  accounts: AnyAccount[],
  accountsToDelete: AnyAccount[],
  chains: Record<ChainId, Chain>,
  chainFilter?: (chain: Chain) => boolean,
) => {
  const walletIdFromGraph = new Set<number>();

  for (const chain of Object.values(chains)) {
    if (chainFilter && !chainFilter(chain)) {
      continue;
    }

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

  return Array.from(walletIdFromGraph);
};

const processMultisig = (accounts: AnyAccount[], walletId: number, chains: Record<ChainId, Chain>) => {
  const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);

  if (!accountsToDelete.some(accountUtils.isMultisigAccount)) {
    return [];
  }

  return processAccountGraphs(accounts, accountsToDelete, chains, (chain) =>
    networkUtils.isMultisigSupported(chain.options),
  );
};

const processSimple = (accounts: AnyAccount[], walletId: number, chains: Record<ChainId, Chain>) => {
  const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);

  if (accountsToDelete.length === 1 && accountUtils.isWatchOnlyAccount(accountsToDelete.at(0)!)) {
    return [walletId];
  }

  return processAccountGraphs(accounts, accountsToDelete, chains);
};

sample({
  clock: $wallet,
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }, wallet) => {
    if (nullable(wallet)) return { walletToHidden: null, walletsToRemove: [] };

    const walletsToRemove = walletUtils.isMultisig(wallet)
      ? processMultisig(accounts, wallet.id, chains)
      : processSimple(accounts, wallet.id, chains);

    return { walletToHidden: wallet.id, walletsToRemove: [...walletsToRemove, wallet.id] };
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
  target: proxiesModel.findAllProxies,
});

export const forgetWalletModel = {
  gate,

  $isConnectedAccountsAlertNeeded,
  $doNotShowAgain,

  remove,
  changeDoNotShowAgain,
};
