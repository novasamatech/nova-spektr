import { type ApiPromise } from '@polkadot/api';

import { type AssetId, type Balance, type ChainId, type Transaction } from '@/shared/core';
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

type ValidatorParams<A> = Omit<CombinedParams, 'transaction'> &
  A & {
    // for backward compatability
    transaction: Transaction | AnyTransaction;
  };

type RulesParams<A> = Omit<ValidatorParams<A>, 'transaction'> & {
  transaction: AnyTransaction;
  getBalance(accountId: AccountId, chainId: ChainId, assetId: AssetId): Balance | null;
};

type Result = (
  | TransactionValidationBalanceError
  | TransactionValidationPermissionError
  | TransactionValidationFatalError
)[];

export function createTxValidator<A>(params?: {
  DEBUG?: boolean;
  additionalBalanceRules?: ((params: RulesParams<A>) => TransactionValidationBalanceError | undefined)[];
}) {
  return async ({ transaction, ...rest }: ValidatorParams<A>): Promise<Result> => {
    try {
      const chainId = rest.api.genesisHash.toHex();
      const normalizedTransaction = convertTransaction(transaction, rest.api);

      const fixedArgs = { ...rest, transaction: normalizedTransaction };

      // basic validations

      const permissionErrors = accountService.validateCallPermission(fixedArgs);
      const balanceValidationResults = await accountService.validateRouteBalances(fixedArgs);

      const getBalance = (accountId: AccountId, chainId: ChainId, assetId: AssetId) => {
        const validationResult = balanceValidationResults.findLast((r) => {
          return (
            r.account.accountId === accountId &&
            r.balance.balance.chainId === chainId &&
            r.balance.balance.assetId === assetId
          );
        });

        return validationResult?.balance.balance ?? balanceUtils.getBalance(rest.balances, accountId, chainId, assetId);
      };

      // fee validation

      const signatory = accountService.findSignatory(rest.route);
      assert(signatory, 'Signatory not found');

      const fee = await transactionService.getTransactionFee(normalizedTransaction, rest.api);
      const balanceForFee = getBalance(signatory.accountId, chainId, rest.asset.assetId);
      assert(balanceForFee, 'Balance for fee not found');

      balanceValidationResults.push({
        asset: rest.asset,
        balance: balanceService.tryWithdraw(balanceForFee, fee, 'keepAlive'),
        account: signatory,
        action: 'fee',
      });

      // additional validations

      const ruleArgs: RulesParams<A> = { ...rest, getBalance, transaction: normalizedTransaction };

      if (params?.additionalBalanceRules) {
        for (const rule of params.additionalBalanceRules) {
          const res = rule(ruleArgs);
          if (nonNullable(res)) {
            balanceValidationResults.push(res);
          }
        }
      }

      return [...permissionErrors, ...balanceValidationResults.filter((x) => x.balance.success === false)];
    } catch (error) {
      if (params?.DEBUG) {
        const message: TransactionValidationFatalError = {
          message: error instanceof Error ? error.message : nonNullable(error) ? error.toString() : 'Unknown error',
        };

        return [message];
      }

      return [];
    }
  };
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
