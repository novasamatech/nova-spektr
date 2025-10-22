import { type ApiPromise } from '@polkadot/api';

import { type AssetId, type Balance, type BalanceId, type ChainId, type Transaction } from '@/shared/core';
import { assert, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type TransactionValidationBalanceError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';
import { type AnyTransaction, accountService, balanceService, transactionService } from '@/domains/network';
import { balanceUtils } from '@/entities/balance';
import { getExtrinsic } from '@/entities/transaction';

type CombinedParams = Parameters<typeof accountService.validateRouteBalances>[0] &
  Parameters<typeof accountService.validateCallPermission>[0];

type BaseParams<A> = Omit<CombinedParams, 'transaction' | 'getBalance'> & A;

type ValidatorParams<A> = BaseParams<A> & {
  balances: Record<BalanceId, Balance>;
  balanceValidationResults?: TransactionValidationBalanceError[];
  // for backward compatability
  transaction: Transaction | AnyTransaction;
};

type RulesParams<A> = BaseParams<A> & {
  transaction: AnyTransaction;
  getBalance(accountId: AccountId, chainId: ChainId, assetId: AssetId): Balance | null;
};

export type ValidationResult = {
  errors: (
    | TransactionValidationBalanceError
    | TransactionValidationPermissionError
    | TransactionValidationFatalError
  )[];
  balanceValidationResults: TransactionValidationBalanceError[];
};

export type Validator<A> = (params: ValidatorParams<A>) => Promise<ValidationResult>;

export function createTxValidator<A>(params?: {
  DEBUG?: boolean;
  additionalBalanceRules?: ((params: RulesParams<A>) => TransactionValidationBalanceError | undefined)[];
}): Validator<A> {
  const validator: Validator<A> = async ({
    transaction,
    balances,
    balanceValidationResults: previousBalanceValidationResults,
    ...rest
  }) => {
    const baseParams = rest as BaseParams<A>;

    const result: ValidationResult = {
      errors: [],
      balanceValidationResults: [],
    };

    try {
      const getBalance = (accountId: AccountId, chainId: ChainId, assetId: AssetId) => {
        const validationResult = result.balanceValidationResults.findLast((r) => {
          return (
            r.account.accountId === accountId &&
            r.balance.balance.chainId === chainId &&
            r.balance.balance.assetId === assetId
          );
        });

        if (validationResult) {
          return validationResult.balance.balance;
        }

        if (previousBalanceValidationResults) {
          const previousResult = previousBalanceValidationResults.findLast((r) => {
            return (
              r.account.accountId === accountId &&
              r.balance.balance.chainId === chainId &&
              r.balance.balance.assetId === assetId
            );
          });

          if (previousResult) {
            return previousResult.balance.balance;
          }
        }

        return balanceUtils.getBalance(balances, accountId, chainId, assetId);
      };

      // Common data preparation

      const chainId = baseParams.api.genesisHash.toHex();
      const newTransactionInterface = convertTransaction(transaction, baseParams.api);

      // Fee validation. Should be first because it's entry point validation for every operation

      const signatory = accountService.findSignatory(baseParams.route);
      assert(signatory, 'Signatory not found');

      const fee = await transactionService.getTransactionFee(
        newTransactionInterface,
        signatory.accountId,
        baseParams.api,
      );
      const balanceForFee = getBalance(signatory.accountId, chainId, baseParams.asset.assetId);
      assert(balanceForFee, 'Balance for fee not found');

      result.balanceValidationResults.push({
        asset: baseParams.asset,
        balance: balanceService.tryWithdraw(balanceForFee, fee, 'keepAlive'),
        account: signatory,
        action: 'fee',
      });

      // External validations

      const fixedArgs = { ...baseParams, getBalance, transaction: newTransactionInterface };

      const transactionPermissionErrors = accountService.validateCallPermission(fixedArgs);
      const transactionBalanceValidation = await accountService.validateRouteBalances(fixedArgs);

      result.balanceValidationResults = result.balanceValidationResults.concat(transactionBalanceValidation);

      // Additional local validations

      const ruleArgs: RulesParams<A> = { ...baseParams, getBalance, transaction: newTransactionInterface };

      if (params?.additionalBalanceRules) {
        for (const rule of params.additionalBalanceRules) {
          const res = rule(ruleArgs);
          if (nonNullable(res)) {
            result.balanceValidationResults.push(res);
          }
        }
      }

      result.errors = result.errors.concat(
        transactionPermissionErrors,
        result.balanceValidationResults.filter((x) => x.balance.success === false),
      );

      return result;
    } catch (error) {
      if (params?.DEBUG) {
        const message: TransactionValidationFatalError = {
          message: error instanceof Error ? error.message : nonNullable(error) ? error.toString() : 'Unknown error',
        };

        return {
          errors: [message],
          balanceValidationResults: [],
        };
      }

      return result;
    }
  };

  return validator;
}

function convertTransaction(transaction: Transaction | AnyTransaction, api: ApiPromise): AnyTransaction {
  if (transaction.type === 'encoded' || transaction.type === 'decoded') {
    return transaction;
  } else {
    // TODO remove this mess after migration to new tx system
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    return transactionService.createEncodedTransactionFromExtrinsic(extrinsic);
  }
}

export function getActionRequiredAmount(
  results: TransactionValidationBalanceError[],
  action: string,
  accountId: AccountId,
) {
  const foundActions = results.filter((r) => r.account.accountId === accountId && r.action === action);

  return foundActions.map((r) => ({
    required: r.balance.required,
    asset: r.asset,
    action: r.action,
    account: r.account,
  }));
}
