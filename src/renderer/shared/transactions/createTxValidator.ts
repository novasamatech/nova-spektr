import { type Transaction } from '@/shared/core';
import { assert, nonNullable } from '@/shared/lib/utils';
import { type TransactionValidationBalanceError } from '@/shared/ui-entities';
import { type AnyTransaction, accountService, balanceService, transactionService } from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';

type CombinedParams = Parameters<typeof accountService.validateRouteBalances>[0] &
  Parameters<typeof accountService.validateCallPermission>[0];

type ValidatorParams<A> = Omit<CombinedParams, 'transaction'> &
  A & {
    // for backward compatability
    transaction: Transaction | AnyTransaction;
  };

export function createTxValidator<A>(params?: {
  additionalBalanceRules?: ((
    params: ValidatorParams<A>,
    balanceValidationResults: TransactionValidationBalanceError[],
  ) => TransactionValidationBalanceError[] | undefined)[];
}) {
  return async ({ transaction, ...rest }: ValidatorParams<A>) => {
    // TODO remove this mess
    let normalizedTransaction: AnyTransaction;
    if (transaction.type === 'encoded' || transaction.type === 'decoded') {
      normalizedTransaction = transaction;
    } else {
      const extrinsic = getExtrinsic[transaction.type](transaction.args, rest.api);
      normalizedTransaction = transactionService.createEncodedTransactionFromExtrinsic(extrinsic);
    }

    const fixedArgs = { ...rest, transaction: normalizedTransaction };

    const permissionErrors = accountService.validateCallPermission(fixedArgs);
    let balanceValidationResults = await accountService.validateRouteBalances(fixedArgs);

    const ruleArgs = { ...rest, transaction } as ValidatorParams<A>;

    if (params?.additionalBalanceRules) {
      for (const rule of params.additionalBalanceRules) {
        const res = rule(ruleArgs, balanceValidationResults);
        if (nonNullable(res)) {
          balanceValidationResults = res;
        }
      }
    }

    const signatory = accountService.findSignatory(rest.route);
    assert(signatory, 'Signatory not found');
    const fee = await transactionService.getTransactionFee(normalizedTransaction, rest.api);

    balanceValidationResults = accountService.mutateTransitionBalanceValidationResult(
      balanceValidationResults,
      rest.asset,
      signatory,
      (balance, account) => {
        return {
          asset: rest.asset,
          balance: balanceService.tryWithdraw(balance, fee, 'keepAlive'),
          account,
          required: fee,
          action: 'fee',
        };
      },
    );

    return [...permissionErrors, ...balanceValidationResults.filter((x) => x.balance.success === false)];
  };
}
