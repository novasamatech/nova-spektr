import { Store } from 'effector';
import { BN } from '@polkadot/util';

import { descriptionValidation } from './validation';
import { AccountId, Chain } from '@shared/core';
import { transferableAmount } from '@shared/lib/utils';
import { balanceUtils } from '@entities/balance';
import { AccountStore, SignatoryStore } from '../types/types';

export const RemoveProxyRules = {
  account: {
    notEnoughTokens: (source: Store<AccountStore>) => ({
      name: 'notEnoughTokens',
      source,
      errorText: 'proxy.addProxy.balanceAlertTitle',
      validator: (value: any, form: { chain: Chain }, { isMultisig, balances, ...params }: AccountStore) => {
        const balance = balanceUtils.getBalance(
          balances,
          value.accountId,
          form.chain.chainId,
          form.chain.assets[0].assetId.toString(),
        );

        console.log('xcm', balances, value.accountId, balance, params);

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
      validator: (
        value: { accountId: AccountId },
        form: { chain: Chain },
        { isMultisig, balances, ...params }: SignatoryStore,
      ) => {
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
