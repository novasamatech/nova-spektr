import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { type Store, combine, createEvent, createStore, sample } from 'effector';
import { type Form, type FormConfig, createForm } from 'effector-forms';
import { isNil } from 'lodash';

import { type Account, type Asset, type Balance, type Chain, type Transaction, type Wallet } from '@shared/core';
import { transferableAmountBN } from '@shared/lib/utils';
import { balanceUtils } from '@entities/balance';
import { transactionService } from '@entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';

export type BasicFormParams = {
  account: Account | null;
  signatory: Account | null;
};

type Params<FormShape extends NonNullable<unknown>> = {
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

export type AccountOption = { account: Account; balance: BN };

export const createTransactionForm = <FormShape extends NonNullable<unknown>>({
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

  const $coreTransaction = createTransactionStore({
    $activeWallet,
    $wallets,
    $chain,
    $asset,
    $balances,
    $api,
    form,
  });

  const $txWrappers = combine(
    {
      wallet: $activeWallet,
      wallets: $wallets,
      chain: $chain,
      account: form.fields.account.$value,
      signatory: form.fields.signatory.$value,
    },
    ({ wallet, account, wallets, signatory, chain }) => {
      if (!wallet || !chain || !account) return [];

      const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
        accountFn: (a, w) => {
          const isBase = accountUtils.isBaseAccount(a);
          const isPolkadotVault = walletUtils.isPolkadotVault(w);

          return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
        },
      });

      // TODO logic error with signatory - cyclic dep
      return transactionService.getTxWrappers({
        wallet,
        wallets: filteredWallets || [],
        account,
        signatories: signatory ? [signatory] : [account],
      });
    },
  );

  const $isMultisig = $txWrappers.map(transactionService.hasMultisig);
  const $isProxy = $txWrappers.map(transactionService.hasProxy);

  const $wrappedTransactions = combine(
    { api: $api, chain: $chain, coreTx: $coreTransaction, txWrappers: $txWrappers },
    ({ api, chain, coreTx, txWrappers }) => {
      if (!api || !chain || !coreTx) return null;

      return transactionService.getWrappedTransaction({
        api,
        addressPrefix: chain.addressPrefix,
        transaction: coreTx,
        txWrappers,
      });
    },
  );

  // Derived

  sample({
    clock: [$chain, $asset, $activeWallet, $balances],
    source: { chain: $chain, asset: $asset, wallet: $activeWallet, balances: $balances },
    fn: ({ chain, asset, wallet, balances }) => {
      if (!wallet || !chain || !asset) return [];

      const walletAccounts = walletUtils.getAccountsBy([wallet], (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
      });

      return walletAccounts.map<AccountOption>((account) => {
        const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId.toString());

        return {
          account,
          balance: transferableAmountBN(balance),
        };
      });
    },
    target: $accounts,
  });

  sample({
    clock: [$chain, $asset, $wallets, $activeWallet, $txWrappers, $balances],
    source: {
      chain: $chain,
      asset: $asset,
      wallets: $wallets,
      txWrappers: $txWrappers,
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

        return { account: firstAccount, balance: transferableAmountBN(balance) };
      });
    },
    target: $signatories,
  });

  const $realAccount = combine($txWrappers, form.fields.account.$value, (txWrappers, account) => {
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
      isProxy: $isProxy,
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
      txWrappers: $txWrappers,
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
    source: {
      accounts: $accounts,
      field: form.fields.account.$value,
    },
    filter: ({ field, accounts }) => !field && accounts.length > 0,
    fn: ({ accounts }) => accounts.at(0)?.account ?? null,
    target: form.fields.account.onChange,
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
    transaction: {
      $core: $coreTransaction,
      $wrappers: $txWrappers,
      $wrappedTransactions,
    },
    signatory: {
      $available: $signatories,
      $isMultisig,
    },
    accounts: {
      $initiatorWallet,
      $available: $accounts,
      $real: $realAccount,
    },
    proxy: {
      $wallet: $proxyWallet,
      $balance: $proxyBalance,
      $isProxy,
    },
  };
};
