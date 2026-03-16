import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { spread } from 'patronum';

import {
  type Asset,
  type Chain,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
} from '@/shared/core';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  transferableAmount,
  unlockingAmount,
} from '@/shared/lib/utils';
import { type ResourceRequestKey } from '@/shared/query';
import { type AnyAccount } from '@/domains/network';
import { staking, stakingService } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type NetworkStore } from '../lib/types';

type BalanceMap = { balance: string; stake: string };

type FormParams = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    coreTx: Transaction;
  }[];
  formData: FormParams & {
    signatory: AnyAccount | null;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    totalFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const formCleared = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $stakingResourceKey = createStore<ResourceRequestKey | null>(null);
const $minBond = createStore<string>(ZERO_BALANCE);

const $staking = combine(staking.stakingResource.$cache, $networkStore, (cache, network) =>
  network ? (cache[network.chain.chainId] ?? null) : null,
);

const $shards = createStore<AnyAccount[]>([]);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $accountsBalances = createStore<BalanceMap[]>([]);
const $restakeBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $totalFee = restore(totalFeeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $selectedSignatories = createStore<AnyAccount[]>([]);

const $restakeForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [] as AnyAccount[],
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
          name: 'noUnstakeBalance',
          errorText: t('staking.unstake.noUnstakeBalanceError'),
          source: combine({
            isProxy: $isProxy,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (shards, form, { isProxy, network, accountsBalances }) => {
            if (isProxy || shards.length === 1) return true;

            const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

            return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index].stake)));
          },
        },
      ],
    },
    signatory: {
      init: null,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: t('transfer.noSignatoryError'),
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!signatory || !isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
        {
          name: 'notEnoughTokens',
          errorText: t('proxy.addProxy.notEnoughMultisigTokens'),
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
          errorText: t('transfer.requiredAmountError'),
          validator: Boolean,
        },
        {
          name: 'notZero',
          errorText: t('transfer.notZeroAmountError'),
          validator: (value) => value !== ZERO_BALANCE,
        },
        {
          name: 'notEnoughBalance',
          errorText: t('staking.notEnoughBalanceError'),
          source: combine({
            network: $networkStore,
            restakeBalanceRange: $restakeBalanceRange,
          }),
          validator: (value, _, { network, restakeBalanceRange }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const restakeBalance = Array.isArray(restakeBalanceRange) ? restakeBalanceRange[1] : restakeBalanceRange;

            return amountBN.lte(new BN(restakeBalance));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: t('transfer.notEnoughBalanceForFeeError'),
          source: combine({
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { network, accountsBalances }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return form.shards.every((_: AnyAccount, index: number) => {
              return amountBN.lte(new BN(accountsBalances[index].balance));
            });
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Effects

const getMinNominatorBondFx = createEffect((api: ApiPromise): Promise<string> => {
  return stakingService.getMinNominatorBond(api);
});

// Computed

const $txWrappers = combine(
  {
    wallet: walletSelect.$selectedWallet,
    wallets: walletModel.$wallets,
    shards: $shards,
    network: $networkStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, shards, wallets, network, signatories }) => {
    if (!wallet || !network || shards.length !== 1) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isVaultBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: shards[0]!,
      signatories,
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: $restakeForm.fields.shards.$value,
  },
  ({ txWrappers, shards }) => {
    if (shards.length === 0) return [];
    if (txWrappers.length === 0) return shards;

    if (transactionService.hasMultisig([txWrappers[0]!])) {
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

    return walletUtils.getWalletById(wallets, accounts[0]!.walletId);
  },
  { skipVoid: false },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    shards: $shards,
    staking: $staking,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, shards, staking, balances }) => {
    if (!wallet || !network || !staking) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId);
      const activeStake = staking[shard.accountId]?.active || ZERO_BALANCE;

      return {
        account: shard,
        balances: { balance: transferableAmount(balance), stake: activeStake },
      };
    });
  },
);

const $signatories = combine(
  {
    network: $networkStore,
    txWrappers: $txWrappers,
  },
  ({ network, txWrappers }) => {
    if (!network) return [];

    return txWrappers.reduce<AnyAccount[][]>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const signatories = (wrapper as MultisigTxWrapper).signatories;

      acc.push(signatories);

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

    const status = statuses[network.chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    if (!network) return null;

    return apis[network.chain.chainId] ?? null;
  },
);

const $pureTxs = combine(
  {
    network: $networkStore,
    form: $restakeForm.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (!network || !isConnected) return undefined;

    return form.shards.map((shard) => {
      return transactionBuilder.buildRestake({
        chain: network.chain,
        asset: network.asset,
        accountId: shard.accountId,
        amount: form.amount || ZERO_BALANCE,
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
        api: apis[networkStore.chain.chainId]!,
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

const $isStakingLoading = $staking.map((s) => s === null);

const $canSubmit = combine(
  {
    isFormValid: $restakeForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isStakingLoading: $isStakingLoading,
  },
  ({ isFormValid, isFeeLoading, isStakingLoading }) => {
    return isFormValid && !isFeeLoading && !isStakingLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$restakeForm.reset, $selectedSignatories.reinit],
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
  source: $api,
  filter: (api): api is ApiPromise => Boolean(api),
  target: getMinNominatorBondFx,
});

sample({
  clock: getMinNominatorBondFx.doneData,
  target: $minBond,
});

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    shards: $shards,
  },
  filter: ({ networkStore, api }) => {
    return Boolean(networkStore) && Boolean(api);
  },
  fn: ({ networkStore, api, shards }) => {
    const accounts = shards.map((shard) => shard.accountId);

    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      accounts,
    };
  },
  target: staking.stakingResource.start,
});

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    shards: $shards,
  },
  filter: ({ networkStore, api }) => {
    return Boolean(networkStore) && Boolean(api);
  },
  fn: ({ networkStore, api, shards }) =>
    staking.stakingResource.createKey({
      chainId: networkStore!.chain.chainId,
      api: api!,
      accounts: shards.map((shard) => shard.accountId),
    }),
  target: $stakingResourceKey,
});

sample({
  source: {
    staking: $staking,
    shards: $restakeForm.fields.shards.$value,
  },
  filter: ({ staking }) => Boolean(staking),
  fn: ({ staking, shards }) => {
    if (shards.length === 0) return ZERO_BALANCE;

    const unstakedBalances = shards.map((shard) => {
      return unlockingAmount(staking![shard.accountId]?.unlocking);
    });

    const minUnstakedBalance = unstakedBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, '0');

    return unstakedBalances.length > 1 ? [ZERO_BALANCE, minUnstakedBalance] : minUnstakedBalance;
  },
  target: $restakeBalanceRange,
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards) => shards,
  target: $restakeForm.fields.shards.onChange,
});

sample({
  source: {
    accounts: $accounts,
    shards: $restakeForm.fields.shards.$value,
  },
  fn: ({ accounts, shards }) => {
    return accounts.reduce<{ balance: string; stake: string }[]>((acc, { account, balances }) => {
      if (shards.includes(account)) {
        acc.push(balances);
      }

      return acc;
    }, []);
  },
  target: $accountsBalances,
});

sample({
  clock: $restakeForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  filter: ({ network }) => nonNullable(network),
  fn: ({ balances, network }, signatory) => {
    if (!signatory) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $signatoryBalance,
});

sample({
  clock: $restakeForm.fields.signatory.$value,
  filter: (signatory: AnyAccount | null): signatory is AnyAccount => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: $restakeForm.fields.shards.onChange,
  target: $restakeForm.fields.amount.resetErrors,
});

sample({
  clock: $restakeForm.fields.amount.onChange,
  target: $restakeForm.fields.shards.resetErrors,
});

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => transactionService.hasProxy(txWrappers),
  target: $isProxy,
});

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => transactionService.hasMultisig(txWrappers),
  target: $isMultisig,
});

sample({
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
    proxyAccounts: $realAccounts,
  },
  filter: ({ isProxy, network, proxyAccounts }) => {
    return isProxy && Boolean(network) && proxyAccounts.length > 0;
  },
  fn: ({ balances, network, proxyAccounts }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccounts[0]!.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: $restakeForm.formValidated,
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
    const amount = formatAmount(rest.amount, network!.asset.precision);

    return {
      transactions: transactions!.map((tx) => ({
        wrappedTx: tx.wrappedTx,
        coreTx: tx.coreTx,
      })),
      formData: {
        ...fee,
        ...rest,
        amount,
        shards: realAccounts,
        ...(isProxy && { proxiedAccount: shards[0] as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: [formSubmitted, formCleared],
  source: $stakingResourceKey,
  filter: nonNullable,
  target: staking.stakingResource.stop,
});

sample({
  clock: formCleared,
  target: [$restakeForm.reset, $shards.reinit],
});

export const formModelShards = {
  $restakeForm,
  $proxyWallet,
  $signatories,
  $txWrappers,

  $accounts,
  $accountsBalances,
  $restakeBalanceRange,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $transactions,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,

    feeChanged,
    totalFeeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
