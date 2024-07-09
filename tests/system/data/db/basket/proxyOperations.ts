import { IndexedDBData } from '../../../utils/interactWithDatabase';
import { BasketTransaction, TransactionType } from '../../../../../src/renderer/shared/core';

export function createProxyOperations(initiatorWallet: number, address: string, chainId: string): IndexedDBData {
  const transactions: BasketTransaction[] = [
    {
      id: 1,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.ADD_PROXY,
        args: {
          delegate: '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
          proxyType: 'Any',
          delay: 0,
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
    {
      id: 2,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.CREATE_PURE_PROXY,
        args: {
          proxyType: 'Any',
          delay: 0,
          index: 0,
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
  ];

  const injectingData = transactions.map((tx) => ({
    initiatorWallet: tx.initiatorWallet,
    coreTx: tx.coreTx,
    txWrappers: tx.txWrappers,
    groupId: tx.groupId,
    id: tx.id,
  }));

  return {
    database: 'spektr',
    table: 'basketTransactions',
    injectingData,
  };
}
