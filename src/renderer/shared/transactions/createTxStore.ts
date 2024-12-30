import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createStore } from 'effector';

import { type Chain, type Transaction, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { createFeeCalculator } from './createFeeCalculator';

type Params = {
  $api: Store<ApiPromise | null>;
  $chain: Store<Chain | null>;
  $coreTx: Store<Transaction | null>;
  $activeWallet: Store<Wallet | null | undefined>;
  $wallets: Store<Wallet[]>;
  $account: Store<AnyAccount | null>;
  $signatory?: Store<AnyAccount | null>;
};

export const createTxStore = ({ $api, $chain, $coreTx, $activeWallet, $wallets, $account, $signatory }: Params) => {
  const $txWrappers = combine(
    {
      wallet: $activeWallet,
      wallets: $wallets,
      chain: $chain,
      account: $account,
      signatory: $signatory ?? createStore(null),
    },
    ({ wallet, account, wallets, signatory, chain }) => {
      if (nullable(wallet) || nullable(chain) || nullable(account)) return [];

      const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
        accountFn: (a, w) => {
          const isBase = accountUtils.isVaultBaseAccount(a);
          const isPolkadotVault = walletUtils.isPolkadotVault(w);

          return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
        },
      });

      return transactionService.getTxWrappers({
        wallet,
        wallets: filteredWallets || [],
        account,
        signatories: signatory ? [signatory] : [account],
      });
    },
  );

  const $wrappedTx = combine(
    { api: $api, chain: $chain, coreTx: $coreTx, txWrappers: $txWrappers },
    ({ api, chain, coreTx, txWrappers }) => {
      if (nullable(api) || nullable(chain) || nullable(coreTx)) return null;

      return transactionService.getWrappedTransaction({
        api,
        addressPrefix: chain.addressPrefix,
        transaction: coreTx,
        txWrappers,
      });
    },
  );

  const $isMultisig = $txWrappers.map(transactionService.hasMultisig);
  const $isProxy = $txWrappers.map(transactionService.hasProxy);

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    $api: $api,
    $transaction: $wrappedTx.map((x) => x?.wrappedTx ?? null),
  });

  return {
    $coreTx,
    $wrappedTx,
    $txWrappers,
    $isMultisig,
    $isProxy,
    $fee,
    $pendingFee,
  };
};
