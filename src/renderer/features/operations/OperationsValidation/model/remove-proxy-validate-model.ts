import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { type Store, attach, createEffect } from 'effector';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { RemoveProxyRules } from '../lib/remove-proxy-rules';
import { validationUtils } from '../lib/validation-utils';
import { type AccountStore, type ValidationStartedParams } from '../types/types';

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: BalanceMap;
  signerOptions?: Partial<SignerOptions>;
};

const rootValidateFx = createEffect(
  async ({ id, api, chain, transaction, balances, signerOptions }: ValidateParams) => {
    const accountId = transaction.accountId;
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const rules = [
      {
        value: { accountId },
        form: {
          chain,
        },
        ...RemoveProxyRules.account.notEnoughTokens({} as Store<AccountStore>),
        source: {
          fee,
          isMultisig: false,
          proxyDeposit: '0',
          balances,
        } as AccountStore,
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

const validateFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balanceMap,
  },
  mapParams({ id, transaction, feeMap }: ValidationStartedParams, { chains, balances, apis }) {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = getAssetById(transaction.args.asset, chain.assets) || chain.assets[0];

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      feeMap,
    };
  },
  effect: rootValidateFx,
});

export const removeProxyValidateModel = {
  validate: validateFx,
};
