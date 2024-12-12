import { BN } from '@polkadot/util';
import { type Store } from 'effector';

import { type Account } from '@/shared/core';
import { formatAmount, validateAddress } from '@/shared/lib/utils';
import {
  type BalanceMap,
  type NetworkStore,
  type TransferAccountStore,
  type TransferAmountFeeStore,
  type TransferSignatoryFeeStore,
} from '../types/types';

import { balanceValidation, descriptionValidation } from './validation';

export const TransferRules = {
  account: {
    noProxyFee: (source: Store<TransferAccountStore>) => ({
      name: 'noProxyFee',
      errorText: 'transfer.noSignatoryError',
      source,
      validator: (_a: Account, _f: any, { isProxy, proxyBalance, fee }: TransferAccountStore) => {
        if (!isProxy) return true;

        return balanceValidation.isLteThanBalance(fee, proxyBalance.native);
      },
    }),
  },
  signatory: {
    noSignatorySelected: (source: Store<boolean>) => ({
      name: 'noSignatorySelected',
      errorText: 'transfer.noSignatoryError',
      source,
      validator: (signatory: Account | null, _: any, isMultisig: boolean) => {
        if (!signatory || !isMultisig) return true;

        return Object.keys(signatory).length > 0;
      },
    }),
    notEnoughTokens: (source: Store<TransferSignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughMultisigTokens',
      source,
      validator: (_s: any, _f: any, { fee, isMultisig, multisigDeposit, balance }: TransferSignatoryFeeStore) => {
        if (!isMultisig) return true;

        const value = new BN(multisigDeposit).add(new BN(fee));

        return balanceValidation.isLteThanBalance(value, balance);
      },
    }),
  },
  destination: {
    required: {
      name: 'required',
      errorText: 'transfer.requiredRecipientError',
      validator: Boolean,
    },
    incorrectRecipient: {
      name: 'incorrectRecipient',
      errorText: 'transfer.incorrectRecipientError',
      validator: validateAddress,
    },
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

    notEnoughBalance: (
      source: Store<{ network: NetworkStore | null; balance: BalanceMap }>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'notEnoughBalance',
      errorText: 'transfer.notEnoughBalanceError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, balance }: { network: NetworkStore | null; balance: BalanceMap },
      ) => {
        if (!network) return false;

        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;

        return balanceValidation.isLteThanBalance(value, balance.balance);
      },
    }),
    insufficientBalanceForFee: (
      source: Store<TransferAmountFeeStore>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'insufficientBalanceForFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, isNative, isProxy, isMultisig, isXcm, balance, fee, xcmFee }: TransferAmountFeeStore,
      ) => {
        if (!network) return false;

        return balanceValidation.insufficientBalanceForFee(
          {
            amount,
            asset: network.asset,
            balance: isXcm ? balance.native : balance.balance,
            xcmFee,
            fee,
            isNative,
            isProxy,
            isMultisig,
            isXcm,
          },
          config,
        );
      },
    }),
    insufficientBalanceForXcmFee: (
      source: Store<TransferAmountFeeStore>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'insufficientBalanceForXcmFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, isProxy, isMultisig, isNative, isXcm, balance, fee, xcmFee }: TransferAmountFeeStore,
      ) => {
        if (!network) return false;

        return balanceValidation.insufficientBalanceForXcmFee(
          {
            amount,
            transferableAsset: network.asset,
            transferableBalance: balance.balance,
            nativeBalance: balance.native,
            xcmFee,
            fee,
            isXcm,
            isNative,
            isProxy,
            isMultisig,
          },
          config,
        );
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
