import { fork, allSettled } from 'effector';

import { storageService } from '@shared/api/storage';
import { proxyModel } from '../proxy-model';
import { HexString, ProxyAccount, ProxyGroup } from '@shared/core';

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

const proxyMock = {
  id: 1,
  chainId: '0x00' as HexString,
  accountId: '0x00' as HexString,
  proxiedAccountId: '0x01' as HexString,
  proxyType: 'Any',
  delay: 0,
} as ProxyAccount;

const proxyGroupMock = {
  id: 1,
  chainId: '0x00' as HexString,
  proxiedAccountId: '0x01' as HexString,
  walletId: 1,
  totalDeposit: '1,000,000',
} as ProxyGroup;

describe('entities/proxy/model/proxy-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should add proxy on proxiesAdded', async () => {
    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([]);

    const scope = fork();

    await allSettled(proxyModel.events.proxiesAdded, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({
      '0x01': [proxyMock],
    });
  });

  test('should remove proxy on proxiesRemoved', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);

    const scope = fork();

    await allSettled(proxyModel.events.proxiesRemoved, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({});
  });

  test('should add proxy group on proxyGroupsAdded', async () => {
    jest.spyOn(storageService.proxyGroups, 'createAll').mockResolvedValue([proxyGroupMock]);

    const scope = fork();

    await allSettled(proxyModel.events.proxyGroupsAdded, { scope, params: [proxyGroupMock] });

    expect(scope.getState(proxyModel.$proxyGroups)).toEqual([proxyGroupMock]);
    expect(scope.getState(proxyModel.$walletsProxyGroups)).toEqual({ 1: [proxyGroupMock] });
  });

  test('should remove proxy group on proxyGroupsRemoved', async () => {
    jest.spyOn(storageService.proxyGroups, 'deleteAll').mockResolvedValue([1]);

    const scope = fork();

    await allSettled(proxyModel.events.proxyGroupsRemoved, { scope, params: [proxyGroupMock] });

    expect(scope.getState(proxyModel.$proxyGroups)).toEqual([]);
    expect(scope.getState(proxyModel.$walletsProxyGroups)).toEqual({});
  });
});
