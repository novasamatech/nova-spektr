import { BN } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { type Chain, type VaultShardAccount, RewardsDestination } from '@/shared/core';
import { assert, formatAmount, validateAddress } from '@/shared/lib/utils';
import { createTxValidator } from '@/shared/transactions';
import { type AnyAccount, accountService, balanceService } from '@/domains/network';
import {
  type AmountFeeStore,
  type BondAmountBalanceStore,
  type Config,
  type ShardsBondBalanceStore,
  type ShardsProxyFeeStore,
  type SignatoryFeeStore,
} from '../types/types';

import { balanceValidation, descriptionValidation } from './validation';

export const BondNominateRules = {
  shards: {
    noProxyFee: (source: Store<ShardsProxyFeeStore>) => ({
      name: 'noProxyFee',
      source,
      validator: (_v: any, _f: any, { isProxy, proxyBalance, feeData }: ShardsProxyFeeStore) => {
        if (!isProxy) return true;

        return new BN(feeData.fee).lte(new BN(proxyBalance));
      },
    }),
    noBondBalance: (source: Store<ShardsBondBalanceStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'noBondBalance',
      errorText: t('staking.bond.noBondBalanceError'),
      source,
      validator: (
        shards: any[],
        form: { amount: string },
        { isProxy, network, accountsBalances }: ShardsBondBalanceStore,
      ) => {
        if (isProxy) return true;

        const value = config?.withFormatAmount ? formatAmount(form.amount, network.asset.precision) : form.amount;
        const amountBN = new BN(value);

        return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));
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
    notEnoughBalance: (source: Store<BondAmountBalanceStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'notEnoughBalance',
      errorText: t('staking.notEnoughBalanceError'),
      source,
      validator: (amount: string, _: any, { network, bondBalanceRange }: BondAmountBalanceStore) => {
        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;
        const amountBN = new BN(value);

        const bondBalance = Array.isArray(bondBalanceRange) ? bondBalanceRange[0] : bondBalanceRange;

        return amountBN.lte(new BN(bondBalance));
      },
    }),
    insufficientBalanceForFee: (source: Store<AmountFeeStore>, config: Config = { withFormatAmount: true }) => ({
      name: 'insufficientBalanceForFee',
      errorText: t('transfer.notEnoughBalanceForFeeError'),
      source,
      validator: (
        amount: string,
        form: { shards: VaultShardAccount[] },
        { network, feeData, isMultisig, accountsBalances }: AmountFeeStore,
      ) => {
        if (isMultisig) return true;

        const feeBN = new BN(feeData.fee);
        const value = config?.withFormatAmount ? formatAmount(amount, network.asset.precision) : amount;
        const amountBN = new BN(value);

        return form.shards.every((_: AnyAccount, index: number) => {
          return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
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

export const bondNominateValidator = createTxValidator<{ chain: Chain; amount: string }>({
  additionalBalanceRules: [
    ({ route, asset, chain, amount, getBalance }) => {
      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      const amountBN = new BN(formatAmount(amount, asset.precision));
      if (amountBN.isZero()) return;

      const balance = getBalance(initiator.accountId, chain.chainId, asset.assetId);
      assert(balance, `Balance for account ${initiator.accountId} not found`);

      return {
        account: initiator,
        balance: balanceService.tryReserve(balance, amountBN),
        asset: asset,
        action: 'amount',
      };
    },
  ],
});
