import { allSettled, fork } from 'effector';

import { networkModel } from '@entities/network';
import { activeNetworksModel, inactiveNetworksModel, networkSelectorUtils } from '@features/network';
import { networksOverviewModel } from '../networks-overview-model';
import { ConnectionStatus, ConnectionType } from '@shared/core';

const chains = [
  { name: 'Test chain 1', chainId: '0x01' },
  { name: 'Test chain 2', chainId: '0x02' },
  { name: 'Test chain 3', chainId: '0x03' },
];

const connectionStatuses = {
  '0x01': ConnectionStatus.CONNECTED,
  '0x02': ConnectionStatus.DISCONNECTED,
  '0x03': ConnectionStatus.CONNECTING,
};

const connections = {
  '0x01': { chainId: '0x01', connectionType: ConnectionType.AUTO_BALANCE },
  '0x02': { chainId: '0x02', connectionType: ConnectionType.DISABLED },
  '0x03': { chainId: '0x03', connectionType: ConnectionType.AUTO_BALANCE },
};

const connectionsList = [{ type: ConnectionType.AUTO_BALANCE }, { type: ConnectionType.DISABLED }];

describe('pages/Settings/Networks/model/networks-overview-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should correctly map active networks to their connection lists', async () => {
    const expected = {
      '0x01': {
        connections: [{ type: 'AUTO_BALANCE' }, { type: 'DISABLED' }],
        activeConnection: { type: 'AUTO_BALANCE' },
      },
      '0x03': {
        connections: [{ type: 'AUTO_BALANCE' }, { type: 'DISABLED' }],
        activeConnection: { type: 'AUTO_BALANCE' },
      },
    };
    jest.spyOn(networkSelectorUtils, 'getConnectionsList').mockReturnValue(connectionsList);

    const scope = fork({
      values: new Map()
        .set(networkModel.$connections, connections)
        .set(networkModel.$connectionStatuses, connectionStatuses),
    });

    await allSettled(activeNetworksModel.events.networksChanged, { scope, params: chains });

    const activeConnectionsMap = scope.getState(networksOverviewModel.$activeConnectionsMap);

    expect(activeConnectionsMap).toEqual(expected);
  });

  test('should correctly map disabled networks to their connection lists', async () => {
    const expected = {
      '0x02': {
        connections: [{ type: 'AUTO_BALANCE' }, { type: 'DISABLED' }],
        activeConnection: { type: 'DISABLED' },
      },
    };
    jest.spyOn(networkSelectorUtils, 'getConnectionsList').mockReturnValue(connectionsList);

    const scope = fork({
      values: new Map()
        .set(networkModel.$connections, connections)
        .set(networkModel.$connectionStatuses, connectionStatuses),
    });

    await allSettled(inactiveNetworksModel.events.networksChanged, { scope, params: chains });

    const inactiveConnectionsMap = scope.getState(networksOverviewModel.$inactiveConnectionsMap);

    expect(inactiveConnectionsMap).toEqual(expected);
  });
});
