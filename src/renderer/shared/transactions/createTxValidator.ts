import { type AssetId, type Balance, type ChainId, type Transaction } from '@/shared/core';
import { assert, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type TransactionValidationBalanceError } from '@/shared/ui-entities';
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

export function createTxValidator<A>(params?: {
  additionalBalanceRules?: ((
    params: RulesParams<A>,
    balanceValidationResults: TransactionValidationBalanceError[],
  ) => TransactionValidationBalanceError[] | undefined)[];
}) {
  return async ({ transaction, ...rest }: ValidatorParams<A>) => {
    let normalizedTransaction: AnyTransaction;
    if (transaction.type === 'encoded' || transaction.type === 'decoded') {
      normalizedTransaction = transaction;
    } else {
      // TODO remove this mess after migration to new tx system
      const extrinsic = getExtrinsic[transaction.type](transaction.args, rest.api);
      normalizedTransaction = transactionService.createEncodedTransactionFromExtrinsic(extrinsic);
    }

    const fixedArgs = { ...rest, transaction: normalizedTransaction };

    const permissionErrors = accountService.validateCallPermission(fixedArgs);
    let balanceValidationResults = await accountService.validateRouteBalances(fixedArgs);

    const getBalance = (accountId: AccountId, chainId: ChainId, assetId: AssetId) => {
      const validationResult = balanceValidationResults.find((r) => {
        return (
          r.account.accountId === accountId &&
          r.balance.balance.chainId === chainId &&
          r.balance.balance.assetId === assetId
        );
      });

      return validationResult?.balance.balance ?? balanceUtils.getBalance(rest.balances, accountId, chainId, assetId);
    };

    const ruleArgs: RulesParams<A> = { ...rest, getBalance, transaction: normalizedTransaction };

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
