import { Store } from 'effector';
import { BN } from '@polkadot/util';

import { formatAmount } from '@shared/lib/utils';
import { balanceValidation, descriptionValidation } from '@shared/lib/validation';
import { Account } from '@shared/core';
import { NetworkStore } from '../../../../widgets/Transfer/lib/types';

export type ShardsProxyFeeStore = { feeData: { fee: string }; isProxy: boolean; proxyBalance: string };
export type ShardsBondBalanceStore = { isProxy: boolean; network: NetworkStore; accountsBalances: string[] };
export type AmountBalanceStore = { network: NetworkStore; bondBalanceRange: string | string[] };
export type Config = { withFormatAmount: boolean };
export type AmountFeeStore = {
  feeData: { fee: string };
  isMultisig: boolean;
  network: NetworkStore;
  accountsBalances: string[];
};
export type SignatoryFeeStore = {
  feeData: { fee: string; multisigDeposit: string };
  isMultisig: boolean;
  signatoryBalance: string;
};

export const NominateRules = {
  shards: {
    noProxyFee: (source: Store<ShardsProxyFeeStore>) => ({
      name: 'noProxyFee',
      source,
      validator: (_v: any, _f: any, { isProxy, proxyBalance, feeData }: ShardsProxyFeeStore) => {
        if (!isProxy) return true;

        return new BN(feeData.fee).lte(new BN(proxyBalance));
      },
    }),
    noBondBalance: (source: Store<ShardsBondBalanceStore>) => ({
      name: 'noBondBalance',
      errorText: 'staking.bond.noBondBalanceError',
      source,
      validator: (shards: any[], form: any, { isProxy, network, accountsBalances }: ShardsBondBalanceStore) => {
        if (isProxy || shards.length === 1) return true;

        const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

        return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));
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
  description: {
    maxLength: {
      name: 'maxLength',
      errorText: 'transfer.descriptionLengthError',
      validator: descriptionValidation.isMaxLength,
    },
  },
};
