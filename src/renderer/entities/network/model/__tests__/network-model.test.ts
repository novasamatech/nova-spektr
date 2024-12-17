import { allSettled, fork } from 'effector';

import { ProviderType, type ProviderWithMetadata, chainsService, networkService } from '@/shared/api/network';
import { storageService } from '@/shared/api/storage';
import {
  type Chain,
  type ChainId,
  type ChainMetadata,
  type Connection,
  ConnectionStatus,
  ConnectionType,
} from '@/shared/core';
import { networkModel } from '../network-model';

describe('entities/network/model/network-model', () => {
  const mockChainMap = {
    '0x01': {
      name: 'Polkadot',
      chainId: '0x01',
    } as unknown as Chain,
  };

  const mockConnection: Connection = {
    id: 1,
    chainId: '0x01',
    customNodes: [],
    connectionType: ConnectionType.RPC_NODE,
    activeNode: { name: 'My node', url: 'http://localhost:8080' },
  };

  const mockMetadata: ChainMetadata = {
    id: 1,
    runtimeVersion: 1,
    metadataVersion: 15,
    chainId: '0x01',
    metadata: '0x123',
  };

  type StorageParams = {
    chains?: Record<ChainId, Chain>;
    connections?: Connection[];
    metadata?: ChainMetadata[];
  };
  const mockStorage = ({ chains, connections, metadata }: StorageParams) => {
    jest.spyOn(chainsService, 'getChainsMap').mockReturnValue(chains || {});
    jest.spyOn(storageService.connections, 'readAll').mockResolvedValue(connections || []);
    jest.spyOn(storageService.connections, 'update').mockResolvedValue(1);
    jest.spyOn(storageService.metadata, 'readAll').mockResolvedValue(metadata || []);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should populate $chains on networkStarted', async () => {
    mockStorage({ chains: mockChainMap });
    const scope = fork();

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$chains)).toEqual(mockChainMap);
  });

  test('should set default $connectionStatuses on networkStarted', async () => {
    mockStorage({ chains: mockChainMap });
    const scope = fork();

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$connectionStatuses)).toEqual({ '0x01': ConnectionStatus.DISCONNECTED });
  });

  test('should set $connections on networkStarted', async () => {
    mockStorage({ chains: mockChainMap, connections: [mockConnection] });

    const scope = fork();

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': mockConnection });
  });

  test('should set $providers on networkStarted', async () => {
    mockStorage({
      chains: mockChainMap,
      connections: [mockConnection],
      metadata: [mockMetadata],
    });
    const provider = { isConnected: true, onMetadataReceived: () => {} } as unknown as ProviderWithMetadata;
    const scope = fork();

    const spyCreateProvider = jest.spyOn(networkService, 'createProvider').mockReturnValue(provider);

    await allSettled(networkModel.events.networkStarted, { scope });

    expect(spyCreateProvider).toHaveBeenCalledWith(
      mockChainMap['0x01'].chainId,
      ProviderType.WEB_SOCKET,
      { metadata: mockMetadata, nodes: ['http://localhost:8080'] },
      { onConnected: expect.any(Function), onDisconnected: expect.any(Function), onError: expect.any(Function) },
    );
    expect(scope.getState(networkModel._test.$providers)).toEqual({
      '0x01': provider,
    });
  });

  test('should set Light Client in $providers on networkStarted', async () => {
    mockStorage({
      chains: mockChainMap,
      connections: [
        {
          ...mockConnection,
          connectionType: ConnectionType.LIGHT_CLIENT,
          activeNode: undefined,
        },
      ],
      metadata: [mockMetadata],
    });
    const connectMock = jest.fn();
    const provider = {
      connect: connectMock,
      isConnected: true,
      onMetadataReceived: () => {},
    } as unknown as ProviderWithMetadata;
    const spyCreateProvider = jest.spyOn(networkService, 'createProvider').mockReturnValue(provider);
    const scope = fork();

    await allSettled(networkModel.events.networkStarted, { scope });

    expect(connectMock).toHaveBeenCalled();
    expect(spyCreateProvider).toHaveBeenCalledWith(
      mockChainMap['0x01'].chainId,
      ProviderType.LIGHT_CLIENT,
      { metadata: mockMetadata, nodes: [''] },
      { onConnected: expect.any(Function), onDisconnected: expect.any(Function), onError: expect.any(Function) },
    );
    expect(scope.getState(networkModel._test.$providers)).toEqual({
      '0x01': provider,
    });
  });
});
