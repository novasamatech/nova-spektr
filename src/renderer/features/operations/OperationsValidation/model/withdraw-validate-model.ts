import { Store, createEffect, createEvent, restore, sample, scopeBind } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { combineEvents } from 'patronum';

import { Address, Asset, Balance, Chain, ChainId, ID, Transaction } from '@shared/core';
import { getAssetById, redeemableAmount, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';
import { networkModel } from '@entities/network';
import { WithdrawRules } from '../lib/withdraw-rules';
import { transactionService } from '@entities/transaction';
import { AmountFeeStore, ValidationResult } from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { StakingMap, eraService, useStakingData } from '@entities/staking';

const validationStarted = createEvent<{ id: ID; transaction: Transaction }>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();
const stakingSet = createEvent<StakingMap>();

const $staking = restore(stakingSet, null);

const getEraFx = createEffect(async ({ api }: { api: ApiPromise }): Promise<number | null> => {
  const era = await eraService.getActiveEra(api);

  return era || null;
});

type StakingParams = {
  chainId: ChainId;
  api: ApiPromise;
  addresses: Address[];
};
const subscribeStakingFx = createEffect(({ chainId, api, addresses }: StakingParams): Promise<() => void> => {
  const boundStakingSet = scopeBind(stakingSet, { safe: true });

  return useStakingData().subscribeStaking(chainId, api, addresses, boundStakingSet);
});

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
  staking: StakingMap | null;
  era: number | null;
};

const validateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, staking, era }: ValidateParams) => {
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
        ...WithdrawRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>),
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
        },
        ...WithdrawRules.amount.noRedeemBalance({} as Store<AmountFeeStore>),
        source: {
          accountsBalances: [redeemableAmount(staking?.[transaction.address]?.unlocking, era || 0)],
        } as AmountFeeStore,
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

sample({
  clock: validationStarted,
  source: {
    apis: networkModel.$apis,
  },
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis }, { transaction }) => {
    const api = apis[transaction.chainId];

    return {
      api,
      addresses: [transaction.address],
      chainId: transaction.chainId,
    };
  },
  target: [subscribeStakingFx, getEraFx],
});

sample({
  clock: combineEvents({
    events: { validation: validationStarted, staking: $staking.updates, era: getEraFx.doneData },
    reset: txValidated,
  }),
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
    staking: $staking,
  },
  filter: ({ apis, staking }, { validation: { transaction }, era }) => {
    return Boolean(apis[transaction.chainId]) && Boolean(era) && Boolean(staking);
  },
  fn: ({ apis, chains, balances, staking }, { validation: { id, transaction }, era }) => {
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
      staking,
      era,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const withdrawValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
