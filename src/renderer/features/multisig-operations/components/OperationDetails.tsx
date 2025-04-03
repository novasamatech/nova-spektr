import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, Separator } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyDecodedTransaction, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { useDecodedTransaction } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
  titled?: boolean;
};

export const operationDetailsSlot = createSlot<{
  transaction: AnyDecodedTransaction;
  multisigAccountId: AccountId;
  chainId: ChainId;
}>();

export const OperationDetails = memo(({ transaction, titled, chainId }: Props) => {
  const apis = useUnit(networkModel.$apis);
  const api = apis[chainId];
  const selectedAccounts = useUnit(walletSelect.$selectedAccounts);
  const account = selectedAccounts.find(accountUtils.isMultisigAccount);

  const decodedTransaction = useDecodedTransaction(transaction, chainId);

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

  const firstTransaction = allDecodedTransactions.at(0);

  if (allDecodedTransactions.length === 0) {
    return null;
  }

  if (!titled && firstTransaction && allDecodedTransactions.length === 1) {
    return (
      <div className="flex w-full flex-col gap-y-1">
        <Slot
          id={operationDetailsSlot}
          props={{
            transaction: firstTransaction,
            multisigAccountId: account.accountId,
            chainId,
          }}
        />
      </div>
    );
  }

  return (
    <>
      {allDecodedTransactions.map((transaction, index) => {
        return (
          <Box gap={1} key={index}>
            <BodyText>
              {transaction.section}: {transaction.method}
            </BodyText>
            <Box gap={1} padding={[0, 0, 0, 2]}>
              <Slot
                id={operationDetailsSlot}
                props={{
                  transaction,
                  multisigAccountId: account.accountId,
                  chainId,
                }}
              />
            </Box>
            <Separator />
          </Box>
        );
      })}
    </>
  );
});
