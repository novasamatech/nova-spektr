import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN_ZERO } from '@polkadot/util';
import { type Store, attach, createEffect } from 'effector';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById, reservableAmountBN, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { BondExtraRules } from '../lib/bond-extra-rules';
import { validationUtils } from '../lib/validation-utils';
import { type AmountFeeStore, type BondAmountBalanceStore, type ValidationStartedParams } from '../types/types';

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
  async ({ id, api, chain, asset, transaction, balances, signerOptions }: ValidateParams) => {
    const accountId = transaction.accountId;
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

    const rules = [
      {
        value: transaction.args.maxAdditional,
        form: {},
        ...BondExtraRules.amount.notEnoughBalance({} as Store<BondAmountBalanceStore>, { withFormatAmount: false }),
        source: {
          network: { chain, asset },
          bondBalanceRange: [(shardBalance ? reservableAmountBN(shardBalance) : BN_ZERO).toString()],
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

export const bondExtraValidateModel = {
  validate: validateFx,
};
