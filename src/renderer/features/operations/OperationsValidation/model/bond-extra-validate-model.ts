import { Store, createEffect, createEvent, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { SignerOptions } from '@polkadot/api/submittable/types';

import { Asset, Balance, Chain, ID, Transaction } from '@shared/core';
import { stakeableAmount, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { AmountFeeStore, BondAmountBalanceStore, ValidationResult } from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';
import { BondExtraRules } from '../lib/bond-extra-rules';

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
        value: transaction.args.maxAdditional,
        form: {},
        ...BondExtraRules.amount.notEnoughBalance({} as Store<BondAmountBalanceStore>, { withFormatAmount: false }),
        source: {
          network: { chain, asset },
          bondBalanceRange: [stakeableAmount(shardBalance)],
        } as BondAmountBalanceStore,
      },
      {
        value: transaction.args.maxAdditional,
        form: {
          shards: [{ accountId }],
        },
        ...BondExtraRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>, { withFormatAmount: false }),
        source: {
          isMultisig: false,
          network: { chain, asset },
          accountsBalances: [transferableAmount(shardBalance)],
          feeData: {
            fee,
          },
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

export const bondExtraValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
