import { allSettled, fork } from 'effector';

import { walletProviderModel } from '../wallet-provider-model';
import { walletProviderMock } from './wallet-provider.mock';
import { walletSelectModel } from '@features/wallets';
import { proxyModel } from '@entities/proxy';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';

// @widgets/RemoveProxy export of RemoveProxy causes chain of imports up to wallet-connect model which causes error
jest.mock('@features/operations', () => ({
  Signing: () => null,
}));

describe('widgets/WalletDetails/model/wallet-provider-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $accounts', async () => {
    const { wallets, accounts } = walletProviderMock;

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$accounts, accounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: wallets[0].id });

    expect(scope.getState(walletProviderModel.$accounts)).toEqual([accounts[0], accounts[1]]);
  });

  test('should set $chainsProxies', async () => {
    const { wallets, dupAccounts, chains, proxies, proxyAccounts } = walletProviderMock;

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, wallets)
        .set(walletModel.$accounts, dupAccounts)
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
    const { multisiigWallet, multisigAccount, proxies, chains } = walletProviderMock;

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [multisiigWallet])
        .set(walletModel.$accounts, [multisigAccount])
        .set(proxyModel.$proxies, proxies)
        .set(networkModel.$chains, chains),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: multisiigWallet.id });

    expect(scope.getState(walletProviderModel.$signatoryContacts)).toEqual(multisigAccount.signatories);
  });

  test('should set $signatoryWallets for multisig wallet', async () => {
    const { multisiigWallet, multisigAccount, signatoriesAccounts, signatoriesWallets, proxies, chains } =
      walletProviderMock;

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [multisiigWallet, ...signatoriesWallets])
        .set(walletModel.$accounts, [multisigAccount, ...signatoriesAccounts])
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
    const { wallets, accounts } = walletProviderMock;

    const scope = fork({
      values: new Map().set(walletModel.$wallets, wallets).set(walletModel.$accounts, accounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: wallets[1].id });

    expect(scope.getState(walletProviderModel.$proxyWallet)).toEqual(wallets[0]);
  });
});
