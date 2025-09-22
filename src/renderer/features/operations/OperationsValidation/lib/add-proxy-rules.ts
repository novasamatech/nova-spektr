import { BN } from '@polkadot/util';
import { type Store } from 'effector';
import { t } from 'i18next';

import { proxyService } from '@/shared/api/proxy';
import { type Chain } from '@/shared/core';
import { getNativeAsset, nullable, transferableAmountBN, withdrawableAmountBN } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createTxValidator } from '@/shared/transactions';
import { accountService, balanceService } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { type AccountStore, type ChainProxyStore, type SignatoryStore } from '../types/types';

import { descriptionValidation } from './validation';

export const AddProxyRules = {
  chain: {
    maxProxies: (source: Store<ChainProxyStore>) => ({
      name: 'maxProxies',
      errorText: t('proxy.addProxy.maxProxiesError'),
      source,
      validator: (_v: any, _f: any, { maxProxies, proxies }: ChainProxyStore) => maxProxies > proxies.length,
    }),
  },

  account: {
    notEnoughTokens: (source: Store<AccountStore>) => ({
      name: 'notEnoughTokens',
      source,
      errorText: t('proxy.addProxy.balanceAlertTitle'),
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

export const addProxyValidator = createTxValidator<{ proxyNumber: number }>({
  additionalBalanceRules: [
    ({ route, getBalance, asset, api, proxyNumber }) => {
      const initiator = accountService.findInitiator(route);
      if (!initiator) return;

      const chainId = api.genesisHash.toHex();

      const balance = getBalance(initiator.accountId, chainId, asset.assetId);

      if (nullable(balance)) return;

      const deposit = proxyService.getProxyDeposit(api, '0', proxyNumber + 1);

      return {
        account: initiator,
        balance: balanceService.tryReserve(balance, new BN(deposit), 'legacy'),
        asset: asset,
        action: 'proxy deposit',
      };
    },
  ],
});
