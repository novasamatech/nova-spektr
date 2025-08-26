import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createStore } from 'effector';

import { type Chain, type Transaction, type Wallet } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';
import { getExtrinsic, transactionService } from '@/entities/transaction';
import { walletUtils } from '@/entities/wallet';

import { createFeeCalculator } from './createFeeCalculator';

type Params = {
  $active?: Store<boolean>;
  $api: Store<ApiPromise | null>;
  $chain: Store<Chain | null>;
  $coreTx: Store<Transaction | null>;
  $activeWallet: Store<Wallet | null | undefined>;
  $wallets: Store<Wallet[]>;
  $account: Store<AnyAccount | null>;
  $signatory?: Store<AnyAccount | null>;
};

export const createTxStore = ({
  $active = createStore(true),
  $api,
  $chain,
  $coreTx,
  $activeWallet,
  $wallets,
  $account,
  $signatory,
}: Params) => {
  const $txWrappers = combine(
    {
      active: $active,
      wallet: $activeWallet,
      wallets: $wallets,
      chain: $chain,
      account: $account,
      signatory: $signatory ?? createStore(null),
    },
    ({ active, wallet, account, wallets, signatory, chain }) => {
      if (!active) return [];
      if (nullable(wallet) || nullable(chain) || nullable(account)) return [];

      const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
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
    { active: $active, api: $api, coreTx: $coreTx, txWrappers: $txWrappers },
    ({ active, api, coreTx, txWrappers }) => {
      if (!active) return null;
      if (nullable(api) || nullable(coreTx)) return null;

      return transactionService.getWrappedTransaction({
        api,
        transaction: coreTx,
        txWrappers,
      });
    },
  );

  const $isMultisig = $txWrappers.map(transactionService.hasMultisig);
  const $isProxy = $txWrappers.map(transactionService.hasProxy);

  const $mergedExtrinsic = combine($api, $wrappedTx, (api, tx) => {
    if (nullable(api)) return null;
    if (nullable(tx)) return null;
    return getExtrinsic[tx.wrappedTx.type](tx.wrappedTx.args, api);
  });

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    active: $active,
    extrinsic: $mergedExtrinsic,
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
