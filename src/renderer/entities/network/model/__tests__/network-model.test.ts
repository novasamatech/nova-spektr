import { fork, allSettled } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { networkModel } from '../network-model';
import { chainsService, networkService, ProviderType, ProviderWithMetadata } from '@shared/api/network';
import { Chain, ConnectionStatus, ChainMetadata, Connection, ConnectionType, ChainId } from '@shared/core';
import { storageService } from '@shared/api/storage';

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
    connectionType: ConnectionType.RPC_NODE,
    activeNode: { name: 'My node', url: 'http://localhost:8080' },
  };

  const mockMetadata: ChainMetadata = {
    id: 1,
    version: 1,
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
    jest.spyOn(storageService.metadata, 'readAll').mockResolvedValue(metadata || []);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should populate $chains on networkStarted', async () => {
    mockStorage({ chains: mockChainMap });
    const scope = fork({});

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$chains)).toEqual(mockChainMap);
  });

  test('should set default $connectionStatuses on networkStarted', async () => {
    mockStorage({ chains: mockChainMap });
    const scope = fork({});

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$connectionStatuses)).toEqual({ '0x01': ConnectionStatus.DISCONNECTED });
  });

  test('should set $connections on networkStarted', async () => {
    mockStorage({ chains: mockChainMap, connections: [mockConnection] });

    const scope = fork({});

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$connections)).toEqual({ '0x01': mockConnection });
  });

  test('should set $apis on chainStarted', async () => {
    const api = { genesisHash: { toHex: () => mockChainMap['0x01'].chainId } } as ApiPromise;
    mockStorage({
      chains: mockChainMap,
      connections: [mockConnection],
      metadata: [mockMetadata],
    });

    const scope = fork({});

    jest.spyOn(networkService, 'createApi').mockResolvedValue(api);
    const spyCreateProvider = jest.spyOn(networkService, 'createProvider').mockReturnValue({} as ProviderWithMetadata);

    await allSettled(networkModel.events.networkStarted, { scope });

    expect(scope.getState(networkModel.$apis)).toEqual({ '0x01': api });
    expect(spyCreateProvider).toHaveBeenCalledWith(
      mockChainMap['0x01'].chainId,
      ProviderType.WEB_SOCKET,
      { metadata: mockMetadata.metadata, nodes: ['http://localhost:8080'] },
      { onConnected: expect.any(Function), onDisconnected: expect.any(Function), onError: expect.any(Function) },
    );
  });

  test('should set Light Client in $apis on chainStarted', async () => {
    const api = { genesisHash: { toHex: () => mockChainMap['0x01'].chainId } } as ApiPromise;
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

    const scope = fork({});

    const connectMock = jest.fn();
    jest.spyOn(networkService, 'createApi').mockResolvedValue(api);
    const spyCreateProvider = jest
      .spyOn(networkService, 'createProvider')
      .mockReturnValue({ connect: connectMock } as unknown as ProviderWithMetadata);

    await allSettled(networkModel.events.networkStarted, { scope });

    expect(connectMock).toHaveBeenCalled();
    expect(scope.getState(networkModel.$apis)).toEqual({ '0x01': api });
    expect(spyCreateProvider).toHaveBeenCalledWith(
      mockChainMap['0x01'].chainId,
      ProviderType.LIGHT_CLIENT,
      { metadata: mockMetadata.metadata, nodes: [''] },
      { onConnected: expect.any(Function), onDisconnected: expect.any(Function), onError: expect.any(Function) },
    );
  });
});
