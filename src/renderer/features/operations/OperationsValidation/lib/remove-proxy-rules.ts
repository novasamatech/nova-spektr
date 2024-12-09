import { BN } from '@polkadot/util';
import { type Store } from 'effector';

import { type AccountId, type Chain } from '@/shared/core';
import { transferableAmountBN, withdrawableAmountBN } from '@/shared/lib/utils';
import { balanceUtils } from '@/entities/balance';
import { type AccountStore, type SignatoryStore } from '../types/types';

import { descriptionValidation } from './validation';

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
        const proxyDeposit = new BN(params.proxyDeposit);
        const fee = new BN(params.fee);

        return isMultisig
          ? proxyDeposit.lte(withdrawableAmountBN(balance))
          : proxyDeposit.add(fee).lte(transferableAmountBN(balance));
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

        return new BN(params.multisigDeposit).add(new BN(params.fee)).lte(withdrawableAmountBN(signatoryBalance));
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
