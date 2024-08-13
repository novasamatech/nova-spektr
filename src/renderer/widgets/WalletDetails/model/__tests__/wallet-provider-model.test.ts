import { allSettled, fork } from 'effector';

import { networkModel } from '@entities/network';
import { proxyModel } from '@entities/proxy';
import { walletModel } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';
import { walletProviderModel } from '../wallet-provider-model';

import { walletProviderMocks } from './mocks/wallet-provider-mocks';

// @widgets/RemoveProxy export of RemoveProxy causes chain of imports up to wallet-connect model which causes error
jest.mock('@features/operations', () => ({
  Signing: () => null,
}));

describe('widgets/WalletDetails/model/wallet-provider-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $chainsProxies', async () => {
    const { wallets, chains, proxies, proxyAccounts } = walletProviderMocks;

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, wallets)
        .set(networkModel.$chains, chains)
        .set(proxyModel.$proxies, proxies),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: wallets[0].id });

    expect(scope.getState(walletProviderModel.$chainsProxies)).toEqual({
      '0x01': [proxyAccounts[0]],
      '0x02': [proxyAccounts[1]],
    });
  });

  test('should set $signatoryContacts for multisig wallet', async () => {
    const { multisiigWallet, proxies, chains } = walletProviderMocks;

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [multisiigWallet])
        .set(proxyModel.$proxies, proxies)
        .set(networkModel.$chains, chains),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: multisiigWallet.id });

    expect(scope.getState(walletProviderModel.$signatoryContacts)).toEqual(multisiigWallet.accounts[0].signatories);
  });

  test('should set $signatoryWallets for multisig wallet', async () => {
    const { multisiigWallet, signatoriesWallets, proxies, chains } = walletProviderMocks;

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [multisiigWallet, ...signatoriesWallets])
        .set(proxyModel.$proxies, proxies)
        .set(networkModel.$chains, chains),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: multisiigWallet.id });

    expect(scope.getState(walletProviderModel.$signatoryWallets)).toEqual([
      ['0x01', signatoriesWallets[0]],
      ['0x02', signatoriesWallets[1]],
    ]);
  });

  test('should set $proxyWallet', async () => {
    const { wallets } = walletProviderMocks;

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: wallets[1].id });

    const wallet = scope.getState(walletProviderModel.$proxyWallet);
    expect(wallet?.id).toEqual(wallets[0].id);
  });
});
