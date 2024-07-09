import { IndexedDBData } from '../../../utils/interactWithDatabase';

export function createStakingOperations(initiatorWallet: number, address: string, chainId: string): IndexedDBData {
  const transactions = [
    {
      type: 'bondExtra',
      args: { maxAdditional: '1000000000000' },
      groupId: 1719389924115,
      id: 1,
    },
    {
      type: 'batchAll',
      args: {
        transactions: [
          { type: 'chill', args: {} },
          { type: 'unbond', args: { value: '1000000000000' } },
        ],
      },
      groupId: 1719389929374,
      id: 2,
    },
    {
      type: 'nominate',
      args: {
        targets: [
          '5GYaYNVq6e855t5hVCyk4Wuqssaf6ADTrvdPZ3QXyHvFXTip',
          '5GTD7ZeD823BjpmZBCSzBQp7cvHR1Gunq7oDkurZr9zUev2n',
          '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
        ],
      },
      groupId: 1719389935335,
      id: 3,
    },
    {
      type: 'payee',
      args: { payee: { Account: '5HmFdjr2veW7aLtc4NBcXjrKHw42t4YdpGNArAiHcGK2gMca' } },
      groupId: 1719389942026,
      id: 4,
    },
    {
      type: 'payee',
      args: { payee: 'Staked' },
      groupId: 1719389948933,
      id: 5,
    },
    {
      type: 'batchAll',
      args: {
        transactions: [
          {
            chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
            address: 'DoX5GkDsChLPSm4VPGX2FnkN2CLPwtgsCbryNB6X32os2ys',
            type: 'bond',
            args: {
              value: '100000000000',
              controller: 'DoX5GkDsChLPSm4VPGX2FnkN2CLPwtgsCbryNB6X32os2ys',
              payee: 'Staked',
            },
          },
          {
            chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
            address: 'DoX5GkDsChLPSm4VPGX2FnkN2CLPwtgsCbryNB6X32os2ys',
            type: 'nominate',
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
      groupId: 1719390914336,
      id: 6,
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
