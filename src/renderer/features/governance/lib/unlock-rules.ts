import { BN, BN_ZERO } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { ZERO_BALANCE } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import {
  type AmountFeeStore,
  type ShardsProxyFeeStore,
  type SignatoryFeeStore,
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
        const balanceBN = new BN(signatoryBalance);

        return value.lte(balanceBN);
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
      validator: (value: string) => value.toString() !== ZERO_BALANCE,
    },
    insufficientBalanceForFee: (source: Store<AmountFeeStore>) => ({
      name: 'insufficientBalanceForFee',
      errorText: t('transfer.notEnoughBalanceForFeeError'),
      source,
      validator: (_v: string, form: any, { feeData, isMultisig, accountsBalances }: AmountFeeStore) => {
        if (isMultisig) return true;

        const feeBN = new BN(feeData.fee);

        return form.shards.every((_: AnyAccount, index: number) => {
          return feeBN.lte(new BN(accountsBalances[index]));
        });
      },
    }),
    noLockedAmount: (source: Store<BN>) => ({
      name: 'noLockedAmount',
      errorText: t('governance.locks.noLockedAmount'),
      source,
      validator: (_v: string, form: any, totalLock: BN) => {
        return totalLock.sub(new BN(form.amount)).gte(BN_ZERO);
      },
    }),
  },
};
