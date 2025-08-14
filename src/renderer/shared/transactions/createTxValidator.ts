import { type Transaction } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type TransactionValidationBalanceError } from '@/shared/ui-entities';
import { accountService, balanceService, transactionService } from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';

type CombinedParams = Parameters<typeof accountService.validateRouteBalances>[0] &
  Parameters<typeof accountService.validateCallPermission>[0];

type ValidatorParams<A> = Omit<CombinedParams, 'transaction' | 'ed'> &
  A & {
    // for backward compatability
    transaction: Transaction;
  };

type RuleParams<A> = Omit<CombinedParams, 'transaction'> &
  A & {
    // for backward compatability
    transaction: Transaction;
  };

export function createTxValidator<A>(params?: {
  additionalBalanceRules?: ((
    params: RuleParams<A>,
    balanceValidationResults: TransactionValidationBalanceError[],
  ) => TransactionValidationBalanceError[] | undefined)[];
}) {
  return async ({ transaction, ...rest }: ValidatorParams<A>) => {
    const ed = await balanceService.getExistentialDeposit(rest.api, rest.asset);

    // TODO remove this mess
    const extrinsic = getExtrinsic[transaction.type](transaction.args, rest.api);
    const encodedTransaction = transactionService.createEncodedTransactionFromExtrinsic(extrinsic);
    const fixedArgs = { ...rest, transaction: encodedTransaction, ed };

    const permissionErrors = accountService.validateCallPermission(fixedArgs);
    let balanceValidationResults = await accountService.validateRouteBalances(fixedArgs);

    const ruleArgs = { ...rest, transaction, ed } as RuleParams<A>;

    if (params?.additionalBalanceRules) {
      for (const rule of params.additionalBalanceRules) {
        const res = rule(ruleArgs, balanceValidationResults);
        if (nonNullable(res)) {
          balanceValidationResults = res;
        }
      }
    }

    return [...permissionErrors, ...balanceValidationResults.filter((x) => x.balance.success === false)];
  };
}
