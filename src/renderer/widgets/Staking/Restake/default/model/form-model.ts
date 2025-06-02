import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import isEmpty from 'lodash/isEmpty';
import noop from 'lodash/noop';
import { spread } from 'patronum';

import {
  type Account,
  type Address,
  type Asset,
  type Chain,
  type ChainId,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
} from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
  unlockingAmount,
} from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { type StakingMap, useStakingData } from '@/entities/staking';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type NetworkStore } from '../lib/types';

type BalanceMap = { balance: string; stake: string };

type FormParams = {
  shards: Account[];
  signatory: Account | null;
  amount: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  }[];
  formData: FormParams & {
    signatory: Account | null;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    totalFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const stakingSet = createEvent<StakingMap>();
const formCleared = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $staking = restore(stakingSet, null);
const $minBond = createStore<string>(ZERO_BALANCE);
const $stakingUnsub = createStore<() => void>(noop);

const $shards = createStore<Account[]>([]);
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

const $selectedSignatories = createStore<Account[]>([]);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    shards: {
      defaultValue: [] as Account[],
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          fn: (_v, _f, { isProxy, proxyBalance, fee }) => {
            if (isProxy && new BN(fee).gt(new BN(proxyBalance))) {
              return { message: 'transfer.notEnoughBalanceForFeeError' };
            }
          },
        };
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory, _f, { fee, isMultisig, multisigDeposit, signatoryBalance }) => {
            const isNotEnoughMultisigTokens =
              isMultisig && new BN(multisigDeposit).add(new BN(fee)).gt(new BN(signatoryBalance));
            if (isNotEnoughMultisigTokens) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            network: $networkStore,
            restakeBalanceRange: $restakeBalanceRange,
            accountsBalances: $accountsBalances,
          }),
          fn: (amount, _f, { network, restakeBalanceRange, accountsBalances }) => {
            if (nullable(amount) || amount === '') {
              return { message: 'transfer.requiredAmountError' };
            }

            if (amount === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            const amountBN = new BN(formatAmount(amount, network.asset.precision));
            const restakeBalance = Array.isArray(restakeBalanceRange) ? restakeBalanceRange[1] : restakeBalanceRange;
            const isNotEnoughBalance = amountBN.gt(new BN(restakeBalance));
            if (isNotEnoughBalance) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            const isNotEnoughBalanceForFee = amountBN.gt(new BN(accountsBalances[0].balance));
            if (isNotEnoughBalanceForFee) {
              return { message: 'transfer.notEnoughBalanceForFeeError' };
            }
          },
        };
      },
    },
  },
});

// Effects
type StakingParams = {
  chainId: ChainId;
  api: ApiPromise;
  addresses: Address[];
};
const subscribeStakingFx = createEffect(({ chainId, api, addresses }: StakingParams): Promise<() => void> => {
  const boundStakingSet = scopeBind(stakingSet, { safe: true });

  return useStakingData().subscribeStaking(chainId, api, addresses, boundStakingSet);
});

const getMinNominatorBondFx = createEffect((api: ApiPromise): Promise<string> => {
  return useStakingData().getMinNominatorBond(api);
});

// Computed

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
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
      account: shards[0],
      signatories,
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: form.fields.shards.$value,
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
    staking: $staking,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, shards, staking, balances }) => {
    if (!wallet || !network || !staking) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId.toString());
      const address = toAddress(shard.accountId, { prefix: chain.addressPrefix });
      const activeStake = staking[address]?.active || ZERO_BALANCE;

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
    balances: balanceModel.$balances,
  },
  ({ network, txWrappers, balances }) => {
    if (!network) return [];

    const { chain, asset } = network;

    return txWrappers.reduce<{ signer: Account; balance: string }[][]>((acc, wrapper) => {
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
    if (!network) return null;

    return apis[network.chain.chainId] ?? null;
  },
);

const $pureTxs = combine(
  {
    network: $networkStore,
    form: form.$values,
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
        api: apis[networkStore.chain.chainId],
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFeeLoading: $isFeeLoading,
    isStakingLoading: subscribeStakingFx.pending,
  },
  ({ isFeeLoading, isStakingLoading }) => {
    return !isFeeLoading && !isStakingLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [form.reset, $selectedSignatories.reinit],
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
    const addresses = shards.map((shard) => toAddress(shard.accountId, { prefix: networkStore!.chain.addressPrefix }));

    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      addresses,
    };
  },
  target: subscribeStakingFx,
});

sample({
  clock: subscribeStakingFx.doneData,
  target: $stakingUnsub,
});

sample({
  source: {
    staking: $staking,
    networkStore: $networkStore,
    shards: form.fields.shards.$value,
  },
  filter: ({ staking, networkStore }) => Boolean(staking) && Boolean(networkStore),
  fn: ({ staking, networkStore, shards }) => {
    if (shards.length === 0) return ZERO_BALANCE;

    const unstakedBalances = shards.map((shard) => {
      const address = toAddress(shard.accountId, { prefix: networkStore!.chain.addressPrefix });

      return unlockingAmount(staking![address]?.unlocking);
    });

    const minUnstakedBalance = unstakedBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, unstakedBalances[0]);

    return unstakedBalances.length > 1 ? [ZERO_BALANCE, minUnstakedBalance] : minUnstakedBalance;
  },
  target: $restakeBalanceRange,
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards) => shards,
  target: form.fields.shards.change,
});

sample({
  source: {
    accounts: $accounts,
    shards: form.fields.shards.$value,
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
  clock: form.fields.signatory.change,
  source: $signatories,
  filter: (signatories) => !isEmpty(signatories),
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory?.id);

    return match?.balance || ZERO_BALANCE;
  },
  target: $signatoryBalance,
});

sample({
  clock: form.fields.signatory.$value,
  filter: (signatory: Account | null): signatory is Account => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: form.fields.shards.change,
  target: form.fields.amount.reset,
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
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balances,
    network: $networkStore,
    proxyAccounts: $realAccounts,
  },
  filter: ({ isProxy, network, proxyAccounts }) => {
    return isProxy && Boolean(network) && proxyAccounts.length > 0;
  },
  fn: ({ balances, network, proxyAccounts }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccounts[0].accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: form.submit.doneData,
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
        multisigTx: tx.multisigTx,
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
  clock: formSubmitted,
  target: attach({
    source: $stakingUnsub,
    effect: (unsub) => unsub(),
  }),
});

sample({
  clock: formCleared,
  target: [form.reset, $shards.reinit],
});

export const formModel = {
  form,

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
  $isStakingLoading: subscribeStakingFx.pending,
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
