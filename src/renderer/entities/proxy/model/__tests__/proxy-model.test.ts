import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type AccountId, type HexString, type ProxyAccount, type ProxyGroup } from '@/shared/core';
import { proxyModel } from '../proxy-model';

const proxyMock = {
  id: 1,
  chainId: '0x00' as HexString,
  accountId: '0x00' as AccountId,
  proxiedAccountId: '0x01' as AccountId,
  proxyType: 'Any',
  delay: 0,
} as ProxyAccount;

const newProxyMock = {
  id: 2,
  chainId: '0x11' as HexString,
  accountId: '0x11' as AccountId,
  proxiedAccountId: '0x01' as AccountId,
  proxyType: 'Staking',
  delay: 0,
} as ProxyAccount;

const proxyGroupMock = {
  id: 1,
  chainId: '0x00' as HexString,
  proxiedAccountId: '0x01' as AccountId,
  walletId: 1,
  totalDeposit: '1,000,000',
} as ProxyGroup;

describe('entities/proxy/model/proxy-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should add proxy on proxiesAdded', async () => {
    jest.spyOn(storageService.proxies, 'createAll').mockResolvedValue([newProxyMock]);

    const scope = fork({
      values: new Map().set(proxyModel.$proxies, { '0x01': [proxyMock] }),
    });

    await allSettled(proxyModel.events.proxiesAdded, { scope, params: [newProxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({ '0x01': [proxyMock, newProxyMock] });
  });

  test('should remove proxy on proxiesRemoved', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map().set(proxyModel.$proxies, { '0x01': [proxyMock, newProxyMock] }),
    });

    await allSettled(proxyModel.events.proxiesRemoved, { scope, params: [proxyMock] });

    expect(scope.getState(proxyModel.$proxies)).toEqual({ '0x01': [newProxyMock] });
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
