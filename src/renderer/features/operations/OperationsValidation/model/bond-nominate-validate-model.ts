import { Store, createEffect, createEvent, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { SignerOptions } from '@polkadot/api/submittable/types';

import { Asset, Balance, Chain, ID, Transaction } from '@shared/core';
import { stakeableAmount, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { AmountFeeStore, ShardsBondBalanceStore, ValidationResult } from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { BondNominateRules } from '../lib/bond-nominate-rules';
import { transactionService } from '@entities/transaction';

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
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());

    const rules = [
      {
        value: [{ accountId }],
        form: {
          amount: transaction.args.value,
        },
        ...BondNominateRules.shards.noBondBalance({} as Store<ShardsBondBalanceStore>, { withFormatAmount: false }),
        source: {
          isProxy: false,
          network: { chain, asset },
          accountsBalances: [stakeableAmount(shardBalance)],
        } as ShardsBondBalanceStore,
      },
      {
        value: transaction.args.value,
        form: {
          shards: [{ accountId }],
        },
        ...BondNominateRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>, { withFormatAmount: false }),
        source: {
          isMultisig: false,
          network: { chain, asset },
          feeData: { fee },
          accountsBalances: [transferableAmount(shardBalance)],
        } as AmountFeeStore,
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

export const bondNominateValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
