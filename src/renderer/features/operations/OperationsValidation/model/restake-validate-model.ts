import { Store, createEffect, createEvent, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Asset, Balance, Chain, ID, Transaction } from '@shared/core';
import { getAssetById, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';
import { AmountFeeStore, ValidationResult } from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { RestakeRules } from '../lib/restake-rules';
import { transactionService } from '@entities/transaction';

const validationStarted = createEvent<{ id: ID; transaction: Transaction }>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
};

const validateFx = createEffect(async ({ id, api, chain, asset, transaction, balances }: ValidateParams) => {
  const accountId = toAccountId(transaction.address);
  const fee = await transactionService.getTransactionFee(transaction, api);

  const shardBalance = balances.find(
    (balance) => balance.accountId === accountId && balance.assetId === asset.assetId.toString(),
  );

  const rules = [
    {
      value: transaction.args.value,
      form: {
        shards: [{ accountId }],
      },
      ...RestakeRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>, { withFormatAmount: false }),
      source: {
        isMultisig: false,
        network: { chain, asset },
        feeData: { fee },
        accountsBalances: [transferableAmount(shardBalance)],
      } as AmountFeeStore,
    },
  ];

  return { id, result: validationUtils.applyValidationRules(rules) };
});

sample({
  clock: validationStarted,
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis, chains, balances }, { id, transaction }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = getAssetById(transaction.args.assetId, chain.assets) || chain.assets[0];

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const restakeValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
