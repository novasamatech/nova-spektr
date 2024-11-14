import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createStore } from 'effector';

import { type Account, type Chain, type Transaction, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { createFeeCalculator } from '@/shared/transactions';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

type Params = {
  $api: Store<ApiPromise | null>;
  $chain: Store<Chain | null>;
  $coreTxs: Store<Transaction[]>;
  $activeWallet: Store<Wallet | null>;
  $wallets: Store<Wallet[]>;
  $accounts: Store<Account[]>;
  $signatory?: Store<Account | null>;
};

export const createMultipleTxStore = ({
  $api,
  $chain,
  $coreTxs,
  $activeWallet,
  $wallets,
  $accounts,
  $signatory,
}: Params) => {
  const $txWrappers = combine(
    {
      wallet: $activeWallet,
      wallets: $wallets,
      chain: $chain,
      accounts: $accounts,
      signatory: $signatory ?? createStore(null),
    },
    ({ wallet, accounts, wallets, signatory, chain }) => {
      if (nullable(wallet) || nullable(chain) || nullable(accounts)) return [];

      const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
        accountFn: (a, w) => {
          const isBase = accountUtils.isBaseAccount(a);
          const isPolkadotVault = walletUtils.isPolkadotVault(w);

          return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
        },
      });

      return accounts.map((account) =>
        transactionService.getTxWrappers({
          wallet,
          wallets: filteredWallets || [],
          account,
          signatories: signatory ? [signatory] : [account],
        }),
      );
    },
  );

  const $wrappedTxs = combine(
    { api: $api, chain: $chain, coreTxs: $coreTxs, txWrappers: $txWrappers },
    ({ api, chain, coreTxs, txWrappers }) => {
      if (nullable(api) || nullable(chain) || nullable(coreTxs)) return null;

      return coreTxs.map((coreTx, index) =>
        transactionService.getWrappedTransaction({
          api,
          addressPrefix: chain.addressPrefix,
          transaction: coreTx,
          txWrappers: txWrappers[index],
        }),
      );
    },
  );

  const $isMultisig = $txWrappers.map((wrappers) => wrappers[0] && transactionService.hasMultisig(wrappers[0]));
  const $isProxy = $txWrappers.map((wrappers) => wrappers[0] && transactionService.hasProxy(wrappers[0]));

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    $api: $api,
    $transaction: $wrappedTxs.map((x) => x?.[0]?.wrappedTx ?? null),
  });

  return {
    $coreTxs,
    $wrappedTxs,
    $txWrappers,
    $isMultisig,
    $isProxy,
    $fee,
    $pendingFee,
  };
};
