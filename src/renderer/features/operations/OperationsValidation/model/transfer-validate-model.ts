import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, attach, createEffect } from 'effector';

import { type Asset, type BalanceMap, type Chain, type ID, type Transaction } from '@/shared/core';
import { assert, getAssetById, getNativeAsset, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { type BalanceMap as TransferBalanceMap, type NetworkStore } from '@/widgets/Transfer';
import { TransferRules } from '../lib/transfer-rules';
import { validationUtils } from '../lib/validation-utils';
import {
  type FeeMap,
  type TransferAccountStore,
  type TransferAmountFeeStore,
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

// HINT: Proxy and Multisig cannot be added to basket
const rootValidateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, feeMap }: ValidateParams) => {
    const accountId = transaction.accountId;

    const fee =
      feeMap?.[chain.chainId]?.[transaction.type] || (await transactionService.getTransactionFee(transaction, api));

    const rules = [
      {
        value: accountId,
        form: {},
        ...TransferRules.account.noProxyFee({} as Store<TransferAccountStore>),
        source: {
          fee,
          isProxy: false,
          proxyBalance: { native: '0' },
        },
      },
      {
        value: undefined,
        form: {},
        ...TransferRules.signatory.notEnoughTokens({} as Store<TransferSignatoryFeeStore>),
        source: {
          fee: new BN(fee),
          isMultisig: false,
          multisigDeposit: BN_ZERO,
          balance: '0',
        } as TransferSignatoryFeeStore,
      },
      {
        value: transaction.args.value,
        form: {},
        ...TransferRules.amount.notEnoughBalance(
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
          isMultisig: false,
          multisigDeposit: '0',
          fee,
          originFee: transaction.args.xcmData?.args.originFee || '0',
          destinationFee: transaction.args.xcmData?.args.destinationFee || '0',
          isProxy: false,
          isNative: getNativeAsset(chain.assets).assetId === asset.assetId,
          isXcm: Boolean(transaction.args.xcmData),
          balance: {
            native: transferableAmount(
              balanceUtils.getBalance(balances, accountId, chain.chainId, getNativeAsset(chain.assets).assetId),
            ),
            balance: transferableAmount(balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId)),
          },
        },
      },
      {
        value: transaction.args.value,
        form: {},
        ...TransferRules.amount.insufficientBalanceForDeliveryFee({} as Store<TransferAmountFeeStore>, {
          withFormatAmount: false,
        }),
        source: {
          network: { chain, asset },
          isMultisig: false,
          isProxy: false,
          multisigDeposit: '0',
          fee: new BN(fee),
          originFee: new BN(transaction.args.xcmData?.args.originFee || '0'),
          destinationFee: new BN(transaction.args.xcmData?.args.destinationFee || '0'),
          isNative: getNativeAsset(chain.assets).assetId === asset.assetId,
          isXcm: Boolean(transaction.args.xcmData),
          balance: {
            native: transferableAmount(
              balanceUtils.getBalance(balances, accountId, chain.chainId, getNativeAsset(chain.assets).assetId),
            ),
            balance: transferableAmount(balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId)),
          },
        } as TransferAmountFeeStore,
      },
      {
        value: transaction.args.value,
        form: {},
        ...TransferRules.amount.insufficientBalanceForXcmFee({} as Store<TransferAmountFeeStore>, {
          withFormatAmount: false,
        }),
        source: {
          network: { chain, asset },
          isMultisig: false,
          multisigDeposit: BN_ZERO,
          fee: new BN(fee),
          originFee: new BN(transaction.args.xcmData?.args.originFee || '0'),
          destinationFee: new BN(transaction.args.xcmData?.args.destinationFee || '0'),
          isProxy: false,
          isNative: getNativeAsset(chain.assets).assetId === asset.assetId,
          isXcm: Boolean(transaction.args.xcmData),
          balance: {
            native: transferableAmount(
              balanceUtils.getBalance(balances, accountId, chain.chainId, getNativeAsset(chain.assets).assetId),
            ),
            balance: transferableAmount(balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId)),
          },
        } as TransferAmountFeeStore,
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
      feeMap,
    };
  },
  effect: rootValidateFx,
});

export const transferValidateModel = {
  validate: validateFx,
};
