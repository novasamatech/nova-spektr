import { Store } from 'effector';
import { BN } from '@polkadot/util';

import { descriptionValidation } from '@shared/lib/validation';
import { Balance, Chain } from '@shared/core';
import { transferableAmount } from '@shared/lib/utils';
import { balanceUtils } from '@entities/balance';

type SignatoryStore = {
  fee: string;
  proxyDeposit: string;
  multisigDeposit: string;
  balances: Balance[];
  isMultisig: boolean;
};

export type AccountStore = {
  fee: string;
  proxyDeposit: string;
  balances: Balance[];
  isMultisig: boolean;
};

export const RemovePureProxiedRules = {
  account: {
    notEnoughTokens: (source: Store<AccountStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughTokens',
      source,
      validator: (value: any, form: { chain: Chain }, { isMultisig, balances, ...params }: AccountStore) => {
        const balance = balanceUtils.getBalance(
          balances,
          value.accountId,
          form.chain.chainId,
          form.chain.assets[0].assetId.toString(),
        );

        return isMultisig
          ? new BN(params.proxyDeposit).lte(new BN(transferableAmount(balance)))
          : new BN(params.proxyDeposit).add(new BN(params.fee)).lte(new BN(transferableAmount(balance)));
      },
    }),
  },
  signatory: {
    notEnoughTokens: (source: Store<SignatoryStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughMultisigTokens',
      source,
      // todo: work with any
      validator: (value: any, form: { chain: Chain }, { isMultisig, balances, ...params }: SignatoryStore) => {
        if (!isMultisig) return true;

        const signatoryBalance = balanceUtils.getBalance(
          balances,
          value.accountId,
          form.chain.chainId,
          form.chain.assets[0].assetId.toString(),
        );

        return new BN(params.multisigDeposit).add(new BN(params.fee)).lte(new BN(transferableAmount(signatoryBalance)));
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
