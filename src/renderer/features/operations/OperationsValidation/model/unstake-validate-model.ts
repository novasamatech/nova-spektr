import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { type Store, attach, createEffect, createStore } from 'effector';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { ZERO_BALANCE, assert, getAssetById, getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { type StakingMap, stakingResource } from '@/entities/staking';
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
  stakingData: StakingMap;
  signerOptions?: Partial<SignerOptions>;
};

// Staking data store
const $stakingData = createStore<StakingMap>({}).on(stakingResource.push, (_, { result }) => result ?? {});

const rootValidateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, stakingData, signerOptions }: ValidateParams) => {
    const accountId = transaction.accountId;
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

    // Get staked amount from staking data
    const stakedAmountValue = stakingData[accountId]?.active || ZERO_BALANCE;

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
          unstakeBalanceRange: [stakedAmountValue],
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
    stakingData: $stakingData,
  },
  mapParams({ id, transaction, feeMap }: ValidationStartedParams, { chains, balances, apis, stakingData }) {
    const chain = chains[transaction.chainId];
    assert(chain, 'Chain not found');
    const api = apis[transaction.chainId];
    assert(api, 'API not found');
    const asset = getAssetById(transaction.args.asset, chain.assets) ?? getNativeAsset(chain.assets);

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      stakingData,
      feeMap,
    };
  },
  effect: rootValidateFx,
});

export const unstakeValidateModel = {
  validate: validateFx,
};
