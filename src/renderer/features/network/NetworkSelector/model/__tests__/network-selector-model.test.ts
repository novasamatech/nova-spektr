import { fork, allSettled } from 'effector';

import { networkModel } from '@entities/network';
import { ConnectionType, Connection, RpcNode } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { networkSelectorModel } from '../network-selector-model';

describe('features/network/NetworkSelector/model/network-selector-model', () => {
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

  test('should update $connections on chainDisabled', async () => {
    const mockConnection = getMockConnection(ConnectionType.RPC_NODE, {
      name: 'My node',
      url: 'http://localhost:8080',
    });
    const updatedConnection = {
      ...mockConnection,
      connectionType: ConnectionType.DISABLED,
    };

    jest.spyOn(storageService.connections, 'put').mockResolvedValue(updatedConnection);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(networkSelectorModel.events.networkDisabled, { scope, params: mockConnection.chainId });

    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': updatedConnection });
  });

  test('should update $connections on lightClientSelected', async () => {
    const mockConnection = getMockConnection(ConnectionType.DISABLED);
    const updatedConnection = {
      ...mockConnection,
      connectionType: ConnectionType.LIGHT_CLIENT,
      activeNode: undefined,
    };

    jest.spyOn(storageService.connections, 'put').mockResolvedValue(updatedConnection);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(networkSelectorModel.events.lightClientSelected, { scope, params: mockConnection.chainId });

    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': updatedConnection });
  });

  test('should update $connections on rpcNodeSelected', async () => {
    const mockConnection = getMockConnection(ConnectionType.DISABLED);
    const node: RpcNode = { name: 'New single node', url: 'ws://127.0.0.1:9944' };
    const updatedConnection = {
      ...mockConnection,
      connectionType: ConnectionType.RPC_NODE,
      activeNode: node,
    };

    jest.spyOn(storageService.connections, 'put').mockResolvedValue(updatedConnection);

    const scope = fork({
      values: new Map().set(networkModel.$connections, { '0x01': mockConnection }),
    });

    await allSettled(networkSelectorModel.events.rpcNodeSelected, {
      scope,
      params: { chainId: mockConnection.chainId, node },
    });
    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': updatedConnection });
  });
});
