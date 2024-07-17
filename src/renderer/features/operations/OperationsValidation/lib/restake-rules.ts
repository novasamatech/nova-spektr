import { BN } from '@polkadot/util';
import { type Store } from 'effector';

import { type Account, RewardsDestination } from '@shared/core';
import { formatAmount, validateAddress } from '@shared/lib/utils';

import {
  type AmountFeeStore,
  type Config,
  type RestakeAmountBalanceStore,
  type ShardsBondBalanceStore,
  type ShardsProxyFeeStore,
  type SignatoryFeeStore,
} from '../types/types';

import { balanceValidation, descriptionValidation } from './validation';

export const RestakeRules = {
  shards: {
    noProxyFee: (source: Store<ShardsProxyFeeStore>) => ({
      name: 'noProxyFee',
      source,
      validator: (_v: any, _f: any, { isProxy, proxyBalance, feeData }: ShardsProxyFeeStore) => {
        if (!isProxy) return true;

        return new BN(feeData.fee).lte(new BN(proxyBalance));
      },
    }),
    noBondBalance: (source: Store<ShardsBondBalanceStore>) => ({
      name: 'noBondBalance',
      errorText: 'staking.bond.noBondBalanceError',
      source,
      validator: (shards: any[], form: any, { isProxy, network, accountsBalances }: ShardsBondBalanceStore) => {
        if (isProxy || shards.length === 1) return true;

        const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

        return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));
      },
    }),
  },
  signatory: {
    noSignatorySelected: (source: Store<boolean>) => ({
      name: 'noSignatorySelected',
      errorText: 'transfer.noSignatoryError',
      source,
      validator: (signatory: Account, _: any, isMultisig: boolean) => {
        if (!isMultisig) return true;

        return Object.keys(signatory).length > 0;
      },
    }),
    notEnoughTokens: (source: Store<SignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughMultisigTokens',
      source,
      validator: (_s: any, _f: any, { feeData, isMultisig, signatoryBalance }: SignatoryFeeStore) => {
        if (!isMultisig) return true;

        const value = new BN(feeData.multisigDeposit).add(new BN(feeData.fee));

        return balanceValidation.isLteThanBalance(value, signatoryBalance);
      },
    }),
  },
  destination: {
    required: (source: Store<RewardsDestination>) => ({
      name: 'required',
      errorText: 'proxy.addProxy.proxyAddressRequiredError',
      source,
      validator: (value: string, _: any, destinationType: RewardsDestination) => {
        if (destinationType === RewardsDestination.RESTAKE) return true;

        return validateAddress(value);
      },
    }),
  },
  amount: {
    required: {
      name: 'required',
      errorText: 'transfer.requiredAmountError',
      validator: Boolean,
    },

    notZero: {
      name: 'notZero',
      errorText: 'transfer.notZeroAmountError',
      validator: balanceValidation.isNonZeroBalance,
    },
    notEnoughBalance: (source: Store<RestakeAmountBalanceStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'notEnoughBalance',
      errorText: 'staking.notEnoughBalanceError',
      source,
      validator: (amount: string, _: any, { network, restakeBalanceRange }: RestakeAmountBalanceStore) => {
        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;
        const amountBN = new BN(value);

        const restakeBalance = Array.isArray(restakeBalanceRange) ? restakeBalanceRange[0] : restakeBalanceRange;

        return amountBN.lte(new BN(restakeBalance));
      },
    }),
    insufficientBalanceForFee: (source: Store<AmountFeeStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'insufficientBalanceForFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (amount: string, form: any, { network, feeData, isMultisig, accountsBalances }: AmountFeeStore) => {
        if (isMultisig) return true;

        const feeBN = new BN(feeData.fee);
        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;
        const amountBN = new BN(value);

        return form.shards.every((_: Account, index: number) => {
          return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
        });
      },
    }),
  },
  description: {
    maxLength: {
      name: 'maxLength',
      errorText: 'transfer.descriptionLengthError',
      validator: descriptionValidation.isMaxLength,
    },
  },
};
