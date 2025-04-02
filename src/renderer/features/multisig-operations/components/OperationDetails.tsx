import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText } from '@/shared/ui';
import { type AnyDecodedTransaction, type MultisigOperation, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { useDecodedTransaction } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

type Props = {
  operation: MultisigOperation;
};

export const operationDetailsSlot = createSlot<{
  transaction: AnyDecodedTransaction;
  multisigAccountId: AccountId;
  chainId: ChainId;
}>();

export const OperationDetails = memo(({ operation }: Props) => {
  const apis = useUnit(networkModel.$apis);
  const api = apis[operation.chainId];
  const selectedAccounts = useUnit(walletSelect.$selectedAccounts);
  const account = selectedAccounts.find(accountUtils.isMultisigAccount);

  const decodedTransaction = useDecodedTransaction(operation.transaction, operation.chainId);

  const allDecodedTransactions = useMemo(() => {
    if (!decodedTransaction) return [];

    if (transactionService.isBatchTransaction(decodedTransaction)) {
      try {
        return decodedTransaction.args.calls.map(t => transactionService.decodeTransaction(t, api));
      } catch {
        return [decodedTransaction];
      }
    }

    return [decodedTransaction];
  }, [decodedTransaction, api]);

  if (nullable(account)) {
    return null;
  }

  return (
    <>
      {allDecodedTransactions.map((transaction, index) => {
        return (
          <div className="flex w-full flex-col gap-y-1" key={index}>
            {allDecodedTransactions.length > 1 ? (
              <BodyText>
                {transaction.section}: {transaction.method}
              </BodyText>
            ) : null}
            <Slot
              id={operationDetailsSlot}
              props={{
                transaction,
                multisigAccountId: account.accountId,
                chainId: operation.chainId,
              }}
            />
          </div>
        );
      })}
    </>
  );
});
