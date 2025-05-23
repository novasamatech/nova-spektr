import { attach, combine, createApi, createEffect, createEvent, createStore, sample, split } from 'effector';
import { spread } from 'patronum';

import { type MultisigAccount, type Wallet } from '@/shared/core';
import { waitFor } from '@/shared/effector';
import { accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { useForgetMultisig } from '@/entities/multisig';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesModel } from '@/features/proxies';
import { networkModel, networkUtils } from '@/entities/network';
import { forgetService } from '../service';

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

    const accountFromGraph = new Set<number>();
    console.log({ accountsToDelete });

    for (const chain of Object.values(chains)) {
      if (!networkUtils.isMultisigSupported(chain.options)) {
        continue;
      }

      const graph = accountService.createAccountGraphs(accounts, chain);

      console.log('graph', { graph, chain });

      for (const account of accountsToDelete) {
        if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

        const accountsList = forgetService.findParentAccounts(graph, account);

        if (accountsList.length > 0) {
          console.log({ accountsList, chain, graph });
          accountsList.forEach((a) => accountFromGraph.add(a.walletId));
        }
      }
    }
    console.log({ accountFromGraph });

    return { walletsToRemove: Array.from(accountFromGraph), walletToHidden: walletId };
  },
  target: spread({
    walletsToRemove: walletModel.events.walletsRemoved,
    walletToHidden: walletModel.events.walletHidden,
  }),
});

sample({
  clock: [forgetSimpleWallet, forgetWcWallet],
  source: {
    accounts: accounts.$list,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }, { id: walletId }) => {
    const accountsToDelete = accountService.filterAccountsByWallet(accounts, walletId);

    // if (accountsToDelete.length === 1 && accountUtils.isWatchOnlyAccount(accountsToDelete.at(0)!)) {
    //   return [walletId];
    // }

    console.log({ accountsToDelete });
    const accountFromGraph = new Set<number>();

    for (const chain of Object.values(chains)) {
      const graph = accountService.createAccountGraphs(accounts, chain);
      console.log({ graph });

      for (const account of accountsToDelete) {
        if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

        const accountsList = forgetService.findParentAccounts(graph, account);

        if (accountsList.length > 0) {
          console.log({ accountsList, chain, graph });
          accountsList.forEach((a) => accountFromGraph.add(a.walletId));
        }
      }
    }

    console.log('accountFromGraph', Array.from(accountFromGraph));

    return [...Array.from(accountFromGraph), walletId];
  },
  target: walletModel.events.walletsRemoved,
});

sample({
  clock: [walletModel.events.walletsRemovedSuccess],
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onDeleteFinished(),
  }),
});

const readyForProxies = waitFor({
  clock: proxiesModel.findAllProxies.pending,
  source: walletModel.events.walletsRemovedSuccess,
  filter: (val): val is boolean => !val,
  reset: [walletModel.events.walletsRemovedSuccess, walletModel.events.walletHiddenSuccess],
});

// TODO this connection is dirty, we should decouple wallet delete logic and proxy manipulation.
sample({
  clock: readyForProxies,
  target: proxiesModel.findAllProxies,
});

export const forgetWalletModel = {
  events: {
    forgetWallet,
    forgetWcWallet,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
