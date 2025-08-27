import { BN } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { type Chain } from '@/shared/core';
import { getNativeAsset, transferableAmountBN, withdrawableAmountBN } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createTxValidator } from '@/shared/transactions';
import { balanceUtils } from '@/entities/balance';
import { type AccountStore, type SignatoryStore } from '../types/types';

import { descriptionValidation } from './validation';

export const AddPureProxiedRules = {
  account: {
    notEnoughTokens: (source: Store<AccountStore>) => ({
      name: 'notEnoughTokens',
      source,
      errorText: t('proxy.addProxy.notEnoughTokens'),
      validator: (value: any, form: { chain: Chain }, { isMultisig, balances, ...params }: AccountStore) => {
        const balance = balanceUtils.getBalance(
          balances,
          value.accountId,
          form.chain.chainId,
          getNativeAsset(form.chain.assets).assetId,
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
      errorText: t('proxy.addProxy.notEnoughMultisigTokens'),
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
          getNativeAsset(form.chain.assets).assetId,
        );

        return new BN(params.multisigDeposit).add(new BN(params.fee)).lte(withdrawableAmountBN(signatoryBalance));
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

export const addPureProxiedValidator = createTxValidator();
