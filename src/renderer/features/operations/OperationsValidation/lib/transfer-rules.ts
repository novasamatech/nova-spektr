import { Store } from 'effector';
import { BN } from '@polkadot/util';

import { formatAmount, validateAddress } from '@shared/lib/utils';
import { balanceValidation, descriptionValidation } from '@shared/lib/validation';
import { Account } from '@shared/core';
import { BalanceMap, NetworkStore } from '../../../../widgets/Transfer/lib/types';

export type AccountStore = { fee: string; isProxy: boolean; proxyBalance: BalanceMap };
export type SignatoryFeeStore = { fee: string; isMultisig: boolean; multisigDeposit: string; balance: string };
export type AmountFeeStore = {
  fee: string;
  balance: BalanceMap;
  network: NetworkStore | null;
  isXcm: boolean;
  isNative: boolean;
  isMultisig: boolean;
  isProxy: boolean;
  xcmFee: string;
};

export const TransferRules = {
  account: {
    noProxyFee: (source: Store<AccountStore>) => ({
      name: 'noProxyFee',
      errorText: 'transfer.noSignatoryError',
      source,
      validator: (_a: Account, _f: any, { isProxy, proxyBalance, fee }: AccountStore) => {
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
      validator: (signatory: Account, _: any, isMultisig: boolean) => {
        if (!isMultisig) return true;

        return Object.keys(signatory).length > 0;
      },
    }),
    notEnoughTokens: (source: Store<SignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughMultisigTokens',
      source,
      validator: (_s: any, _f: any, { fee, isMultisig, multisigDeposit, balance }: SignatoryFeeStore) => {
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
      source: Store<AmountFeeStore>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'insufficientBalanceForFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, isNative, isProxy, isMultisig, isXcm, balance, fee, xcmFee }: AmountFeeStore,
      ) => {
        if (!network) return false;

        return balanceValidation.insufficientBalanceForFee(
          {
            amount,
            asset: network.asset,
            balance: balance.balance,
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
  },
  description: {
    maxLength: {
      name: 'maxLength',
      errorText: 'transfer.descriptionLengthError',
      validator: descriptionValidation.isMaxLength,
    },
  },
};
