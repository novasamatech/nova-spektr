import { BN, BN_ZERO } from '@polkadot/util';
import { type Store } from 'effector';

import { type Account } from '@/shared/core';
import {
  type AmountFeeStore,
  type ShardsProxyFeeStore,
  type SignatoryFeeStore,
  balanceValidation,
  descriptionValidation,
} from '@/features/operations/OperationsValidation';

export const UnlockRules = {
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
    insufficientBalanceForFee: (source: Store<AmountFeeStore>) => ({
      name: 'insufficientBalanceForFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (_v: string, form: any, { feeData, isMultisig, accountsBalances }: AmountFeeStore) => {
        if (isMultisig) return true;

        const feeBN = new BN(feeData.fee);

        return form.shards.every((_: Account, index: number) => {
          return feeBN.lte(new BN(accountsBalances[index]));
        });
      },
    }),
    noLockedAmount: (source: Store<BN>) => ({
      name: 'noLockedAmount',
      errorText: 'governance.locks.noLockedAmount',
      source,
      validator: (_v: string, form: any, totalLock: BN) => {
        return totalLock.sub(new BN(form.amount)).gte(BN_ZERO);
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
