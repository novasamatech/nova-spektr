import { allSettled, fork } from 'effector';
import { keyBy } from 'lodash';

import { type ProviderWithMetadata, ProviderType, chainsService, networkService } from '@/shared/api/network';
import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainMetadata, type Connection, ConnectionStatus, ConnectionType } from '@/shared/core';
import { polkadotChain, polkadotChainId } from '@/shared/mocks';
import { networkModel } from '../network-model';

describe('entities/network/model/network-model', () => {
  const mockChains = [polkadotChain];

  const mockChainMap = keyBy(mockChains, 'chainId');

  const mockConnection: Connection = {
    id: 1,
    chainId: polkadotChainId,
    customNodes: [],
    connectionType: ConnectionType.RPC_NODE,
    activeNode: { name: 'My node', url: 'http://localhost:8080' },
  };

  const mockMetadata: ChainMetadata = {
    id: 1,
    runtimeVersion: 1,
    metadataVersion: 15,
    chainId: polkadotChainId,
    metadata: '0x123',
  };

  type StorageParams = {
    chains?: Chain[];
    connections?: Connection[];
    metadata?: ChainMetadata[];
  };
  const mockStorage = ({ chains, connections, metadata }: StorageParams) => {
    jest.spyOn(chainsService, 'getChainsData').mockResolvedValue(chains || []);
    jest.spyOn(storageService.connections, 'readAll').mockResolvedValue(connections || []);
    jest.spyOn(storageService.connections, 'update').mockResolvedValue(1);
    jest.spyOn(storageService.metadata, 'readAll').mockResolvedValue(metadata || []);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should populate $chains on networkStarted', async () => {
    mockStorage({ chains: mockChains });
    const scope = fork();

    await allSettled(networkModel.startNetworks, { scope });
    expect(scope.getState(networkModel.$chains)).toEqual(mockChainMap);
  });

  test('should set default $connectionStatuses on networkStarted', async () => {
    mockStorage({ chains: mockChains });
    const scope = fork();

    await allSettled(networkModel.startNetworks, { scope });
    expect(scope.getState(networkModel.$connectionStatuses)).toEqual({
      [polkadotChainId]: ConnectionStatus.DISCONNECTED,
    });
  });

  test('should set $connections on networkStarted', async () => {
    mockStorage({ chains: mockChains, connections: [mockConnection] });

    const scope = fork();

    await allSettled(networkModel.startNetworks, { scope });
    expect(scope.getState(networkModel.$connections)).toEqual({ [polkadotChainId]: mockConnection });
  });

  test('should set $providers on networkStarted', async () => {
    mockStorage({
      chains: mockChains,
      connections: [mockConnection],
      metadata: [mockMetadata],
    });

    const provider = {
      isConnected: true,
      onMetadataReceived: () => {},
    } as unknown as ProviderWithMetadata;
    const scope = fork();

    const spyCreateProvider = jest.spyOn(networkService, 'createProvider').mockReturnValue(provider);

    await allSettled(networkModel.startNetworks, { scope });

    expect(spyCreateProvider).toHaveBeenCalledWith(
      mockChainMap[polkadotChainId].chainId,
      ProviderType.WEB_SOCKET,
      { metadata: mockMetadata, nodes: ['http://localhost:8080'] },
      { onConnected: expect.any(Function), onDisconnected: expect.any(Function), onError: expect.any(Function) },
    );
    expect(scope.getState(networkModel._test.$providers)).toEqual({
      [polkadotChainId]: provider,
    });
  });

  test('should set Light Client in $providers on networkStarted', async () => {
    mockStorage({
      chains: mockChains,
      connections: [
        {
          ...mockConnection,
          connectionType: ConnectionType.LIGHT_CLIENT,
          activeNode: undefined,
        },
      ],
      metadata: [mockMetadata],
    });
    const connectMock = jest.fn().mockResolvedValue(null);
    const provider = {
      connect: connectMock,
      isConnected: true,
      onMetadataReceived: () => {},
    } as unknown as ProviderWithMetadata;

    const spyCreateProvider = jest.spyOn(networkService, 'createProvider').mockReturnValue(provider);
    const scope = fork();

    await allSettled(networkModel.startNetworks, { scope });

    expect(connectMock).toHaveBeenCalled();
    expect(spyCreateProvider).toHaveBeenCalledWith(
      mockChainMap[polkadotChainId].chainId,
      ProviderType.LIGHT_CLIENT,
      { metadata: mockMetadata, nodes: [''] },
      { onConnected: expect.any(Function), onDisconnected: expect.any(Function), onError: expect.any(Function) },
    );
    expect(scope.getState(networkModel._test.$providers)).toEqual({ [polkadotChainId]: provider });
  });
});
