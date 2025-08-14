import { BN } from '@polkadot/util';
import { type Store } from 'effector';

import { type Asset, type Chain } from '@/shared/core';
import { assert, formatAmount, toPrecision, validateAddress } from '@/shared/lib/utils';
import { createTxValidator } from '@/shared/transactions';
import { type AnyAccount, balanceService } from '@/domains/network';
import { accountService } from '@/domains/network';
import {
  type BalanceMap,
  type NetworkStore,
  type TransferAccountStore,
  type TransferAmountFeeStore,
  type TransferSignatoryFeeStore,
} from '../types/types';

import { balanceValidation } from './validation';

export const TransferRules = {
  account: {
    noProxyFee: (source: Store<TransferAccountStore>) => ({
      name: 'noProxyFee',
      errorText: 'transfer.notEnoughBalanceForFeeError',
      source,
      validator: (_a: AnyAccount | null, _f: any, { isProxy, proxyBalance, fee }: TransferAccountStore) => {
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
      validator: (signatory: AnyAccount | null, _: any, isMultisig: boolean) => {
        if (!isMultisig) return true;

        return signatory !== null && Object.keys(signatory).length > 0;
      },
    }),
    notEnoughTokens: (source: Store<TransferSignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'transfer.notEnoughBalanceForDepositError',
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
    incorrectRecipient: (source: Store<Chain | null>) => ({
      name: 'incorrectRecipient',
      errorText: 'transfer.incorrectRecipientError',
      source,
      // Second argument for validator is form data, but we need chain
      validator: (destination: string, _: any, chain: Chain) => {
        if (!chain) return false;

        return validateAddress(destination, chain);
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

    notEnoughBalance: (
      source: Store<{ network: NetworkStore | null; balance: BalanceMap | null }>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'notEnoughBalance',
      errorText: 'transfer.notEnoughBalanceError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, balance }: { network: NetworkStore | null; balance?: BalanceMap },
      ) => {
        if (!network) return false;

        if (!balance) return true;

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
        { network, isNative, isProxy, isMultisig, isXcm, balance, ...fee }: TransferAmountFeeStore,
      ) => {
        if (!network) return false;

        if (!balance) return true;

        return balanceValidation.insufficientBalanceForFee(
          {
            amount,
            asset: network.asset,
            balance: isXcm || !isNative ? balance.native : balance.balance,
            isNative,
            isProxy,
            isMultisig,
            isXcm,
            ...fee,
          },
          config,
        );
      },
    }),
    insufficientBalanceForDeliveryFee: (
      source: Store<TransferAmountFeeStore>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'insufficientBalanceForDeliveryFee',
      errorText: 'transfer.notEnoughBalanceForDeliveryFeeError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, isProxy, isMultisig, isNative, isXcm, balance, ...fee }: TransferAmountFeeStore,
      ) => {
        if (!network) return false;
        if (!isXcm || !isProxy || !isMultisig || !fee.deliveryFee || !balance) return true;

        return balanceValidation.insufficientBalanceForDeliveryFee(
          {
            amount,
            transferableAsset: network.asset,
            transferableBalance: balance.balance,
            nativeBalance: balance.native,
            isXcm,
            isNative,
            isProxy,
            isMultisig,
            ...fee,
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
      errorText: 'transfer.notEnoughBalanceForXcmFeeError',
      source,
      validator: (
        amount: string,
        _: any,
        { network, isProxy, isMultisig, isNative, isXcm, balance, ...fee }: TransferAmountFeeStore,
      ) => {
        if (!network) return false;

        if (!balance) return true;

        return balanceValidation.insufficientBalanceForXcmFee(
          {
            amount,
            transferableAsset: network.asset,
            transferableBalance: balance.balance,
            nativeBalance: balance.native,
            isXcm,
            isNative,
            isProxy,
            isMultisig,
            ...fee,
          },
          config,
        );
      },
    }),
  },
};

export const transferValidator = createTxValidator<{
  amount: string;
  sourceChain: Chain;
  destinationChain: Chain;
  destinationAsset: Asset;
  xcmFee: string;
  deliveryFee: string;
}>({
  additionalBalanceRules: [
    // amount
    ({ route, amount, asset, ed, destinationAsset }, balanceValidationResults) => {
      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      const desiredAmount = toPrecision(amount, destinationAsset.precision);

      if (asset === destinationAsset) {
        return accountService.mutateTransitionBalanceValidationResult(
          balanceValidationResults,
          asset,
          initiator,
          (balance, account) => ({
            account,
            balance: balanceService.tryWithdraw(balance, desiredAmount, ed, 'keepAlive'),
            asset,
            action: 'amount',
          }),
        );
      }
    },
    // delivery fee
    // ({ route, deliveryFee, asset, destinationAsset }, balanceValidationResults) => {
    //   // it should be xcm transfer
    //   if (asset === destinationAsset) {
    //     return;
    //   }
    //
    //   const initiator = accountService.findInitiator(route);
    //   assert(initiator, 'Initiator not found');
    //
    //   const desiredDeliveryFee = toPrecision(deliveryFee, destinationAsset.precision);
    //
    //   return accountService.mutateTransitionBalanceValidationResult(
    //     balanceValidationResults,
    //     destinationAsset,
    //     initiator,
    //     (balance, account) => ({
    //       account,
    //       balance: balanceService.tryWithdraw(balance, desiredDeliveryFee, BN_ZERO, 'keepAlive'),
    //       asset: destinationAsset,
    //       action: 'delivery fee',
    //     }),
    //   );
    // },
  ],
});
