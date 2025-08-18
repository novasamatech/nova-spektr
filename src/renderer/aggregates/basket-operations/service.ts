import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type Chain, type ChainId, type Transaction, TransactionType } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { findCoreBatchAll, isEditDelegationTransaction, transactionService } from '@/entities/transaction';

import { type BasketTransaction } from './types';

const getCoreTx = (tx: BasketTransaction): Transaction => {
  if (isEditDelegationTransaction(tx.coreTx)) {
    return tx.coreTx;
  }

  return tx.coreTx.type === TransactionType.BATCH_ALL ? findCoreBatchAll(tx.coreTx) : tx.coreTx;
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

  return { chainId, chain, account, fee: new BN(fee) };
}

export const basketOperationsService = {
  getCoreTx,
  getTransactionData,
};
