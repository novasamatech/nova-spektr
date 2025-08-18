import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';
import { spread } from 'patronum';

import { type Asset, type Chain, RewardsDestination } from '@/shared/core';
import {
  formatAmount,
  getRelaychainAsset,
  isStringsMatchQuery,
  stakeableAmount,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type WalletData } from '../lib/types';

type FormParams = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
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
const $bondBalanceRange = createStore<string | string[]>('0');
const $signatoryBalance = createStore<string>('0');
const $proxyBalance = createStore<string>('0');

const $signatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $feeData = restore(feeDataChanged, { fee: '0', totalFee: '0', multisigDeposit: '0' });
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $payeeForm = createForm<FormParams>({
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

      return { account: shard, balance: stakeableAmount(balance) };
    });
  },
);

const $destinationAccounts = combine(
  {
    accounts: accounts.$list,
    network: $networkStore,
    query: $destinationQuery,
  },
  ({ accounts, network, query }) => {
    if (!network) return [];

    return accounts.filter((account) => {
      const hasPermission = accountService.hasPermissionToMakeActions(account);
      const isAvailableOnChain = accountService.isAccountAvailableOnChain(account, network.chain);
      const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });
      const matchesQuery = isStringsMatchQuery(query, [account.name, address]);

      return hasPermission && isAvailableOnChain && matchesQuery;
    });
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : null;
  },
);

const $canSubmit = combine(
  {
    isFormValid: $payeeForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: $payeeForm.reset,
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
  target: $payeeForm.fields.shards.onChange,
});

sample({
  clock: txWrapperChanged,
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
    signatories: $signatories,
    proxyAccount: $proxyAccount,
  }),
});

sample({
  source: {
    accounts: $accounts,
    shards: $payeeForm.fields.shards.$value,
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
  clock: $payeeForm.fields.signatory.onChange,
  source: {
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  filter: ({ network }) => Boolean(network),
  fn: ({ balances, network }, signatory) => {
    if (!signatory) return '0';

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
  clock: $payeeForm.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (networkStore, formData) => {
    const destination = toAddress(formData.destination, { prefix: networkStore!.chain.addressPrefix });

    return { ...formData, destination };
  },
  target: formChanged,
});

sample({
  clock: $payeeForm.formValidated,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$payeeForm.reset, $shards.reinit],
});

export const formModel = {
  $payeeForm,
  $proxyWallet,
  $signatories,
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

  events: {
    formInitiated,
    formCleared,
    destinationQueryChanged,
    destinationTypeChanged,

    txWrapperChanged,
    feeDataChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
