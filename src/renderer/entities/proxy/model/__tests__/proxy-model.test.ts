import { fork, allSettled } from 'effector';

import { proxyStorage } from '@shared/api/storage';
import { proxyModel } from '../proxy-model';
import { HexString, ProxyAccount } from '@shared/core';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

const proxyMock = {
  chainId: '0x00' as HexString,
  accountId: '0x00' as HexString,
  proxyAccountId: '0x01' as HexString,
  proxyType: 'Any',
  delay: 0,
} as ProxyAccount;

describe('entities/proxy/model/proxy-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should add proxy ', async () => {
    jest.spyOn(proxyStorage, 'readAll').mockResolvedValue([]);
    jest.spyOn(proxyStorage, 'createAll').mockResolvedValue([]);
    jest.spyOn(proxyStorage, 'deleteAll').mockResolvedValue();

    const scope = fork();

    await allSettled(proxyModel.events.proxiesAdded, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({
      '0x00': [proxyMock],
    });
  });

  test('should remove proxy ', async () => {
    jest.spyOn(proxyStorage, 'readAll').mockResolvedValue([proxyMock]);
    jest.spyOn(proxyStorage, 'createAll').mockResolvedValue([]);
    jest.spyOn(proxyStorage, 'deleteAll').mockResolvedValue();

    const scope = fork();

    await allSettled(proxyModel.events.proxiesRemoved, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({});
  });
});
