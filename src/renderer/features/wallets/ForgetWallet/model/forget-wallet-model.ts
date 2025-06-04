import { attach, createEffect, createEvent, sample, split } from 'effector';
import { spread } from 'patronum';

import { type MultisigAccount, type Wallet } from '@/shared/core';
import { accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { useForgetMultisig } from '@/entities/multisig';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { forgetService } from '../service';

const { deleteMultisigTxs } = useForgetMultisig();

const forgetWallet = createEvent<Wallet>();
const forgetSimpleWallet = createEvent<Wallet>();
const forgetMultisigWallet = createEvent<Wallet>();
const forgetWcWallet = createEvent<Wallet>();

const deleteMultisigOperationsFx = createEffect(async (account: MultisigAccount): Promise<void> => {
  try {
    await deleteMultisigTxs(account.accountId);
  } catch (e) {
    console.error(`Error while deleting multisig wallet with id ${account.walletId}`, e);
  }
});

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
  clock: forgetMultisigWallet,
  fn: (wallet) => wallet.accounts[0] as MultisigAccount,
  target: deleteMultisigOperationsFx,
});

sample({
  clock: forgetMultisigWallet,
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
  },
  filter: ({ accounts }, { id: walletId }) => {
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);
    return accountsToDelete.some(accountUtils.isMultisigAccount);
  },
  fn: ({ accounts, chains }, { id: walletId }) => {
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);

    const walletIdFromGraph = new Set<number>();

    for (const chain of Object.values(chains)) {
      if (!networkUtils.isMultisigSupported(chain.options)) {
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

    return { walletToHidden: walletId, walletsToRemove: Array.from(walletIdFromGraph) };
  },
  target: spread({
    walletToHidden: walletModel.walletHidden,
    walletsToRemove: walletModel.walletsRemoved,
  }),
});

const walletsRemovedFx = attach({
  effect: walletModel.walletsRemoved,
});

sample({
  clock: [forgetSimpleWallet, forgetWcWallet],
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }, { id: walletId }) => {
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);

    if (accountsToDelete.length === 1 && accountUtils.isWatchOnlyAccount(accountsToDelete.at(0)!)) {
      return [walletId];
    }

    const walletIdFromGraph = new Set<number>();

    for (const chain of Object.values(chains)) {
      // Should we avoid WatchOnlyAccount in createAccountGraphs by default?
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

    return [...Array.from(walletIdFromGraph), walletId];
  },
  target: walletsRemovedFx,
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
  events: {
    forgetWallet,
    forgetWcWallet,
  },
};
