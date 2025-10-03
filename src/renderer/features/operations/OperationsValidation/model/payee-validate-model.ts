import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN_ZERO } from '@polkadot/util';
import { type Store, attach, createEffect } from 'effector';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById, reservableAmountBN } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { PayeeRules } from '../lib/payee-rules';
import { validationUtils } from '../lib/validation-utils';
import { type ShardsBondBalanceStore, type ValidationStartedParams } from '../types/types';

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: BalanceMap;
  signerOptions?: Partial<SignerOptions>;
};

const rootValidateFx = createEffect(async ({ id, chain, asset, transaction, balances }: ValidateParams) => {
  const accountId = transaction.accountId;
  const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

  const rules = [
    {
      value: [{ accountId }],
      form: {
        amount: transaction.args.amount,
      },
      ...PayeeRules.shards.noBondBalance({} as Store<ShardsBondBalanceStore>),
      source: {
        isProxy: false,
        network: { chain, asset },
        accountsBalances: [(shardBalance ? reservableAmountBN(shardBalance) : BN_ZERO).toString()],
      } as ShardsBondBalanceStore,
    },
  ];

  return { id, result: validationUtils.applyValidationRules(rules) };
});

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

export const payeeValidateModel = {
  validate: validateFx,
};
