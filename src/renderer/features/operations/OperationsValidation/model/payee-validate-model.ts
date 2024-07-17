import { type Store, createEffect, createEvent, sample } from 'effector';
import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';

import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@shared/core';
import { stakeableAmount, toAccountId } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { type ShardsBondBalanceStore, type ValidationResult } from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { PayeeRules } from '../lib/payee-rules';

const validationStarted = createEvent<{ id: ID; transaction: Transaction; signerOptions?: Partial<SignerOptions> }>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
  signerOptions?: Partial<SignerOptions>;
};

const validateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, signerOptions }: ValidateParams) => {
    const accountId = toAccountId(transaction.address);
    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());

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
          accountsBalances: [stakeableAmount(shardBalance)],
        } as ShardsBondBalanceStore,
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

sample({
  clock: validationStarted,
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis, chains, balances }, { id, transaction, signerOptions }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = chain.assets[0];

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      signerOptions,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const payeeValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
