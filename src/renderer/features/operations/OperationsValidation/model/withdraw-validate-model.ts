import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { type Store, attach, createEffect, createEvent, restore, sample } from 'effector';
import { combineEvents } from 'patronum';

import { type Asset, type BalanceMap, type Chain, type ChainId, type ID, type Transaction } from '@/shared/core';
import { assert, getNativeAsset, redeemableAmount, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { type StakingMap, eraService, stakingService } from '@/entities/staking';
import { transactionService } from '@/entities/transaction';
import { validationUtils } from '../lib/validation-utils';
import { WithdrawRules } from '../lib/withdraw-rules';
import { type AmountFeeStore, type ValidationResult, type ValidationStartedParams } from '../types/types';

const validationStarted = createEvent<ValidationStartedParams>();
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
  accounts: AccountId[];
};
const fetchStakingFx = createEffect(({ chainId, api, accounts }: StakingParams) => {
  return stakingService.fetchStakingLedger(chainId, api, accounts);
});

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: BalanceMap;
  staking: StakingMap | null;
  era: number | null;
  signerOptions?: Partial<SignerOptions>;
};

const rootValidateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, staking, era, signerOptions }: ValidateParams) => {
    const accountId = transaction.accountId;
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

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
          accountsBalances: [redeemableAmount(staking?.[accountId]?.unlocking, era || 0)],
        } as AmountFeeStore,
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

sample({
  clock: combineEvents({
    events: { validation: validationStarted, staking: $staking.updates, era: getEraFx.doneData },
    reset: txValidated,
  }),
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balanceMap,
    staking: $staking,
  },
  filter: ({ apis, chains, staking }, { validation: { transaction }, era }) => {
    const chain = chains[transaction.chainId];

    return Boolean(apis[transaction.chainId]) && Boolean(era) && Boolean(staking) && Boolean(chain?.assets?.[0]);
  },
  fn: ({ apis, chains, balances, staking }, { validation: { id, transaction, signerOptions }, era }) => {
    const chain = chains[transaction.chainId];
    assert(chain, 'Chain not found');
    const api = apis[transaction.chainId];
    assert(api, 'API not found');
    const asset = getNativeAsset(chain.assets);

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      staking,
      era,
      signerOptions,
    };
  },
  target: rootValidateFx,
});

const validateFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balanceMap,
  },
  async effect({ chains, balances, apis }, { id, transaction }: ValidationStartedParams) {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    if (!chain || !api) {
      return { id, result: undefined };
    }

    const asset = getNativeAsset(chain.assets);
    const era = await getEraFx({ api });
    const staking = await fetchStakingFx({
      api,
      accounts: [transaction.accountId],
      chainId: transaction.chainId,
    });

    return rootValidateFx({
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      era,
      staking,
    });
  },
});

export const withdrawValidateModel = {
  validate: validateFx,
};
