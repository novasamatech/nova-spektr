import { fork, allSettled } from 'effector';

import { networkModel } from '../network-model';
import { chainsService } from '@shared/api/network';
import { Chain, ConnectionStatus } from '@shared/core';
import { storageService } from '@shared/api/storage';

describe('entities/network/model/network-model', () => {
  const mockChainMap = {
    '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': {
      name: 'Polkadot',
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    } as unknown as Chain,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should populate $chains on networkStarted', async () => {
    jest.spyOn(chainsService, 'getChainsMap').mockReturnValue(mockChainMap);
    jest.spyOn(storageService.connections, 'readAll').mockResolvedValue([]);
    const scope = fork({});

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$chains)).toEqual(mockChainMap);
  });

  test('should set default $connectionStatuses on networkStarted', async () => {
    jest.spyOn(chainsService, 'getChainsMap').mockReturnValue(mockChainMap);
    jest.spyOn(storageService.connections, 'readAll').mockResolvedValue([]);
    const scope = fork({});

    await allSettled(networkModel.events.networkStarted, { scope });
    expect(scope.getState(networkModel.$connectionStatuses)).toEqual({
      '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': ConnectionStatus.DISCONNECTED,
    });
  });
});
