import { fork, allSettled } from 'effector';

import { storageService } from '@shared/api/storage';
import { proxyModel } from '../proxy-model';
import { ProxyType } from '@shared/core';
import type { HexString, ProxyAccount } from '@shared/core';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

const proxyMock = {
  id: 0,
  chainId: '0x00' as HexString,
  accountId: '0x00' as HexString,
  proxiedAccountId: '0x01' as HexString,
  proxyType: ProxyType.ANY,
  delay: 0,
} as ProxyAccount;

describe('entities/proxy/model/proxy-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should add proxy ', async () => {
    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([]);

    const scope = fork();

    await allSettled(proxyModel.events.proxiesAdded, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({
      '0x00': [proxyMock],
    });
  });

  test('should remove proxy ', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);

    const scope = fork();

    await allSettled(proxyModel.events.proxiesRemoved, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({});
  });
});
