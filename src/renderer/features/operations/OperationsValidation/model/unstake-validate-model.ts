import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { type Store, attach, createEffect } from 'effector';

import { type Asset, type Balance, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetByOnChainId, stakedAmount, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { UnstakeRules } from '../lib/unstake-rules';
import { validationUtils } from '../lib/validation-utils';
import { type AmountFeeStore, type UnstakeAmountBalanceRange, type ValidationStartedParams } from '../types/types';

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

const validateFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balanceMap,
  },
  mapParams({ id, transaction, feeMap }: ValidationStartedParams, { chains, balances, apis }) {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = getAssetByOnChainId(transaction.args.asset, chain.assets) || chain.assets[0];

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

export const unstakeValidateModel = {
  validate: validateFx,
};
