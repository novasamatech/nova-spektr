import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { spread } from 'patronum';

import { type Asset, type Chain, RewardsDestination } from '@/shared/core';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  isStringsMatchQuery,
  reservableAmountBN,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type WalletData } from '../lib/types';

type FormParams = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  amount: string;
  destination: string;
};

const formInitiated = createEvent<WalletData>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();
const destinationQueryChanged = createEvent<string>();
const destinationTypeChanged = createEvent<RewardsDestination>();

const txWrapperChanged = createEvent<{
  proxyAccount: AnyAccount | null;
  signatories: AnyAccount[][];
  isProxy: boolean;
  isMultisig: boolean;
}>();
const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $shards = createStore<AnyAccount[]>([]);
const $destinationQuery = restore(destinationQueryChanged, '');
const $destinationType = restore(destinationTypeChanged, RewardsDestination.RESTAKE);

const $accountsBalances = createStore<string[]>([]);
const $bondBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $feeData = restore(feeDataChanged, {
  fee: ZERO_BALANCE,
  totalFee: ZERO_BALANCE,
  multisigDeposit: ZERO_BALANCE,
});

const $bondForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [] as AnyAccount[],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            feeData: $feeData,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, feeData }) => {
            if (!isProxy) return true;

            return new BN(feeData.fee).lte(new BN(proxyBalance));
          },
        },
        {
          name: 'noBondBalance',
          errorText: t('staking.bond.noBondBalanceError'),
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
            feeData: $feeData,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { feeData, isMultisig, signatoryBalance }) => {
            if (!isMultisig) return true;

            return new BN(feeData.multisigDeposit).add(new BN(feeData.fee)).lte(new BN(signatoryBalance));
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
          errorText: t('transfer.notEnoughBalanceForFeeError'),
          source: combine({
            feeData: $feeData,
            isMultisig: $isMultisig,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { network, feeData, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            const feeBN = new BN(feeData.fee);
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return form.shards.every((_: AnyAccount, index: number) => {
              return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
            });
          },
        },
      ],
    },
    destination: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: t('proxy.addProxy.proxyAddressRequiredError'),
          source: $destinationType,
          validator: (value, _, destinationType) => {
            if (destinationType === RewardsDestination.RESTAKE) return true;

            return validateAddress(value);
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Computed

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    shards: $shards,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, shards, balances }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId);

      return { account: shard, balance: (balance ? reservableAmountBN(balance) : BN_ZERO).toString() };
    });
  },
);

const $destinationAccounts = combine(
  {
    wallets: walletModel.$wallets,
    network: $networkStore,
    query: $destinationQuery,
  },
  ({ wallets, network, query }) => {
    if (!network) return [];

    return walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isVaultShardAccount(account);
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, network.chain);
      const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

      return isChainAndCryptoMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
    });
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? (apis[network.chain.chainId] ?? null) : null;
  },
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
  target: $bondForm.reset,
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
  clock: txWrapperChanged,
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
    signatories: $availableSignatories,
    proxyAccount: $proxyAccount,
  }),
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
    if (accountsBalances.length === 0) return ZERO_BALANCE;

    const minBondBalance = accountsBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, accountsBalances[0]!);

    return minBondBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, minBondBalance];
  },
  target: $bondBalanceRange,
});

sample({
  clock: $bondForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  fn: ({ balances, network }, signatory) => {
    if (!network || !signatory) return ZERO_BALANCE;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);

    return transferableAmount(balance);
  },
  target: $signatoryBalance,
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
  source: {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  filter: ({ isProxy, network, proxyAccount }) => {
    return isProxy && Boolean(network) && Boolean(proxyAccount);
  },
  fn: ({ balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount!.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: $bondForm.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (_, formData) => formData,
  target: formChanged,
});

sample({
  clock: $bondForm.formValidated,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$bondForm.reset, $shards.reinit],
});

export const formModel = {
  $bondForm,
  $proxyWallet,
  $signatories: $availableSignatories,
  $destinationAccounts,
  $destinationQuery,
  $destinationType,

  $accounts,
  $accountsBalances,
  $bondBalanceRange,
  $proxyBalance,

  $feeData,
  $isFeeLoading,

  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,

  formInitiated,
  formCleared,
  destinationQueryChanged,
  destinationTypeChanged,

  txWrapperChanged,
  feeDataChanged,
  isFeeLoadingChanged,
  formSubmitted,
  formChanged,
};
