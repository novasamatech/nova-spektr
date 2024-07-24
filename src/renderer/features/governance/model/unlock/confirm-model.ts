import { combine, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type MultisigTxWrapper, type ProxyTxWrapper, type Wallet } from '@shared/core';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkSelectorModel } from '../networkSelector';

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

// Computed
const $shards = combine(
  {
    activeWallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ activeWallet, chain }) => {
    if (!chain || !activeWallet) return [];

    return (
      activeWallet.accounts.filter((account, _, collection) => {
        const isBaseAccount = accountUtils.isBaseAccount(account);
        const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);
        const hasManyAccounts = collection.length > 1;

        if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
          return false;
        }

        return accountUtils.isChainIdMatch(account, chain.chainId);
      }) || []
    );
  },
);

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    chain: networkSelectorModel.$governanceChain,
    shards: $shards,
    // signatories: $selectedSignatories,
  },
  ({ wallet, wallets, chain, shards }) => {
    if (!wallet || !chain || shards.length !== 1) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: shards[0],
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: $shards,
  },
  ({ txWrappers, shards }) => {
    if (shards.length === 0) return [];
    if (txWrappers.length === 0) return shards;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return [(txWrappers[0] as MultisigTxWrapper).multisigAccount];
    }

    return [(txWrappers[0] as ProxyTxWrapper).proxyAccount];
  },
);

const $initiatorWallets = combine(
  {
    accounts: $realAccounts,
    wallets: walletModel.$wallets,
  },
  ({ accounts, wallets }) => {
    if (!accounts) return {};

    return accounts.reduce<Record<number, Wallet>>((acc, account, index) => {
      const wallet = walletUtils.getWalletById(wallets, account.walletId);
      if (!wallet) return acc;

      return {
        ...acc,
        [index]: wallet,
      };
    }, {});
  },
);

const $proxiedWallet = combine(
  {
    isProxy: $isProxy,
    shards: $shards,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, shards, wallets }) => {
    if (!isProxy) return undefined;

    return walletUtils.getWalletById(wallets, shards[0].walletId);
  },
  { skipVoid: false },
);

// const $signerWallet = combine(
//   {
//     shards: $shards,
//     wallets: walletModel.$wallets,
//   },
//   ({ shards, wallets }) => {
//     if (!shards) return {};
//     // formData.signatory.accountId ? formData.signatory : undefined;
//     return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
//       const wallet = walletUtils.getWalletById(wallets, storeItem.signatory?.walletId || storeItem.account.walletId);
//       if (!wallet) return acc;

//       const id = storeItem.id ?? index;

//       return {
//         ...acc,
//         [id]: wallet,
//       };
//     }, {});
//   },
// );

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ apis, chain }) => {
    return chain ? apis[chain.chainId] : undefined;
  },
  { skipVoid: false },
);

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => ({
    isProxy: transactionService.hasProxy(txWrappers),
    isMultisig: transactionService.hasMultisig(txWrappers),
  }),
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
  }),
});

export const confirmModel = {
  $api,
  $isMultisig,
  $isProxy,
  $initiatorWallets,
  $txWrappers,
  $shards,
  $proxiedWallet,
  $realAccounts,
};
