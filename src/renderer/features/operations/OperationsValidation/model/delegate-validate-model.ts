import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, attach, createEffect, sample } from 'effector';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById, getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { lockPeriodsModel } from '@/features/governance/model/lockPeriods';
import { type BalanceMap as TransferBalanceMap, type NetworkStore } from '@/features/transfer';
import { DelegateRules } from '../lib/delegate-rules';
import { validationUtils } from '../lib/validation-utils';
import {
  type DelegateFeeStore,
  type FeeMap,
  type TransferAccountStore,
  type TransferSignatoryFeeStore,
  type ValidationStartedParams,
} from '../types/types';

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: BalanceMap;
  feeMap: FeeMap;
};

const rootValidateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, feeMap }: ValidateParams) => {
    const accountId = transaction.accountId;

    const fee =
      feeMap?.[chain.chainId]?.[transaction.type] || (await transactionService.getTransactionFee(transaction, api));

    const rules = [
      {
        value: transaction.accountId,
        form: {},
        ...DelegateRules.account.noProxyFee({} as Store<TransferAccountStore>),
        source: {
          fee,
          // TODO: Add support proxy
          isProxy: false,
          proxyBalance: { native: '0' },
        },
      },
      {
        value: undefined,
        form: {},
        ...DelegateRules.signatory.notEnoughTokens({} as Store<TransferSignatoryFeeStore>),
        source: {
          fee: new BN(fee),
          isMultisig: false,
          multisigDeposit: BN_ZERO,
          balance: '0',
        } as TransferSignatoryFeeStore,
      },
      {
        value: transaction.args.balance,
        form: {},
        ...DelegateRules.amount.notEnoughBalance(
          {} as Store<{ network: NetworkStore | null; balance: TransferBalanceMap }>,
          {
            withFormatAmount: false,
          },
        ),
        source: {
          network: { chain: chain, asset: asset },
          balance: {
            native: transferableAmount(
              balanceUtils.getBalance(balances, accountId, chain.chainId, getNativeAsset(chain.assets).assetId),
            ),
            balance: transferableAmount(balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId)),
          },
        } as { network: NetworkStore | null; balance: TransferBalanceMap },
      },
      {
        value: transaction.args.value,
        form: {},
        ...DelegateRules.amount.insufficientBalanceForFee({} as Store<DelegateFeeStore>, {
          withFormatAmount: false,
        }),
        source: {
          network: { chain, asset },
          fee,
          isMultisig: false,
          // TODO: Add support proxy
          balance: {
            native: transferableAmount(
              balanceUtils.getBalance(balances, accountId, chain.chainId, getNativeAsset(chain.assets).assetId),
            ),
          },
        } as DelegateFeeStore,
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
  async effect({ chains, balances, apis }, { id, transaction, feeMap }: ValidationStartedParams) {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    if (!chain || !api) {
      return { id, result: undefined };
    }
    const asset = getAssetById(transaction.args.asset, chain.assets) || getNativeAsset(chain.assets);

    return rootValidateFx({
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      feeMap,
    });
  },
});

sample({
  clock: rootValidateFx,
  target: lockPeriodsModel.events.requestLockPeriods,
});

export const delegateValidateModel = {
  validate: validateFx,
};
