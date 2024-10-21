import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { createEffect, createEvent, sample } from 'effector';

import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@/shared/core';
import { toAccountId, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { validationUtils } from '../lib/validation-utils';
import { type AmountFeeStore, type Validation, type ValidationStartedParams } from '../types/types';

const validationStarted = createEvent<ValidationStartedParams>();

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

    const rules: Validation<BN, { shards: unknown[] }>[] = [
      {
        name: 'insufficientBalanceForFee',
        errorText: 'transfer.notEnoughBalanceForFeeError',
        value: BN_ZERO,
        form: { shards: [{ accountId }] },
        source: {
          isMultisig: false,
          network: { chain, asset },
          feeData: { fee },
          accountsBalances: [transferableAmount(shardBalance)],
        },
        validator: (_v, form, { feeData, isMultisig, accountsBalances }: AmountFeeStore) => {
          if (isMultisig) return true;

          const feeBN = new BN(feeData.fee);

          return form.shards.every((_, index: number) => {
            return feeBN.lte(new BN(accountsBalances[index]));
          });
        },
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
  filter: ({ apis }, { transaction }) => transaction.chainId in apis,
  fn: ({ apis, chains, balances }, { id, transaction, signerOptions }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = votingService.getVotingAsset(chain);

    return {
      id,
      api,
      transaction,
      chain,
      asset: asset!,
      balances,
      signerOptions,
    };
  },
  target: validateFx,
});

export const collectiveVoteValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated: validateFx.doneData,
  },
};
