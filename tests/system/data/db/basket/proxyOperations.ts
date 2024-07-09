import { IndexedDBData } from '../../../utils/interactWithDatabase';

export function createProxyOperations(initiatorWallet: number, address: string, chainId: string): IndexedDBData {
  const transactions = [
    {
      type: 'add_proxy',
      args: {
        delegate: '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
        proxyType: 'Any',
        delay: 0,
      },
      groupId: undefined,
      id: 1,
    },
    {
      type: 'create_pure_proxy',
      args: {
        proxyType: 'Any',
        delay: 0,
        index: 0,
      },
      groupId: undefined,
      id: 2,
    },
  ];

  const injectingData = transactions.map((tx) => ({
    initiatorWallet,
    coreTx: {
      chainId,
      address,
      type: tx.type,
      args: tx.args,
    },
    txWrappers: [],
    groupId: tx.groupId,
    id: tx.id,
  }));

  return {
    database: 'spektr',
    table: 'basketTransactions',
    injectingData,
  };
}
