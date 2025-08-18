import { BN } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { RewardsDestination } from '@/shared/core';
import { formatAmount, validateAddress } from '@/shared/lib/utils';
import { createTxValidator } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type ShardsBondBalanceStore, type ShardsProxyFeeStore, type SignatoryFeeStore } from '../types/types';

import { balanceValidation, descriptionValidation } from './validation';

export const PayeeRules = {
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
      errorText: t('staking.bond.noBondBalanceError'),
      source,
      validator: (shards: any[], form: any, { isProxy, network, accountsBalances }: ShardsBondBalanceStore) => {
        if (isProxy || shards.length === 1) return true;

        const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

        return shards.every((_, index) => balanceValidation.isLteThanBalance(amountBN, accountsBalances[index]));
      },
    }),
  },
  signatory: {
    noSignatorySelected: (source: Store<boolean>) => ({
      name: 'noSignatorySelected',
      errorText: t('transfer.noSignatoryError'),
      source,
      validator: (signatory: AnyAccount, _: any, isMultisig: boolean) => {
        if (!isMultisig) return true;

        return Object.keys(signatory).length > 0;
      },
    }),
    notEnoughTokens: (source: Store<SignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: t('proxy.addProxy.notEnoughMultisigTokens'),
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
      errorText: t('proxy.addProxy.proxyAddressRequiredError'),
      source,
      validator: (value: string, _: any, destinationType: RewardsDestination) => {
        if (destinationType === RewardsDestination.RESTAKE) return true;

        return validateAddress(value);
      },
    }),
  },
  description: {
    maxLength: {
      name: 'maxLength',
      errorText: t('transfer.descriptionLengthError'),
      validator: descriptionValidation.isMaxLength,
    },
  },
};

export const payeeValidator = createTxValidator();
