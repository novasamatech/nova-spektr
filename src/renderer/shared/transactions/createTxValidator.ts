import { type ApiPromise } from '@polkadot/api';
import { uniqBy } from 'lodash';

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
  excludeActions?: string[];
};

type RulesParams<A> = BaseParams<A> & {
  transaction: AnyTransaction;
  getBalance(accountId: AccountId, chainId: ChainId, assetId: AssetId): Balance | null;
};

type ValidatorRule<A> = (
  params: RulesParams<A>,
) => TransactionValidationBalanceError | Promise<TransactionValidationBalanceError> | undefined;

export type ValidationResult = {
  errors: (
    | TransactionValidationBalanceError
    | TransactionValidationPermissionError
    | TransactionValidationFatalError
  )[];
  balanceValidationResults: TransactionValidationBalanceError[];
  available: Balance[];
};

export type Validator<A> = (params: ValidatorParams<A>) => Promise<ValidationResult>;

export function createTxValidator<A>(params?: {
  DEBUG?: boolean;
  additionalBalanceRules?: ValidatorRule<A>[];
}): Validator<A> {
  const validator: Validator<A> = async ({
    transaction,
    balances,
    balanceValidationResults: previousBalanceValidationResults,
    excludeActions = [],
    ...rest
  }) => {
    const baseParams = rest as BaseParams<A>;

    const result: ValidationResult = {
      errors: [],
      balanceValidationResults: [],
      available: [],
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

      const acceptedAction = (result: TransactionValidationBalanceError) => {
        return !excludeActions.includes(result.action);
      };

      // Common data preparation

      const newTransactionInterface = convertTransaction(transaction, baseParams.api);
      const fixedArgs = { ...baseParams, getBalance, transaction: newTransactionInterface };
      const ruleArgs: RulesParams<A> = { ...baseParams, getBalance, transaction: newTransactionInterface };

      // Basic rules. Should be first because it's entry point validation for every operation

      for (const rule of basicRules) {
        const res = await rule(ruleArgs);
        if (nonNullable(res) && acceptedAction(res)) {
          result.balanceValidationResults.push(res);
        }
      }

      // External validations

      const transactionPermissionErrors = accountService.validateCallPermission(fixedArgs);
      const transactionBalanceValidation = await accountService.validateRouteBalances(fixedArgs);

      result.balanceValidationResults = result.balanceValidationResults.concat(
        transactionBalanceValidation.filter(acceptedAction),
      );

      // Additional local validations

      if (params?.additionalBalanceRules) {
        for (const rule of params.additionalBalanceRules) {
          const res = await rule(ruleArgs);
          if (nonNullable(res) && acceptedAction(res)) {
            result.balanceValidationResults.push(res);
          }
        }
      }

      result.errors = result.errors.concat(
        transactionPermissionErrors,
        result.balanceValidationResults.filter((x) => x.balance.success === false),
      );

      result.available = getAvailableBalances(result.balanceValidationResults);

      return result;
    } catch (error) {
      if (params?.DEBUG) {
        const message: TransactionValidationFatalError = {
          message: error instanceof Error ? error.message : nonNullable(error) ? error.toString() : 'Unknown error',
        };

        return {
          errors: [message],
          balanceValidationResults: [],
          available: [],
        };
      }

      return result;
    }
  };

  return validator;
}

const basicRules: ValidatorRule<unknown>[] = [
  async ({ route, transaction, api, asset, getBalance }) => {
    const chainId = api.genesisHash.toHex();

    const signatory = accountService.findSignatory(route);
    assert(signatory, 'Signatory not found');

    const fee = await transactionService.getTransactionFee(transaction, signatory.accountId, api);
    assert(fee, 'Fee not found');

    const balanceForFee = getBalance(signatory.accountId, chainId, asset.assetId);
    assert(balanceForFee, 'Balance for fee not found');

    return {
      asset,
      balance: balanceService.tryWithdraw(balanceForFee, fee, 'keepAlive'),
      account: signatory,
      action: 'fee',
    };
  },
];

function getAvailableBalances(results: TransactionValidationBalanceError[]) {
  return uniqBy([...results].reverse(), (result) => result.balance.balance.id).map((result) => result.balance.balance);
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
