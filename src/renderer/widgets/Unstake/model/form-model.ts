import { createEvent, createStore, combine, sample, restore } from 'effector';
import { spread } from 'patronum';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';

import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { NetworkStore } from '../lib/types';
import type { Account, PartialBy, ProxiedAccount } from '@shared/core';
import { transferableAmount, formatAmount, dictionary } from '@shared/lib/utils';
import {
  Transaction,
  transactionBuilder,
  transactionService,
  MultisigTxWrapper,
  ProxyTxWrapper,
} from '@entities/transaction';

type FormParams = {
  account: Account;
  signatory: Account;
  description: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: PartialBy<FormParams, 'signatory'> & {
    proxiedAccount?: ProxiedAccount;
    fee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = restore(formInitiated, null);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $accountBalance = createStore<string>('0');
const $signatoryBalance = createStore<string>('0');
const $proxyBalance = createStore<string>('0');

const $fee = restore(feeChanged, '0');
const $multisigDeposit = restore(multisigDepositChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $selectedSignatories = createStore<Account[]>([]);

const $unstakeForm = createForm<FormParams>({
  fields: {
    account: {
      init: {} as Account,
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_a, _f, { isProxy, proxyBalance, fee }) => {
            if (!isProxy) return true;

            return new BN(fee).lte(new BN(proxyBalance.native));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { fee, isMultisig, signatoryBalance, multisigDeposit }) => {
            if (!isMultisig) return true;

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance.balance));
          },
        },
      ],
    },
    description: {
      init: '',
      rules: [
        {
          name: 'maxLength',
          errorText: 'transfer.descriptionLengthError',
          validator: (value) => !value || value.length <= 120,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Computed

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    account: $unstakeForm.fields.account.$value,
    accounts: walletModel.$accounts,
    network: $networkStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, account, accounts, wallets, network, signatories }) => {
    if (!wallet || !network || !account.id) return [];

    const walletFiltered = wallets.filter((wallet) => {
      return !walletUtils.isProxied(wallet) && !walletUtils.isWatchOnly(wallet);
    });
    const walletsMap = dictionary(walletFiltered, 'id');
    const chainFilteredAccounts = accounts.filter((account) => {
      if (accountUtils.isBaseAccount(account) && walletUtils.isPolkadotVault(walletsMap[account.walletId])) {
        return false;
      }

      return accountUtils.isChainAndCryptoMatch(account, network.chain);
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: walletFiltered,
      account,
      accounts: chainFilteredAccounts,
      signatories,
    });
  },
);

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: $unstakeForm.fields.account.$value,
  },
  ({ txWrappers, account }) => {
    if (txWrappers.length === 0) return account;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    }

    return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $realAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletModel.$activeWallet,
    accounts: walletModel.$activeAccounts,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, accounts, balances }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;
    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = accounts.filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainAndCryptoMatch(account, network.chain);
    });

    return walletAccounts.map((account) => {
      const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId.toString());

      return { account, balance: transferableAmount(balance) };
    });
  },
);

const $signatories = combine(
  {
    network: $networkStore,
    txWrappers: $txWrappers,
    balances: balanceModel.$balances,
  },
  ({ network, txWrappers, balances }) => {
    if (!network) return [];

    const { chain, asset } = network;

    return txWrappers.reduce<Array<{ signer: Account; balance: string }[]>>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const balancedSignatories = (wrapper as MultisigTxWrapper).signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId.toString());

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
  },
);

const $isChainConnected = combine(
  {
    network: $networkStore,
    statuses: networkModel.$connectionStatuses,
  },
  ({ network, statuses }) => {
    if (!network) return false;

    return networkUtils.isConnectedStatus(statuses[network.chain.chainId]);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    if (!network) return undefined;

    return apis[network.chain.chainId];
  },
  { skipVoid: false },
);

const $pureTx = combine(
  {
    network: $networkStore,
    form: $unstakeForm.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }): Transaction | undefined => {
    if (!network || !isConnected) return undefined;

    return transactionBuilder.buildUnstake({
      chain: network.chain,
      asset: network.asset,
      accountId: form.account.accountId,
      amount: '0',
    });
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    pureTx: $pureTx,
    txWrappers: $txWrappers,
  },
  ({ apis, networkStore, pureTx, txWrappers }) => {
    if (!networkStore || !pureTx) return undefined;

    return transactionService.getWrappedTransaction({
      api: apis[networkStore.chain.chainId],
      addressPrefix: networkStore.chain.addressPrefix,
      transaction: pureTx,
      txWrappers,
    });
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: $unstakeForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$unstakeForm.reset, $selectedSignatories.reinit],
});

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

sample({
  clock: formInitiated,
  source: $accounts,
  filter: (accounts) => accounts.length > 0,
  fn: (accounts) => accounts[0].account,
  target: $unstakeForm.fields.account.onChange,
});

sample({
  clock: $unstakeForm.fields.account.onChange,
  source: $accounts,
  fn: (accounts, account) => {
    const match = accounts.find((a) => a.account.id === account.id);

    return match?.balance || '0';
  },
  target: $accountBalance,
});

sample({
  clock: $realAccount.updates,
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  filter: ({ isProxy, network }) => isProxy && Boolean(network),
  fn: ({ balances, network }, proxyAccount) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

sample({
  clock: $unstakeForm.fields.signatory.$value,
  source: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory.id);

    return match?.balance || '0';
  },
  target: $signatoryBalance,
});

sample({
  clock: $unstakeForm.fields.signatory.$value,
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

// Submit

sample({
  clock: $unstakeForm.formValidated,
  source: {
    realAccount: $realAccount,
    network: $networkStore,
    transaction: $transaction,
    isProxy: $isProxy,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction }) => {
    return Boolean(network) && Boolean(transaction);
  },
  fn: ({ realAccount, network, transaction, isProxy, ...fee }, formData) => {
    const signatory = formData.signatory.accountId ? formData.signatory : undefined;
    // TODO: update after i18n effector integration
    const defaultText = `Unstake ${0} ${network!.asset.symbol}`;
    const description = signatory ? formData.description || defaultText : '';
    const amount = formatAmount('0', network!.asset.precision);

    return {
      transactions: {
        wrappedTx: transaction!.wrappedTx,
        multisigTx: transaction!.multisigTx,
        coreTx: transaction!.coreTx,
      },
      formData: {
        ...fee,
        ...formData,
        account: realAccount,
        amount,
        signatory,
        description,
        ...(isProxy && { proxiedAccount: formData.account as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

export const formModel = {
  $unstakeForm,
  $proxyWallet,
  $signatories,

  $accounts,
  $accountBalance,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $pureTx,
  $transaction,
  $isMultisig,
  $isChainConnected,
  $canSubmit,

  events: {
    formInitiated,
    formCleared: $unstakeForm.reset,

    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
