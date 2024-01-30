import { fork, allSettled } from 'effector';

import { networkModel } from '@entities/network';
import { selectorModel } from '../selector-model';
import { ConnectionType, Connection, RpcNode } from '@shared/core';
import { storageService } from '@shared/api/storage';

describe('pages/Settings/Networks/model/selector-model', () => {
  const getMockConnection = (type: ConnectionType, activeNode?: RpcNode): Connection => ({
    id: 1,
    chainId: '0x01',
    customNodes: [],
    connectionType: type,
    activeNode,
  });

  test('should update $connections on chainDisabled', async () => {
    const mockConnection = getMockConnection(ConnectionType.RPC_NODE, {
      name: 'My node',
      url: 'http://localhost:8080',
    });
    jest.spyOn(storageService.connections, 'update').mockResolvedValue(mockConnection.id);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(selectorModel.events.chainDisabled, { scope, params: mockConnection.chainId });

    expect(scope.getState(networkModel.$connections)).toEqual({
      '0x01': { ...mockConnection, connectionType: ConnectionType.DISABLED },
    });
  });

  test('should update $connections on lightClientSelected', async () => {
    const mockConnection = getMockConnection(ConnectionType.DISABLED);
    jest.spyOn(storageService.connections, 'update').mockResolvedValue(mockConnection.id);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(selectorModel.events.lightClientSelected, { scope, params: mockConnection.chainId });

    expect(scope.getState(networkModel.$connections)).toEqual({
      '0x01': { ...mockConnection, connectionType: ConnectionType.LIGHT_CLIENT, activeNode: undefined },
    });
  });

  test('should update $connections on rpcNodeSelected', async () => {
    const mockConnection = getMockConnection(ConnectionType.DISABLED);
    jest.spyOn(storageService.connections, 'update').mockResolvedValue(mockConnection.id);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });
    const node: RpcNode = { name: 'New single node', url: 'ws://127.0.0.1:9944' };

    await allSettled(selectorModel.events.rpcNodeSelected, {
      scope,
      params: { chainId: mockConnection.chainId, node },
    });
    expect(scope.getState(networkModel.$connections)).toEqual({
      '0x01': { ...mockConnection, connectionType: ConnectionType.RPC_NODE, activeNode: node },
    });
  });
});
