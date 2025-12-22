import { BN } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { getHumanReadableXcmError } from '@/shared/api/xcm/service/xcm-error-utils';
import { type Asset, type Chain } from '@/shared/core';
import { assert, formatAmount, validateAddress } from '@/shared/lib/utils';
import { createTxValidator } from '@/shared/transactions';
import { type AnyAccount, type BalancePreservation, balanceService } from '@/domains/network';
import { accountService } from '@/domains/network';
import {
  type NetworkStore,
  type TransferAccountStore,
  type TransferAmountFeeStore,
  type TransferSignatoryFeeStore,
  type ValidatorBalanceMap,
} from '../types/types';

import { balanceValidation } from './validation';

export const TransferRules = {
  account: {
    noProxyFee: (source: Store<TransferAccountStore>) => ({
      name: 'noProxyFee',
      errorText: t('transfer.notEnoughBalanceForFeeError'),
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
      errorText: t('transfer.noSignatoryError'),
      source,
      validator: (signatory: AnyAccount | null, _: any, isMultisig: boolean) => {
        if (!isMultisig) return true;

        return signatory !== null && Object.keys(signatory).length > 0;
      },
    }),
    notEnoughTokens: (source: Store<TransferSignatoryFeeStore>) => ({
      name: 'notEnoughTokens',
      errorText: t('transfer.notEnoughBalanceForDepositError'),
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
      errorText: t('transfer.requiredDestinationError'),
      validator: Boolean,
    },
    incorrectRecipient: (source: Store<Chain | null>) => ({
      name: 'incorrectRecipient',
      errorText: t('transfer.incorrectRecipientError'),
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
      errorText: t('transfer.requiredAmountError'),
      validator: Boolean,
    },

    notZero: {
      name: 'notZero',
      errorText: t('transfer.notZeroAmountError'),
      validator: balanceValidation.isNonZeroBalance,
    },

    notEnoughBalance: (
      source: Store<{ network: NetworkStore | null; balance: ValidatorBalanceMap | null }>,
      config: { withFormatAmount: boolean } = { withFormatAmount: true },
    ) => ({
      name: 'notEnoughBalance',
      errorText: t('transfer.notEnoughBalanceError'),
      source,
      validator: (
        amount: string,
        _: any,
        { network, balance }: { network: NetworkStore | null; balance?: ValidatorBalanceMap },
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
      errorText: t('transfer.notEnoughBalanceForFeeError'),
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
      errorText: t('transfer.notEnoughBalanceForDeliveryFeeError'),
      source,
      validator: (
        amount: string,
        _: any,
        { network, isProxy, isMultisig, isNative, isXcm, balance, ...fee }: TransferAmountFeeStore,
      ) => {
        if (!network) return false;
        if (!isXcm || !isProxy || !isMultisig || !fee.destinationFee || !balance) return true;

        return balanceValidation.insufficientBalanceForDeliveryFee(
          {
            amount,
            transferableAsset: network.asset,
            transferableBalance: balance.balance,
            nativeBalance: balance.native,
            isXcm,
            isNative,
            isProxy,
            isMultisig: isMultisig,
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
      errorText: t('transfer.notEnoughBalanceForXcmFeeError'),
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

export type DryRunResult = {
  success: boolean | null;
  failureReason?: string;
  failureChain?: string;
};

export const transferValidator = createTxValidator<{
  amount: BN;
  sourceChain: Chain;
  sourceAsset: Asset;
  destinationChain: Chain;
  originFee: BN;
  destinationFee: BN;
  balancePreservation: BalancePreservation;
  dryRunResult?: DryRunResult;
}>({
  // ATTENTION - this order is important, this is how it's calculated on chain
  additionalBalanceRules: [
    // origin fee (submission fee + delivery fee)
    // withdraws from initiator in native asset with keepAlive
    ({ route, originFee, destinationChain, sourceChain, asset, getBalance }) => {
      // works only in case of xcm transfer
      if (destinationChain.chainId === sourceChain.chainId) return;
      if (originFee.isZero()) return;

      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      const balance = getBalance(initiator.accountId, sourceChain.chainId, asset.assetId);
      assert(balance, `Balance for account ${initiator.accountId} not found`);

      return {
        account: initiator,
        balance: balanceService.tryWithdraw(balance, originFee, 'keepAlive'),
        asset: asset,
        action: 'origin fee',
      };
    },
    // amount
    // withdraws from initiator in source asset
    ({ route, amount, sourceChain, sourceAsset, destinationChain, getBalance, balancePreservation }) => {
      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      if (amount.isZero()) return;

      const balance = getBalance(initiator.accountId, sourceChain.chainId, sourceAsset.assetId);
      assert(balance, `Balance for account ${initiator.accountId} not found`);
      const isXcm = destinationChain.chainId !== sourceChain.chainId;
      const preservation = isXcm ? 'keepAlive' : balancePreservation;

      return {
        account: initiator,
        balance: balanceService.tryWithdraw(balance, amount, preservation),
        asset: sourceAsset,
        action: 'sending amount',
      };
    },
    // destination fee
    // withdraws from initiator in source asset (for XCM only)
    ({ route, destinationFee, destinationChain, sourceChain, sourceAsset, getBalance }) => {
      if (destinationChain.chainId === sourceChain.chainId) return;
      if (destinationFee.isZero()) return;

      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      const balance = getBalance(initiator.accountId, sourceChain.chainId, sourceAsset.assetId);
      assert(balance, `Balance for account ${initiator.accountId} not found`);

      return {
        account: initiator,
        balance: balanceService.tryWithdraw(balance, destinationFee, 'keepAlive'),
        asset: sourceAsset,
        action: 'destination fee',
      };
    },
  ],
  dryRunRules: [
    ({ dryRunResult }) => {
      if (!dryRunResult || dryRunResult.success !== false) {
        return undefined;
      }

      const errorMessage = dryRunResult.failureReason
        ? getHumanReadableXcmError(dryRunResult.failureReason, dryRunResult.failureChain)
        : t('transfer.dryRunError.title');

      return {
        message: errorMessage,
      };
    },
  ],
});
