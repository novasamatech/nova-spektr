import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import isEmpty from 'lodash/isEmpty';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nullable,
  stakeableAmount,
  transferableAmount,
} from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type WalletData } from '../lib/types';

type FormParams = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  amount: string;
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
const $bondBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $feeData = restore(feeDataChanged, { fee: ZERO_BALANCE, totalFee: ZERO_BALANCE, multisigDeposit: ZERO_BALANCE });
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const form = createForm<FormParams>({
  fields: {
    shards: {
      defaultValue: [],
      validator: () => {
        return {
          source: combine({
            feeData: $feeData,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          fn: (
            shards: AnyAccount[],
            form: FormParams,
            { feeData, isProxy, proxyBalance, network, accountsBalances },
          ) => {
            if (isProxy && new BN(feeData.fee).gt(new BN(proxyBalance))) {
              return { message: 'staking.bond.noBondBalanceError' };
            }

            if (isProxy && shards.length > 1) {
              const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

              const hasEnoughBalance = shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));

              if (!hasEnoughBalance) {
                return { message: 'staking.bond.noBondBalanceError' };
              }
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
            isMultisig: $isMultisig,
            feeData: $feeData,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory: AnyAccount | null, _: FormParams, { isMultisig, feeData, signatoryBalance }) => {
            if (isMultisig && signatory && Object.keys(signatory).length === 0) {
              return { message: 'transfer.noSignatoryError' };
            }

            if (isMultisig && new BN(feeData.multisigDeposit).add(new BN(feeData.fee)).gt(new BN(signatoryBalance))) {
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
            bondBalanceRange: $bondBalanceRange,
            feeData: $feeData,
            isMultisig: $isMultisig,
            accountsBalances: $accountsBalances,
          }),
          fn: (
            value: string,
            form: FormParams,
            { network, bondBalanceRange, feeData, isMultisig, accountsBalances },
          ) => {
            if (nullable(value)) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const bondBalance = Array.isArray(bondBalanceRange) ? bondBalanceRange[1] : bondBalanceRange;

            if (amountBN.gt(new BN(bondBalance))) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            if (!isMultisig) {
              const feeBN = new BN(feeData.fee);
              const hasInsufficientBalance = !form.shards.every((_: AnyAccount, index: number) => {
                return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
              });

              if (hasInsufficientBalance) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
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

//todo use $bondForm.$isValid in the future
const $isValid = combine(
  {
    shardsErrors: form.fields.shards.$errors,
    signatoryErrors: form.fields.signatory.$errors,
    amountErrors: form.fields.amount.$errors,
  },
  ({ shardsErrors, signatoryErrors, amountErrors }) => {
    return shardsErrors.length === 0 && signatoryErrors.length === 0 && amountErrors.length === 0;
  },
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
    availableSignatories: $availableSignatories,
    balances: balanceModel.$balances,
  },
  ({ network, availableSignatories, balances }) => {
    if (!network) return [];

    const { chain, asset } = network;

    return availableSignatories.reduce<{ signer: AnyAccount; balance: string }[][]>((acc, signatories) => {
      const balancedSignatories = signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId.toString());

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
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
    isFormValid: $isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
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
  filter: (shards: AnyAccount[]) => shards.length > 0,
  fn: (shards: AnyAccount[]) => shards,
  target: form.fields.shards.change,
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
    shards: form.fields.shards.$value,
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
    }, accountsBalances[0]);

    return minBondBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, minBondBalance];
  },
  target: $bondBalanceRange,
});

sample({
  clock: form.fields.signatory.change,
  source: $signatories,
  filter: (signatories: { signer: AnyAccount; balance: string }[][]) => !isEmpty(signatories),
  fn: (signatories: { signer: AnyAccount; balance: string }[][], signatory: AnyAccount | null) => {
    const match = signatories[0].find(({ signer }: { signer: AnyAccount }) => signer.id === signatory?.id);

    return match?.balance || ZERO_BALANCE;
  },
  target: $signatoryBalance,
});

sample({
  clock: form.fields.shards.change,
  fn: () => [],
  target: form.fields.amount.setErrors,
});

sample({
  clock: form.fields.amount.change,
  fn: () => [],
  target: form.fields.shards.setErrors,
});

sample({
  source: {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balances,
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
      network!.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: form.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (_, formData) => formData,
  target: formChanged,
});

sample({
  clock: form.submit.doneData,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [form.reset, $shards.reinit],
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

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

    txWrapperChanged,
    feeDataChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
