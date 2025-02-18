import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, attach, createEffect } from 'effector';

import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById, toAccountId, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { governanceService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
// TODO: fix it after DDD refactoring
import {
  type AmountFeeStore,
  type ValidationStartedParams,
  validationUtils,
} from '@/features/operations/OperationsValidation';
import { UnlockRules } from '../../lib/unlock-rules';

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
  signerOptions?: Partial<SignerOptions>;
};

const rootValidateFx = createEffect(
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

const validateFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
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

export const unlockValidateModel = {
  validate: validateFx,
};
