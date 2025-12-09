import { BN, BN_ZERO } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { formatAmount } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import {
  type DelegateFeeStore,
  type NetworkStore,
  type TransferAccountStore,
  type TransferSignatoryFeeStore,
  type ValidatorBalanceMap,
} from '../types/types';

import { balanceValidation, descriptionValidation } from './validation';

export const DelegateRules = {
  account: {
    noProxyFee: (source: Store<TransferAccountStore>) => ({
      name: 'noProxyFee',
      errorText: t('transfer.noSignatoryError'),
      source,
      validator: (_a: AnyAccount, _f: any, { isProxy, proxyBalance, fee }: TransferAccountStore) => {
        if (!isProxy) return true;

        return balanceValidation.isLteThanBalance(fee, proxyBalance.native);
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
    notEnoughTokens: (source: Store<TransferSignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: t('proxy.addProxy.notEnoughMultisigTokens'),
      source,
      validator: (_s: any, _f: any, { fee, isMultisig, multisigDeposit, balance }: TransferSignatoryFeeStore) => {
        if (!isMultisig) return true;

        const value = new BN(multisigDeposit).add(new BN(fee));

        return balanceValidation.isLteThanBalance(value, balance);
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

    notEnoughBalance: (
      source: Store<{ network: NetworkStore | null; balance: ValidatorBalanceMap }>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'notEnoughBalance',
      errorText: t('transfer.notEnoughBalanceError'),
      source,
      validator: (
        amount: string,
        _: any,
        { network, balance }: { network: NetworkStore | null; balance: ValidatorBalanceMap },
      ) => {
        if (!network) return false;

        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;

        return balanceValidation.isLteThanBalance(value, balance.balance);
      },
    }),
    insufficientBalanceForFee: (
      source: Store<DelegateFeeStore>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'insufficientBalanceForFee',
      errorText: t('transfer.notEnoughBalanceForFeeError'),
      source,
      validator: (amount: string, _: any, { network, balance, fee, isMultisig }: DelegateFeeStore) => {
        if (!network) return false;

        return balanceValidation.insufficientBalanceForFee(
          {
            amount,
            asset: network.asset,
            balance: balance.native,
            fee: new BN(fee),
            originFee: BN_ZERO,
            destinationFee: BN_ZERO,
            isNative: true,
            isProxy: false,
            isMultisig: isMultisig,
            isXcm: false,
          },
          config,
        );
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
