import { IndexedDBData } from '../../../utils/interactWithDatabase';
import { BasketTransaction, TransactionType } from '../../../../../src/renderer/shared/core';

export function createStakingOperations(initiatorWallet: number, address: string, chainId: string): IndexedDBData {
  const transactions: BasketTransaction[] = [
    {
      id: 1,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.BOND,
        args: { maxAdditional: '1000000000000' },
      },
      txWrappers: [],
      groupId: 1719389924115,
    },
    {
      id: 2,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [
            { type: TransactionType.CHILL, args: {} },
            { type: TransactionType.UNSTAKE, args: { value: '1000000000000' } },
          ],
        },
      },
      txWrappers: [],
      groupId: 1719389929374,
    },
    {
      id: 3,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.NOMINATE,
        args: {
          targets: [
            '5GYaYNVq6e855t5hVCyk4Wuqssaf6ADTrvdPZ3QXyHvFXTip',
            '5GTD7ZeD823BjpmZBCSzBQp7cvHR1Gunq7oDkurZr9zUev2n',
            '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
          ],
        },
      },
      txWrappers: [],
      groupId: 1719389935335,
    },
    {
      id: 4,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.DESTINATION,
        args: { payee: { Account: '5HmFdjr2veW7aLtc4NBcXjrKHw42t4YdpGNArAiHcGK2gMca' } },
      },
      txWrappers: [],
      groupId: 1719389942026,
    },
    {
      id: 5,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.DESTINATION,
        args: { payee: 'Staked' },
      },
      txWrappers: [],
      groupId: 1719389948933,
    },
    {
      id: 6,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [
            {
              chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
              address: 'DoX5GkDsChLPSm4VPGX2FnkN2CLPwtgsCbryNB6X32os2ys',
              type: TransactionType.BOND,
              args: {
                value: '100000000000',
                controller: 'DoX5GkDsChLPSm4VPGX2FnkN2CLPwtgsCbryNB6X32os2ys',
                payee: 'Staked',
              },
            },
            {
              chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
              address: 'DoX5GkDsChLPSm4VPGX2FnkN2CLPwtgsCbryNB6X32os2ys',
              type: TransactionType.NOMINATE,
              args: {
                targets: [
                  '5GYaYNVq6e855t5hVCyk4Wuqssaf6ADTrvdPZ3QXyHvFXTip',
                  '5GTD7ZeD823BjpmZBCSzBQp7cvHR1Gunq7oDkurZr9zUev2n',
                  '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
                ],
              },
            },
          ],
        },
      },
      txWrappers: [],
      groupId: 1719390914336,
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
