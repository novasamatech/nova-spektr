import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, createEffect, createEvent, sample } from 'effector';
import { combineEvents } from 'patronum';

import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@shared/core';
import { toAccountId, transferableAmount } from '@shared/lib/utils';
import { governanceService } from '@/entities/governance';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';
// TODO: fix it after DDD refactoring
import {
  type AmountFeeStore,
  type ValidationResult,
  type ValidationStartedParams,
  validationUtils,
} from '@/features/operations/OperationsValidation';
import { UnlockRules } from '../../lib/unlock-rules';

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

    const totalLock = await governanceService.getTrackLocks(api, [transaction.address]).then((data) => {
      const lock = data[transaction.address];
      const totalLock = Object.values(lock).reduce<BN>((acc, lock) => BN.max(lock, acc), BN_ZERO);

      return totalLock;
    });

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());

    const rules = [
      {
        value: transaction.args.value,
        form: {
          shards: [{ accountId }],
        },
        ...UnlockRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>),
        source: {
          isMultisig: false,
          network: { chain, asset },
          feeData: { fee },
          accountsBalances: [transferableAmount(shardBalance)],
        } as AmountFeeStore,
      },
      {
        value: transaction.args.value,
        form: {
          shards: [{ accountId }],
          amount: transaction.args.value,
        },
        ...UnlockRules.amount.noLockedAmount({} as Store<BN>),
        source: totalLock,
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

sample({
  clock: combineEvents({
    events: { validation: validationStarted },
    reset: txValidated,
  }),
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  filter: ({ apis }, { validation: { transaction } }) => {
    return Boolean(apis[transaction.chainId]);
  },
  fn: ({ apis, chains, balances }, { validation: { id, transaction, signerOptions } }) => {
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

export const unlockValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
