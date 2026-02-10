import { BN } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { ZERO_BALANCE } from '@/shared/lib/utils';
import { createTxValidator } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { type AmountFeeStore, type ShardsProxyFeeStore, type SignatoryFeeStore } from '../types/types';

import { balanceValidation, descriptionValidation } from './validation';

export const WithdrawRules = {
  shards: {
    noProxyFee: (source: Store<ShardsProxyFeeStore>) => ({
      name: 'noProxyFee',
      source,
      validator: (_v: any, _f: any, { isProxy, proxyBalance, feeData }: ShardsProxyFeeStore) => {
        if (!isProxy) return true;

        return new BN(feeData.fee).lte(new BN(proxyBalance));
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
  amount: {
    required: {
      name: 'required',
      errorText: t('transfer.requiredAmountError'),
      validator: Boolean,
    },

    notZero: {
      name: 'notZero',
      errorText: t('transfer.notZeroAmountError'),
      validator: balanceValidation.isNonZeroBalance,
    },
    insufficientBalanceForFee: (source: Store<AmountFeeStore>) => ({
      name: 'insufficientBalanceForFee',
      errorText: t('transfer.notEnoughBalanceForFeeError'),
      source,
      validator: (_v: string, form: any, { feeData, isMultisig, accountsBalances }: AmountFeeStore) => {
        if (isMultisig) return true;

        const feeBN = new BN(feeData.fee);

        return form.shards.every((_: AnyAccount, index: number) => {
          return feeBN.lte(new BN(accountsBalances[index]!));
        });
      },
    }),
    noRedeemBalance: (source: Store<AmountFeeStore>) => ({
      name: 'noRedeemBalance',
      errorText: t('staking.notEnoughUnlockingError'),
      source,
      validator: (_v: string, form: any, { accountsBalances }: AmountFeeStore) => {
        return form.shards.every((_: AnyAccount, index: number) => {
          return accountsBalances[index] !== ZERO_BALANCE;
        });
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

export const withdrawValidator = createTxValidator();
