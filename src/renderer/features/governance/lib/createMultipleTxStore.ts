import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createStore } from 'effector';

import { type Chain, type Transaction, type Wallet } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createFeeCalculator } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { getExtrinsic, transactionService } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

type Params = {
  $api: Store<ApiPromise | null>;
  $chain: Store<Chain | null>;
  $coreTxs: Store<Transaction[]>;
  $activeWallet: Store<Wallet | null>;
  $wallets: Store<Wallet[]>;
  $accounts: Store<AnyAccount[]>;
  $signatory?: Store<AnyAccount | null>;
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
          const isBase = accountUtils.isVaultBaseAccount(a);
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
    { api: $api, coreTxs: $coreTxs, txWrappers: $txWrappers },
    ({ api, coreTxs, txWrappers }) => {
      if (nullable(api) || nullable(coreTxs)) return null;

      return coreTxs.map((coreTx, index) =>
        transactionService.getWrappedTransaction({
          api,
          transaction: coreTx,
          txWrappers: txWrappers[index],
        }),
      );
    },
  );

  const $isMultisig = $txWrappers.map((wrappers) => {
    const wrapper = wrappers.at(0);
    return nonNullable(wrapper) && transactionService.hasMultisig(wrapper);
  });
  const $isProxy = $txWrappers.map((wrappers) => {
    const wrapper = wrappers.at(0);
    return nonNullable(wrapper) && transactionService.hasProxy(wrapper);
  });

  const $extrinsic = combine($api, $wrappedTxs, (api, txs) => {
    if (nullable(api)) return null;
    const tx = txs?.at(0)?.wrappedTx;
    if (nullable(tx)) return null;
    return getExtrinsic[tx.type](tx.args, api);
  });

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    extrinsic: $extrinsic,
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
