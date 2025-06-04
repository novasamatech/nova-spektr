import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import isEmpty from 'lodash/isEmpty';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
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
  initiator: AnyAccount | null;
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

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $feeData = restore(feeDataChanged, { fee: ZERO_BALANCE, totalFee: ZERO_BALANCE, multisigDeposit: ZERO_BALANCE });
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            feeData: $feeData,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
            network: $networkStore,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (
            initiator: AnyAccount | null,
            form: FormParams,
            { feeData, isProxy, proxyBalance, network, initiatorBalance },
          ) => {
            if (!initiator) {
              return { message: 'staking.bond.noInitiatorError' };
            }

            if (isProxy && new BN(feeData.fee).gt(new BN(proxyBalance))) {
              return { message: 'staking.bond.noBondBalanceError' };
            }

            if (isProxy && form.amount) {
              const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

              if (amountBN.gt(new BN(initiatorBalance))) {
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
            initiatorBalance: $initiatorBalance,
          }),
          fn: (
            value: string,
            form: FormParams,
            { network, bondBalanceRange, feeData, isMultisig, initiatorBalance },
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

            if (!isMultisig && form.initiator) {
              const feeBN = new BN(feeData.fee);

              if (amountBN.add(feeBN).gt(new BN(initiatorBalance))) {
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
    initiatorErrors: form.fields.initiator.$errors,
    signatoryErrors: form.fields.signatory.$errors,
    amountErrors: form.fields.amount.$errors,
  },
  ({ initiatorErrors, signatoryErrors, amountErrors }) => {
    return initiatorErrors.length === 0 && signatoryErrors.length === 0 && amountErrors.length === 0;
  },
);

const $account = combine(
  {
    network: $networkStore,
    wallet: walletModel.$activeWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, initiator, balances }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId.toString());

    return { account: initiator, balance: stakeableAmount(balance) };
  },
);

const $initiatorBalance = combine($account, (account) => {
  return account?.balance || ZERO_BALANCE;
});

const $bondBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ isProxy, network, proxyAccount, balances }) => {
    if (!isProxy || !network || !proxyAccount) {
      return ZERO_BALANCE;
    }

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
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

const $signatoryBalance = combine(
  {
    signatories: $signatories,
    signatory: form.fields.signatory.$value,
  },
  ({ signatories, signatory }) => {
    if (isEmpty(signatories)) return ZERO_BALANCE;

    const match = signatories[0].find(({ signer }: { signer: AnyAccount }) => signer.id === signatory?.id);

    return match?.balance || ZERO_BALANCE;
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
  filter: ({ chain, initiator }) => Boolean(getRelaychainAsset(chain.assets)) && Boolean(initiator),
  fn: ({ chain, initiator }) => ({
    initiator,
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    networkStore: $networkStore,
  }),
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
  clock: form.fields.initiator.change,
  fn: () => [],
  target: form.fields.amount.setErrors,
});

sample({
  clock: form.fields.amount.change,
  fn: () => [],
  target: form.fields.initiator.setErrors,
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
  target: [form.reset],
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

  $account,
  $initiatorBalance,
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
