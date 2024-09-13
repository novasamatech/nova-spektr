import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { type Store, createEffect, createEvent, sample } from 'effector';

import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@shared/core';
import { stakedAmount, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';
import { UnstakeRules } from '../lib/unstake-rules';
import { validationUtils } from '../lib/validation-utils';
import {
  type AmountFeeStore,
  type UnstakeAmountBalanceRange,
  type ValidationResult,
  type ValidationStartedParams,
} from '../types/types';

const validationStarted = createEvent<ValidationStartedParams>();
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
        value: transaction.args.value,
        form: {
          shards: [{ accountId }],
        },
        ...UnstakeRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>, { withFormatAmount: false }),
        source: {
          isMultisig: false,
          network: { chain, asset },
          feeData: { fee },
          accountsBalances: [transferableAmount(shardBalance)],
        } as AmountFeeStore,
      },
      {
        value: transaction.args.value,
        form: {},
        ...UnstakeRules.amount.notEnoughBalance({} as Store<UnstakeAmountBalanceRange>, { withFormatAmount: false }),
        source: {
          network: { chain, asset },
          unstakeBalanceRange: [stakedAmount(shardBalance as Balance)],
        } as UnstakeAmountBalanceRange,
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

export const unstakeValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
