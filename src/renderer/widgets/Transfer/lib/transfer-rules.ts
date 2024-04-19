import { Store } from 'effector';
import { BN } from '@polkadot/util';

import { formatAmount, validateAddress } from '@shared/lib/utils';
import { balanceValidation, descriptionValidation } from '@shared/lib/validation';
import { Account } from '@shared/core';
import { BalanceMap, NetworkStore } from './types';

export type AccountStore = { fee: string; isProxy: boolean; proxyBalance: BalanceMap };

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
    notEnoughTokens: (
      source: Store<{ fee: string; isMultisig: boolean; multisigDeposit: string; balance: string }>,
    ) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughMultisigTokens',
      source,
      validator: (
        _s: any,
        _f: any,
        {
          fee,
          isMultisig,
          multisigDeposit,
          balance,
        }: { fee: string; isMultisig: boolean; multisigDeposit: string; balance: string },
      ) => {
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
      source: Store<{
        fee: string;
        balance: BalanceMap;
        network: NetworkStore | null;
        isXcm: boolean;
        isNative: boolean;
        isMultisig: boolean;
        isProxy: boolean;
        xcmFee: string;
      }>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'insufficientBalanceForFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (
        amount: string,
        _: any,
        {
          network,
          isNative,
          isProxy,
          isMultisig,
          isXcm,
          balance,
          fee,
          xcmFee,
        }: {
          fee: string;
          balance: BalanceMap;
          network: NetworkStore | null;
          isXcm: boolean;
          isNative: boolean;
          isMultisig: boolean;
          isProxy: boolean;
          xcmFee: string;
        },
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

type Validation = {
  value: any;
  name: string;
  errorText: string;
  source: any;
  validator: (...args: any) => boolean;
};

export const applyValidationRule = ({
  value,
  source,
  name,
  errorText,
  validator,
}: Validation): { name: string; errorText: string } | undefined => {
  // TODO: find another way to get state from source
  // eslint-disable-next-line effector/no-getState
  const sourceData = source.getState ? source.getState() : source;

  const isValid = validator(value, undefined, sourceData);

  if (!isValid) {
    return { name, errorText };
  }
};

export const applyValidationRules = (validation: Validation[]): { name: string; errorText: string } | undefined => {
  for (const rule of validation) {
    const result = applyValidationRule(rule);

    if (result) {
      return result;
    }
  }
};
