import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';
import { type Store, combine, createEvent, createStore, sample } from 'effector';
import { type Form, type FormConfig, createForm } from 'effector-forms';
import { isNil } from 'lodash';

import {
  type Account,
  type Address,
  type Asset,
  type Balance,
  type Chain,
  type Transaction,
  type Wallet,
} from '@/shared/core';
import { nullable, toAddress, transferableAmountBN } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { balanceUtils } from '@/entities/balance';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

export type BasicFormParams = {
  account: Account | null;
  signatory: Account | null;
};

type Params<FormShape extends NonNullable<unknown>> = {
  $voters: Store<Address[]>;
  $activeWallet: Store<Wallet | null>;
  $wallets: Store<Wallet[]>;
  $chain: Store<Chain | null>;
  $asset: Store<Asset | null>;
  $api: Store<ApiPromise | null>;
  $balances: Store<Balance[]>;
  createTransactionStore: TransactionFactory<FormShape>;
  form: FormConfig<Omit<FormShape, keyof BasicFormParams>>;
};

type TransactionFactory<FormShape extends NonNullable<unknown>> = (
  params: Omit<Params<FormShape>, 'createTransactionStore' | 'form'> & { form: Form<FormShape & BasicFormParams> },
) => Store<Transaction | null>;

export type AccountOption = { account: Account; balance: Balance | null };

export const createTransactionForm = <FormShape extends NonNullable<unknown>>({
  $voters,
  $activeWallet,
  $wallets,
  $chain,
  $asset,
  $balances,
  $api,
  createTransactionStore,
  form: formConfig,
}: Params<FormShape>) => {
  // Stores

  const $accounts = createStore<AccountOption[]>([]);
  const $signatories = createStore<AccountOption[]>([]);

  // Form

  const form = createForm<FormShape & BasicFormParams>({
    ...formConfig,
    // @ts-expect-error TODO fix
    fields: {
      account: {
        init: null,
        rules: [
          {
            name: 'emptyAccount',
            errorText: 'governance.vote.errors.noAccountError',
            validator: (account) => !isNil(account),
          },
        ],
      },
      signatory: {
        init: null,
        rules: [
          {
            name: 'emptySignatory',
            errorText: 'governance.vote.errors.noSignatoryError',
            source: $signatories,
            validator: (signatory, _, signatories) => signatories.length === 0 || !isNil(signatory),
          },
        ],
      },
      ...formConfig.fields,
    },
  });

  // Transactions

  const $coreTx = createTransactionStore({
    $voters,
    $activeWallet,
    $wallets,
    $chain,
    $asset,
    $balances,
    $api,
    form,
  });

  const tx = createTxStore({
    $api,
    $activeWallet,
    $wallets,
    $chain,
    $coreTx,
    $account: form.fields.account.$value,
    $signatory: form.fields.signatory.$value,
  });

  // Derived

  sample({
    clock: [$chain, $asset, $activeWallet, $balances, $voters],
    source: { chain: $chain, asset: $asset, wallet: $activeWallet, balances: $balances, voters: $voters },
    fn: ({ chain, asset, wallet, balances, voters }) => {
      if (nullable(wallet) || nullable(chain) || nullable(asset)) return [];

      let walletAccounts: Account[] = [];

      if (walletUtils.isPolkadotVault(wallet)) {
        const shards = wallet.accounts.filter((a) => {
          return (
            accountUtils.isChainAndCryptoMatch(a, chain) &&
            (accountUtils.isVaultShardAccount(a) || accountUtils.isVaultChainAccount(a))
          );
        });

        if (shards.length) {
          walletAccounts = shards;
        } else {
          walletAccounts = wallet.accounts.filter(
            (a) => accountUtils.isVaultBaseAccount(a) && accountUtils.isChainAndCryptoMatch(a, chain),
          );
        }
      } else {
        walletAccounts = wallet.accounts.filter((a) => accountUtils.isChainAndCryptoMatch(a, chain));
      }

      if (voters.length) {
        walletAccounts = walletAccounts.filter((account) => {
          return voters.includes(toAddress(account.accountId, { prefix: chain.addressPrefix }));
        });
      }

      return walletAccounts.map<AccountOption>((account) => {
        const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId.toString());

        return {
          account,
          balance: balance ?? null,
        };
      });
    },
    target: $accounts,
  });

  sample({
    clock: [$chain, $asset, $wallets, $activeWallet, tx.$txWrappers, $balances],
    source: {
      chain: $chain,
      asset: $asset,
      wallets: $wallets,
      txWrappers: tx.$txWrappers,
      balances: $balances,
    },
    fn: ({ chain, asset, txWrappers, wallets, balances }) => {
      if (!chain || !asset) return [];

      const multiSigWrapper = txWrappers.find(transactionService.isMultisig);
      if (!multiSigWrapper) return [];

      return multiSigWrapper.multisigAccount.signatories.flatMap((signatory) => {
        const account = walletUtils.getAccountsBy(wallets, (a) => a.accountId === signatory.accountId);
        const firstAccount = account.at(0);
        if (!firstAccount) return [];

        const balance = balanceUtils.getBalance(
          balances,
          firstAccount.accountId,
          chain.chainId,
          asset.assetId.toString(),
        );

        return { account: firstAccount, balance: balance ?? null };
      });
    },
    target: $signatories,
  });

  const $realAccount = combine(tx.$txWrappers, form.fields.account.$value, (txWrappers, account) => {
    const firstWrapper = txWrappers.at(0);
    if (!firstWrapper) return account;

    if (transactionService.isMultisig(firstWrapper)) {
      return firstWrapper.multisigAccount;
    }

    if (transactionService.isProxy(firstWrapper)) {
      return firstWrapper.proxyAccount;
    }

    return null;
  });

  const $initiatorWallet = combine(
    { account: form.fields.account.$value, wallets: walletModel.$wallets },
    ({ account, wallets }) => {
      if (!account) return null;

      return walletUtils.getWalletById(wallets, account.walletId) ?? null;
    },
  );

  const $proxyWallet = combine(
    {
      isProxy: tx.$isProxy,
      realAccount: $realAccount,
      wallets: $wallets,
    },
    ({ isProxy, realAccount, wallets }) => {
      if (!isProxy || !realAccount) return null;

      return walletUtils.getWalletById(wallets, realAccount.walletId);
    },
  );

  const $proxyBalance = combine(
    {
      txWrappers: tx.$txWrappers,
      balances: $balances,
      chain: $chain,
      asset: $asset,
      realAccount: $realAccount,
    },
    ({ balances, chain, asset, realAccount, txWrappers }) => {
      if (!realAccount || !chain || !asset) return BN_ZERO;

      if (transactionService.hasProxy(txWrappers)) {
        const balance = balanceUtils.getBalance(
          balances,
          realAccount.accountId,
          chain.chainId,
          asset.assetId.toString(),
        );

        return transferableAmountBN(balance);
      }

      return BN_ZERO;
    },
  );

  const reinitForm = createEvent();
  const resetForm = createEvent();

  sample({
    clock: [reinitForm, resetForm],
    target: form.reset,
  });

  // @ts-expect-error Types mismatch somehow
  sample({
    clock: reinitForm,
    source: $accounts,
    filter: (accounts) => accounts.length > 0,
    fn: (accounts) => accounts.at(0)?.account ?? null,
    target: form.fields.account.onChange,
  });

  // auto select the only one signatory
  // @ts-expect-error Types mismatch somehow
  sample({
    clock: reinitForm,
    source: $signatories,
    filter: (signatories) => signatories.length === 1,
    fn: (signers) => {
      const signer = signers.at(0);

      return signer ? signer.account : null;
    },
    target: form.fields.signatory.onChange,
  });

  // @ts-expect-error Types mismatch somehow
  sample({
    clock: form.fields.signatory.changed,
    source: {
      accounts: $accounts,
      field: form.fields.account.$value,
    },
    filter: ({ field, accounts }) => !field && accounts.length > 0,
    fn: ({ accounts }) => accounts.at(0)?.account ?? null,
    target: form.fields.account.onChange,
  });

  return {
    form,
    resetForm,
    reinitForm,
    transaction: tx,
    signatory: {
      $available: $signatories,
    },
    accounts: {
      $initiatorWallet,
      $available: $accounts,
      $real: $realAccount,
    },
    proxy: {
      $wallet: $proxyWallet,
      $balance: $proxyBalance,
    },
  };
};
