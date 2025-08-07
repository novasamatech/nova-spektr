import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type HexString, type ProxyAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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
});
