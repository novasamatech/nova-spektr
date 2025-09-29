import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  reservableAmountBN,
  transferableAmount,
} from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type WalletData } from '../lib/types';

type FormParams = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
};

const formInitiated = createEvent<WalletData>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const txWrapperChanged = createEvent<{
  proxyAccount: AnyAccount | null;
  signatories: AnyAccount[][];
  isProxy: boolean;
  isMultisig: boolean;
}>();
const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $shards = createStore<AnyAccount[]>([]);
const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $accountsBalances = createStore<string[]>([]);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $feeData = restore(feeDataChanged, { fee: ZERO_BALANCE, totalFee: ZERO_BALANCE, multisigDeposit: ZERO_BALANCE });
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $nominateForm = createForm<FormParams>({
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
    if (!isProxy || !proxyAccount) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
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

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: $nominateForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: $nominateForm.reset,
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
  target: $nominateForm.fields.shards.onChange,
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
    shards: $nominateForm.fields.shards.$value,
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
  clock: $nominateForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  fn: ({ balances, network }, signatory) => {
    if (!network || !signatory) return ZERO_BALANCE;

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
  clock: $nominateForm.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (_, formData) => formData,
  target: formChanged,
});

sample({
  clock: $nominateForm.formValidated,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$nominateForm.reset, $shards.reinit],
});

export const formModel = {
  $nominateForm,
  $proxyWallet,
  $signatories: $availableSignatories,

  $accounts,
  $accountsBalances,
  $proxyBalance,

  $feeData,
  $isFeeLoading,

  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,

    txWrapperChanged,
    feeDataChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
