import { createEvent, createStore, combine, sample, restore } from 'effector';
import { spread } from 'patronum';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';

import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { Account, PartialBy, ProxiedAccount, Chain, Asset, Address, RewardsDestination } from '@shared/core';
import { NetworkStore } from '../lib/types';
import {
  transferableAmount,
  getRelaychainAsset,
  toAddress,
  dictionary,
  formatAmount,
  isStringsMatchQuery,
  TEST_ADDRESS,
  stakeableAmount,
  validateAddress,
} from '@shared/lib/utils';
import {
  Transaction,
  transactionBuilder,
  transactionService,
  MultisigTxWrapper,
  ProxyTxWrapper,
} from '@entities/transaction';

type FormParams = {
  shards: Account[];
  signatory: Account;
  amount: string;
  destination: Address;
  description: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  }[];
  formData: PartialBy<FormParams, 'signatory'> & {
    proxiedAccount?: ProxiedAccount;
    fee: string;
    totalFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const formCleared = createEvent();
const destinationQueryChanged = createEvent<string>();
const destinationTypeChanged = createEvent<RewardsDestination>();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $shards = createStore<Account[]>([]);
const $destinationQuery = restore(destinationQueryChanged, '');
const $destinationType = restore(destinationTypeChanged, RewardsDestination.RESTAKE);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $accountsBalances = createStore<string[]>([]);
const $bondBalanceRange = createStore<string | string[]>('0');
const $signatoryBalance = createStore<string>('0');
const $proxyBalance = createStore<string>('0');

const $fee = restore(feeChanged, '0');
const $totalFee = restore(totalFeeChanged, '0');
const $multisigDeposit = restore(multisigDepositChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $selectedSignatories = createStore<Account[]>([]);

const $bondForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [] as Account[],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, fee }) => {
            if (!isProxy) return true;

            return new BN(fee).lte(new BN(proxyBalance));
          },
        },
        {
          name: 'noBondBalance',
          errorText: 'staking.bond.noBondBalanceError',
          source: combine({
            isProxy: $isProxy,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (shards, form, { isProxy, network, accountsBalances }) => {
            if (isProxy || shards.length === 1) return true;

            const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

            return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: 'transfer.noSignatoryError',
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
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

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance));
          },
        },
      ],
    },
    amount: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'transfer.requiredAmountError',
          validator: Boolean,
        },
        {
          name: 'notZero',
          errorText: 'transfer.requiredAmountError',
          validator: (value) => value !== '0',
        },
        {
          name: 'notEnoughBalance',
          errorText: 'transfer.notEnoughBalanceError',
          source: combine({
            network: $networkStore,
            bondBalanceRange: $bondBalanceRange,
          }),
          validator: (value, _, { network, bondBalanceRange }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const bondBalance = Array.isArray(bondBalanceRange) ? bondBalanceRange[1] : bondBalanceRange;

            return amountBN.lte(new BN(bondBalance));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { network, fee, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            const feeBN = new BN(fee);
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return form.shards.every((_: Account, index: number) => {
              return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
            });
          },
        },
      ],
    },
    destination: {
      init: '' as Address,
      rules: [
        {
          name: 'required',
          errorText: 'proxy.addProxy.proxyAddressRequiredError',
          source: $destinationType,
          validator: (value, _, destinationType) => {
            if (destinationType === RewardsDestination.RESTAKE) return true;

            return validateAddress(value);
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
    shards: $shards,
    accounts: walletModel.$accounts,
    network: $networkStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, shards, accounts, wallets, network, signatories }) => {
    if (!wallet || !network || shards.length !== 1) return [];

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
      account: shards[0],
      accounts: chainFilteredAccounts,
      signatories,
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: $bondForm.fields.shards.$value,
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

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    accounts: $realAccounts,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, accounts, wallets }) => {
    if (!isProxy || accounts.length === 0) return undefined;

    return walletUtils.getWalletById(wallets, accounts[0].walletId);
  },
  { skipVoid: false },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletModel.$activeWallet,
    shards: $shards,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, shards, balances }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId.toString());

      return { account: shard, balance: stakeableAmount(balance) };
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

const $destinationAccounts = combine(
  {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    network: $networkStore,
    query: $destinationQuery,
  },
  ({ wallets, accounts, network, query }) => {
    if (!network) return [];

    return accountUtils.getAccountsForBalances(wallets, accounts, (account) => {
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, network.chain);
      const isShardAccount = accountUtils.isShardAccount(account);
      const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

      return isChainAndCryptoMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
    });
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

const $pureTxs = combine(
  {
    network: $networkStore,
    form: $bondForm.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (!network || !isConnected) return undefined;

    return form.shards.map((shard) => {
      return transactionBuilder.buildBondNominate({
        chain: network.chain,
        asset: network.asset,
        accountId: shard.accountId,
        amount: form.amount || '0',
        destination: form.destination,
        nominators: Array(10).fill(TEST_ADDRESS),
        // nominators: Array(maxValidators).fill(address),
      });
    });
  },
  { skipVoid: false },
);

const $transactions = combine(
  {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ apis, networkStore, pureTxs, txWrappers }) => {
    if (!networkStore || !pureTxs) return undefined;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api: apis[networkStore.chain.chainId],
        addressPrefix: networkStore.chain.addressPrefix,
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: $bondForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$bondForm.reset, $selectedSignatories.reinit],
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => Boolean(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    shards,
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    shards: $shards,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards) => shards,
  target: $bondForm.fields.shards.onChange,
});

sample({
  source: {
    accounts: $accounts,
    shards: $bondForm.fields.shards.$value,
  },
  fn: ({ accounts, shards }) => {
    return accounts.reduce<string[]>((acc, { account, balance }) => {
      if (shards.includes(account)) acc.push(balance);

      return acc;
    }, []);
  },
  target: $accountsBalances,
});

sample({
  source: $accountsBalances,
  fn: (accountsBalances) => {
    if (accountsBalances.length === 0) return '0';

    const minBondBalance = accountsBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, accountsBalances[0]);

    return minBondBalance === '0' ? '0' : ['0', minBondBalance];
  },
  target: $bondBalanceRange,
});

sample({
  clock: $bondForm.fields.signatory.onChange,
  source: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory.id);

    return match?.balance || '0';
  },
  target: $signatoryBalance,
});

sample({
  clock: $bondForm.fields.signatory.$value,
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: $bondForm.fields.shards.onChange,
  target: $bondForm.fields.amount.resetErrors,
});

sample({
  clock: $bondForm.fields.amount.onChange,
  target: $bondForm.fields.shards.resetErrors,
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
  clock: $realAccounts.updates,
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  filter: ({ isProxy, network }, accounts) => {
    return isProxy && Boolean(network) && accounts.length > 0;
  },
  fn: ({ balances, network }, accounts) => {
    const balance = balanceUtils.getBalance(
      balances,
      accounts[0].accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
    );

    return stakeableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: $bondForm.formValidated,
  source: {
    realAccounts: $realAccounts,
    network: $networkStore,
    transactions: $transactions,
    isProxy: $isProxy,
    fee: $fee,
    totalFee: $totalFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transactions }) => {
    return Boolean(network) && Boolean(transactions);
  },
  fn: ({ realAccounts, network, transactions, isProxy, ...fee }, formData) => {
    const { shards, ...rest } = formData;

    const signatory = formData.signatory.accountId ? formData.signatory : undefined;
    // TODO: update after i18n effector integration
    const defaultText = `Bond ${formData.amount} ${network!.asset.symbol}`;
    const description = signatory ? formData.description || defaultText : '';
    const amount = formatAmount(rest.amount, network!.asset.precision);

    return {
      transactions: transactions!.map((tx) => ({
        wrappedTx: tx.wrappedTx,
        multisigTx: tx.multisigTx,
        coreTx: tx.coreTx,
      })),
      formData: {
        ...fee,
        ...rest,
        shards: realAccounts,
        amount,
        signatory,
        description,
        ...(isProxy && { proxiedAccount: shards[0] as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$bondForm.reset, $shards.reinit],
});

export const formModel = {
  $bondForm,
  $proxyWallet,
  $signatories,
  $destinationAccounts,
  $destinationQuery,
  $destinationType,

  $accounts,
  $accountsBalances,
  $bondBalanceRange,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $transactions,
  $isMultisig,
  $isChainConnected,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,
    destinationQueryChanged,
    destinationTypeChanged,

    feeChanged,
    totalFeeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
