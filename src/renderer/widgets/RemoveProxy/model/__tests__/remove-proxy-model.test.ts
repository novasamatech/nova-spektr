import { allSettled, fork } from 'effector';
import { ApiPromise } from '@polkadot/api';

import type { Chain, HexString, ProxyAccount, Wallet } from '@shared/core';
import { Account, AccountType, ProxyType, SigningType, WalletType } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { removeProxyModel } from '@widgets/RemoveProxy/model/remove-proxy-model';
import { TEST_CHAIN_ICON, TEST_CHAIN_ID } from '@shared/lib/utils';
import { storageService } from '@shared/api/storage';
import { proxyModel } from '@entities/proxy';

const proxyAccountMock = {
  id: 1,
  chainId: TEST_CHAIN_ID,
  accountId: '0x00' as HexString,
  proxiedAccountId: '0x01' as HexString,
  proxyType: ProxyType.ANY,
  delay: 0,
} as ProxyAccount;

const proxiedAccountMock: Account = {
  id: 2,
  chainId: '0x00' as HexString,
  accountId: '0x01' as HexString,
  walletId: 1,
  name: '',
  type: AccountType.BASE,
  chainType: 0,
  cryptoType: 0,
};

const chainMock: Chain = {
  chainId: TEST_CHAIN_ID,
  specName: 'name',
  name: 'name',
  assets: [],
  nodes: [],
  icon: TEST_CHAIN_ICON,
  addressPrefix: 42,
};

const proxiedWalletMock: Wallet = {
  id: 1,
  name: 'proxied',
  type: WalletType.SINGLE_PARITY_SIGNER,
  isActive: false,
  signingType: SigningType.PARITY_SIGNER,
};

describe('widgets/RemoveProxy/model/remove-proxy-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should set proxied account and wallet when flow starts', async () => {
    const scope = fork({
      values: new Map().set(walletModel.$wallets, [proxiedWalletMock]).set(walletModel.$accounts, [proxiedAccountMock]),
    });

    await allSettled(removeProxyModel.events.removeStarted, {
      scope,
      params: { proxyAccount: proxyAccountMock, chain: chainMock },
    });

    expect(scope.getState(removeProxyModel.$proxiedAccount)).toEqual(proxiedAccountMock);
    expect(scope.getState(removeProxyModel.$proxiedWallet)).toEqual(proxiedWalletMock);
  });

  test('should delete proxy from app when flow successfully finished', async () => {
    jest.spyOn(storageService.proxies, 'deleteAll').mockResolvedValue([1]);

    const scope = fork({
      values: new Map()
        .set(proxyModel.$proxies, { '0x01': [proxyAccountMock] })
        .set(removeProxyModel.$proxyAccount, proxyAccountMock)
        .set(proxyModel.$proxyGroups, [
          {
            id: 1,
            walletId: 1,
            proxiedAccountId: '0x01',
            chainId: TEST_CHAIN_ID,
            totalDeposit: '11111111',
          },
        ]),
    });

    await allSettled(removeProxyModel.events.proxyRemoved, { scope, params: {} as ApiPromise });

    expect(scope.getState(proxyModel.$proxies)).toEqual({});
  });
});
