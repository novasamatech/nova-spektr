import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { noop } from 'lodash';
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
  getRelaychainAsset,
  nonNullable,
  nullable,
  redeemableAmount,
  transferableAmount,
} from '@/shared/lib/utils';
import { type ResourceRequestKey } from '@/shared/query';
import { type AnyAccount } from '@/domains/network';
import { eraService, staking } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type NetworkStore } from '../lib/types';

type BalanceMap = { balance: string; withdraw: string };

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
const eraSet = createEvent<number>();
const formCleared = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $stakingResourceKey = createStore<ResourceRequestKey | null>(null);
const $era = restore(eraSet, null);
const $eraUnsub = createStore<() => void>(noop);

const $staking = combine(staking.stakingResource.$cache, $networkStore, (cache, network) =>
  network ? (cache[network.chain.chainId] ?? null) : null,
);

const $shards = createStore<AnyAccount[]>([]);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $accountsBalances = createStore<BalanceMap[]>([]);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $withdrawBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $totalFee = restore(totalFeeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $selectedSignatories = createStore<AnyAccount[]>([]);

const $withdrawForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [],
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
          name: 'insufficientBalanceForFee',
          errorText: t('transfer.notEnoughBalanceForFeeError'),
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { fee, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            return form.shards.every((_: AnyAccount, index: number) => {
              return new BN(fee).lte(new BN(accountsBalances[index].balance));
            });
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Effects

const subscribeEraFx = createEffect((api: ApiPromise): Promise<() => void> => {
  const boundEraSet = scopeBind(eraSet, { safe: true });

  return eraService.subscribeActiveEra(api, (era) => {
    if (!era) return;

    boundEraSet(era);
  });
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
    shards: $withdrawForm.fields.shards.$value,
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
    if (!isProxy || accounts.length === 0) return null;

    return walletUtils.getWalletById(wallets, accounts[0]!.walletId);
  },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    shards: $shards,
    era: $era,
    staking: $staking,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, era, shards, staking, balances }) => {
    if (!wallet || !network || !staking) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId);
      const withdraw = redeemableAmount(staking[shard.accountId]?.unlocking, era || 0);

      return {
        account: shard,
        balances: { balance: transferableAmount(balance), withdraw },
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

      acc.push((wrapper as MultisigTxWrapper).signatories);

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
    form: $withdrawForm.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (!network || !isConnected) return null;

    return form.shards.map((shard) => {
      return transactionBuilder.buildWithdraw({
        chain: network.chain,
        accountId: shard.accountId,
      });
    });
  },
);

const $transactions = combine(
  {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ apis, networkStore, pureTxs, txWrappers }) => {
    if (!networkStore || !pureTxs) return null;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api: apis[networkStore.chain.chainId]!,
        transaction: tx,
        txWrappers,
      }),
    );
  },
);

const $isStakingLoading = $staking.map((s) => s === null);

const $canSubmit = combine(
  {
    isFormValid: $withdrawForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isStakingLoading: $isStakingLoading,
    isEraLoading: subscribeEraFx.pending,
  },
  ({ isFormValid, isFeeLoading, isStakingLoading, isEraLoading }) => {
    return isFormValid && !isFeeLoading && !isStakingLoading && !isEraLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$withdrawForm.reset, $selectedSignatories.reinit],
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => nonNullable(getRelaychainAsset(chain.assets)) && shards.length > 0,
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
  source: {
    networkStore: $networkStore,
    api: $api,
    shards: $shards,
  },
  filter: ({ networkStore, api }) => {
    return nonNullable(networkStore) && nonNullable(api);
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
    return nonNullable(networkStore) && nonNullable(api);
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
  clock: formInitiated,
  source: $api,
  filter: (api): api is ApiPromise => nonNullable(api),
  target: subscribeEraFx,
});

sample({
  clock: subscribeEraFx.doneData,
  target: $eraUnsub,
});

sample({
  clock: $accountsBalances,
  filter: (balances) => nonNullable(balances),
  fn: (balances) => {
    if (balances.length === 0) return ZERO_BALANCE;

    const totalWithdraw = balances.reduce<BN>((acc, { withdraw }) => {
      if (!withdraw) return acc;

      return new BN(withdraw).add(new BN(acc));
    }, new BN(ZERO_BALANCE));

    return totalWithdraw.toString();
  },
  target: [$withdrawBalance, $withdrawForm.fields.amount.onChange],
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  target: $withdrawForm.fields.shards.onChange,
});

sample({
  source: {
    accounts: $accounts,
    shards: $withdrawForm.fields.shards.$value,
  },
  fn: ({ accounts, shards }) => {
    return accounts.reduce<BalanceMap[]>((acc, { account, balances }) => {
      if (shards.includes(account)) {
        acc.push(balances);
      }

      return acc;
    }, []);
  },
  target: $accountsBalances,
});

sample({
  clock: $withdrawForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  fn: ({ balances, network }, signatory) => {
    if (nullable(signatory) || nullable(balances) || nullable(network)) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $signatoryBalance,
});

sample({
  clock: $withdrawForm.fields.signatory.$value,
  filter: (signatory: AnyAccount | null): signatory is AnyAccount => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: $withdrawForm.fields.shards.onChange,
  target: $withdrawForm.fields.amount.resetErrors,
});

sample({
  clock: $withdrawForm.fields.amount.onChange,
  target: $withdrawForm.fields.shards.resetErrors,
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
    return isProxy && nonNullable(network) && proxyAccounts.length > 0;
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
  clock: $withdrawForm.formValidated,
  source: {
    amount: $withdrawBalance,
    realAccounts: $realAccounts,
    network: $networkStore,
    transactions: $transactions,
    isProxy: $isProxy,
    fee: $fee,
    totalFee: $totalFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transactions }) => {
    return nonNullable(network) && nonNullable(transactions);
  },
  fn: ({ amount, realAccounts, transactions, isProxy, ...fee }, formData) => {
    const { shards, ...rest } = formData;

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
  clock: formSubmitted,
  target: attach({
    source: $eraUnsub,
    effect: (unsub) => unsub(),
  }),
});

sample({
  clock: formCleared,
  target: [$withdrawForm.reset, $shards.reinit],
});

export const formModelShards = {
  $withdrawForm,
  $proxyWallet,
  $signatories,
  $txWrappers,

  $accounts,
  $accountsBalances,
  $withdrawBalance,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $transactions,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading,
  $isEraLoading: subscribeEraFx.pending,
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
