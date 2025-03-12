import { type ApiPromise } from '@polkadot/api';

import { type BasketTransaction, type Chain, type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { findCoreBatchAll, isEditDelegationTransaction, transactionService } from '@/entities/transaction';

const getCoreTx = (tx: BasketTransaction): Transaction => {
  if (isEditDelegationTransaction(tx.coreTx)) {
    return tx.coreTx;
  }

  if (tx.coreTx.type === TransactionType.BATCH_ALL) {
    const innerTx = findCoreBatchAll(tx.coreTx);
    // innerTx is Transaction, not OperationData
    if ('type' in innerTx) {
      return innerTx;
    }
  }

  return tx.coreTx;
};

async function getTransactionData(
  transaction: BasketTransaction,
  apis: Record<ChainId, ApiPromise>,
  chains: Record<ChainId, Chain>,
  accounts: AnyAccount[],
) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

  const chain = chains[chainId]!;
  const account = accounts.find(
    a => a.accountId === transaction.initiatorAccountId && a.accountId === transaction.coreTx.accountId,
  );

  return { chainId, chain, account, fee };
}

export const basketOperationsService = {
  getCoreTx,
  getTransactionData,
};
