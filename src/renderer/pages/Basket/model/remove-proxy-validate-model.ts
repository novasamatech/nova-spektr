import { Store, createEffect } from 'effector';

import { Balance, Transaction, TxWrapper } from '@shared/core';
import { AccountStore, TransferRules } from '@features/operations/OperationsValidation/lib/transfer-rules';
import { transferableAmount } from '@shared/lib/utils';
import { balanceUtils } from '@entities/balance';
import { BalanceMap, NetworkStore } from '@widgets/Transfer/lib/types';
import { applyValidationRules } from '@features/operations/OperationsValidation';

type ValidateParams = {
  transaction: Transaction;
  balances: Balance[];
  wrappers: TxWrapper[];
};

const validateFx = createEffect(({ transaction, wrappers, balances }: ValidateParams) => {
  const rules = [
    {
      value: store.account,
      ...TransferRules.account.noProxyFee({} as Store<AccountStore>),
      source: {
        fee: transaction.fee,
        isProxy: !!store.proxiedAccount,
        proxyBalance:
          transaction.proxiedAccount &&
          transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.proxiedAccount.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
      },
    },
    {
      value: undefined,
      ...TransferRules.signatory.notEnoughTokens(
        {} as Store<{ fee: string; isMultisig: boolean; multisigDeposit: string; balance: string }>,
      ),
      source: {
        fee: store.fee,
        isMultisig: !!store.signatory,
        multisigDeposit: store.multisigDeposit,
        balance:
          store.signatory &&
          transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.signatory.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
      } as { fee: string; isMultisig: boolean; multisigDeposit: string; balance: string },
    },
    {
      value: store.amount,
      ...TransferRules.amount.notEnoughBalance({} as Store<{ network: NetworkStore | null; balance: BalanceMap }>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: store.chain, asset: store.asset },
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.chain.assets[0].assetId.toFixed(),
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
        },
      } as { network: NetworkStore | null; balance: BalanceMap },
    },
    {
      value: store.amount,
      ...TransferRules.amount.insufficientBalanceForFee(
        {} as Store<{
          fee: string;
          balance: BalanceMap;
          network: NetworkStore | null;
          isXcm: boolean;
          isNative: boolean;
          isMultisig: boolean;
          isProxy: boolean;
          xcmFee: string;
        }>,
        {
          withFormatAmount: false,
        },
      ),
      source: {
        network: { chain: store.chain, asset: store.asset },
        isMultisig: !!store.signatory,
        multisigDeposit: store.multisigDeposit,
        fee: store.fee,
        xcmFee: store.xcmFee,
        isProxy: !!store.proxiedAccount,
        isNative: store.chain.assets[0].assetId === store.asset.assetId,
        isXcm: store.xcmChain.chainId !== store.chain.chainId,
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.chain.assets[0].assetId.toFixed(),
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
        },
      } as {
        fee: string;
        balance: BalanceMap;
        network: NetworkStore | null;
        isXcm: boolean;
        isNative: boolean;
        isMultisig: boolean;
        isProxy: boolean;
        xcmFee: string;
      },
    },
  ];

  const result = applyValidationRules(rules);

  if (!result) return;

  throw new Error(result.errorText);
});
