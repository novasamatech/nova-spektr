import { Store, createEffect, createEvent, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Asset, Balance, Chain, ChainId, ID, Transaction, TransactionType } from '@shared/core';
import { TransferRules } from '@features/operations/OperationsValidation';
import { getAssetById, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { BalanceMap, NetworkStore } from '@widgets/Transfer/lib/types';
import {
  TransferAccountStore,
  TransferAmountFeeStore,
  TransferSignatoryFeeStore,
  ValidationResult,
} from '../types/types';
import { validationUtils } from '../lib/validation-utils';
import { networkModel } from '@entities/network';
import { transactionService } from '@entities/transaction';

type FeeMap = Record<ChainId, Record<TransactionType, string>>;

const validationStarted = createEvent<{ id: ID; transaction: Transaction; feeMap: FeeMap }>();
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
      ...TransferRules.account.noProxyFee({} as Store<TransferAccountStore>),
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
      ...TransferRules.signatory.notEnoughTokens({} as Store<TransferSignatoryFeeStore>),
      source: {
        fee,
        isMultisig: false,
        multisigDeposit: '0',
        balance: '0',
      } as TransferSignatoryFeeStore,
    },
    {
      value: transaction.args.value,
      form: {},
      ...TransferRules.amount.notEnoughBalance({} as Store<{ network: NetworkStore | null; balance: BalanceMap }>, {
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
      ...TransferRules.amount.insufficientBalanceForFee({} as Store<TransferAmountFeeStore>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain, asset },
        // TODO: ADd support multisig
        isMultisig: false,
        multisigDeposit: '0',
        fee,
        xcmFee: transaction.args.xcmData?.args.xcmFee || '0',
        // TODO: Add support proxy
        isProxy: false,
        isNative: chain.assets[0].assetId === asset.assetId,
        isXcm: Boolean(transaction.args.xcmData),
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, chain.assets[0].assetId.toFixed()),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toFixed()),
          ),
        },
      } as TransferAmountFeeStore,
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

export const transferValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
