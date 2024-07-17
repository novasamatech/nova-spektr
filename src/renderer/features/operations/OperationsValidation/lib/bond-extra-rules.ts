import { type Store } from 'effector';
import { BN } from '@polkadot/util';

import { formatAmount } from '@shared/lib/utils';
import { balanceValidation, descriptionValidation } from './validation';
import { type Account } from '@shared/core';
import {
  type AmountFeeStore,
  type BondAmountBalanceStore,
  type Config,
  type ShardsBondBalanceStore,
  type ShardsProxyFeeStore,
  type SignatoryFeeStore,
} from '../types/types';

export const BondExtraRules = {
  shards: {
    noProxyFee: (source: Store<ShardsProxyFeeStore>) => ({
      name: 'noProxyFee',
      source,
      validator: (_v: any, _f: any, { isProxy, proxyBalance, feeData }: ShardsProxyFeeStore) => {
        if (!isProxy) return true;

        return new BN(feeData.fee).lte(new BN(proxyBalance));
      },
    }),
    noBondBalance: (source: Store<ShardsBondBalanceStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'noBondBalance',
      errorText: 'staking.bond.noBondBalanceError',
      source,
      validator: (shards: any[], form: any, { isProxy, network, accountsBalances }: ShardsBondBalanceStore) => {
        if (isProxy || shards.length === 1) return true;

        const value = config?.withFormatAmount ? formatAmount(form.amount, network.asset.precision) : form.amount;
        const amountBN = new BN(value);

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
    notEnoughBalance: (source: Store<BondAmountBalanceStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'notEnoughBalance',
      errorText: 'staking.notEnoughBalanceError',
      source,
      validator: (amount: string, _: any, { network, bondBalanceRange }: BondAmountBalanceStore) => {
        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;
        const amountBN = new BN(value);

        const bondBalance = Array.isArray(bondBalanceRange) ? bondBalanceRange[0] : bondBalanceRange;

        return amountBN.lte(new BN(bondBalance));
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
