import { fork, allSettled } from 'effector';

import { networkModel } from '@entities/network';
import { ConnectionType, Connection, RpcNode } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { manageNetworkModel } from '../manage-network-model';

describe('features/network/NetworkSelector/model/manage-network-model', () => {
  const getMockConnection = (type: ConnectionType, activeNode?: RpcNode): Connection => ({
    id: 1,
    chainId: '0x01',
    customNodes: [],
    connectionType: type,
    activeNode,
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should update $connections on rpcNodeAdded', async () => {
    const mockConnection = getMockConnection(ConnectionType.RPC_NODE);
    const updatedConnection = {
      ...mockConnection,
      activeNode: {
        name: 'My node',
        url: 'http://localhost:8080',
      },
    };
    jest.spyOn(storageService.connections, 'put').mockResolvedValue(updatedConnection);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(manageNetworkModel.events.rpcNodeAdded, {
      scope,
      params: { chainId: mockConnection.chainId, rpcNode: { name: 'My node', url: 'http://localhost:8080' } },
    });

    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': updatedConnection });
  });

  test('should update $connections on rpcNodeUpdated', async () => {
    const mockConnection = getMockConnection(ConnectionType.RPC_NODE, {
      name: 'My node',
      url: 'http://localhost:8080',
    });
    const updatedConnection = {
      ...mockConnection,
      activeNode: {
        name: 'My node 2',
        url: 'http://localhost:8080',
      },
    };

    jest.spyOn(storageService.connections, 'put').mockResolvedValue(updatedConnection);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(manageNetworkModel.events.rpcNodeUpdated, {
      scope,
      params: {
        chainId: mockConnection.chainId,
        oldNode: mockConnection.activeNode,
        rpcNode: { name: 'My node 2', url: 'http://localhost:8080' },
      },
    });

    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': updatedConnection });
  });
});
