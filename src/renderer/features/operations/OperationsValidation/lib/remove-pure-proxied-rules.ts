import { BN } from '@polkadot/util';
import { type Store } from 'effector';

import { type AccountId, type Chain } from '@shared/core';
import { transferableAmount } from '@shared/lib/utils';
import { balanceUtils } from '@entities/balance';
import { type SignatoryStore } from '../types/types';

import { descriptionValidation } from './validation';

export const RemovePureProxiedRules = {
  account: {
    notEnoughTokens: (source: Store<SignatoryStore>) => ({
      name: 'notEnoughTokens',
      errorText: 'proxy.addProxy.notEnoughTokens',
      source,
      validator: (value: any, form: { chain: Chain }, { balances, ...params }: SignatoryStore) => {
        const balance = balanceUtils.getBalance(
          balances,
          value.accountId,
          form.chain.chainId,
          form.chain.assets[0].assetId.toString(),
        );

        return new BN(params.multisigDeposit).add(new BN(params.fee)).lte(new BN(transferableAmount(balance)));
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
