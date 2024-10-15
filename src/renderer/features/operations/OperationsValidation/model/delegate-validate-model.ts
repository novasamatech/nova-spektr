import { type ApiPromise } from '@polkadot/api';
import { type Store, createEffect, createEvent, sample } from 'effector';

import { type Asset, type Balance, type Chain, type ID, type Transaction } from '@/shared/core';
import { getAssetById, toAccountId, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { type BalanceMap, type NetworkStore } from '@/widgets/Transfer';
import { DelegateRules } from '../lib/delegate-rules';
import { validationUtils } from '../lib/validation-utils';
import {
  type DelegateFeeStore,
  type FeeMap,
  type TransferAccountStore,
  type TransferSignatoryFeeStore,
  type ValidationResult,
  type ValidationStartedParams,
} from '../types/types';

const validationStarted = createEvent<ValidationStartedParams>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
  feeMap: FeeMap;
};

const validateFx = createEffect(async ({ id, api, chain, asset, transaction, balances, feeMap }: ValidateParams) => {
  const accountId = toAccountId(transaction.address);

  const fee =
    feeMap?.[chain.chainId]?.[transaction.type] || (await transactionService.getTransactionFee(transaction, api));

  const rules = [
    {
      value: transaction.address,
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
        fee,
        isMultisig: false,
        multisigDeposit: '0',
        balance: '0',
      } as TransferSignatoryFeeStore,
    },
    {
      value: transaction.args.balance,
      form: {},
      ...DelegateRules.amount.notEnoughBalance({} as Store<{ network: NetworkStore | null; balance: BalanceMap }>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: chain, asset: asset },
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, chain.assets[0].assetId.toFixed()),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toFixed()),
          ),
        },
      } as { network: NetworkStore | null; balance: BalanceMap },
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
            balanceUtils.getBalance(balances, accountId, chain.chainId, chain.assets[0].assetId.toFixed()),
          ),
        },
      } as DelegateFeeStore,
    },
  ];

  return { id, result: validationUtils.applyValidationRules(rules) };
});

sample({
  clock: validationStarted,
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis, chains, balances }, { id, transaction, feeMap }) => {
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
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const delegateValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
