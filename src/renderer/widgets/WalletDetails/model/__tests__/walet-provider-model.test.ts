import { allSettled, fork } from 'effector';

import { walletModel } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';
import { walletProviderModel } from '../wallet-provider-model';
import { storageService } from '@shared/api/storage';
import { proxyModel } from '@entities/proxy';
import { walletProviderMock } from './wallet-provider.mock';

// @widgets/RemoveProxy export of RemoveProxy causes chain of imports up to wallet-connect model which causes error
jest.mock('@features/operation', () => ({
  Signing: () => null,
}));

describe('widgets/WalletDetails/model/wallet-provider-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $accounts when $walletForDetails changes', async () => {
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(walletProviderMock.wallet.id);

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [walletProviderMock.wallet])
        .set(walletModel.$accounts, walletProviderMock.accounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: walletProviderMock.wallet.id });

    expect(scope.getState(walletProviderModel.$accounts)).toEqual([walletProviderMock.accounts[0]]);
  });

  test('should set $proxyAccounts when $walletForDetails changes', async () => {
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(walletProviderMock.wallet.id);

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [walletProviderMock.wallet])
        .set(walletModel.$accounts, walletProviderMock.accounts)
        .set(proxyModel.$proxies, walletProviderMock.proxyAccounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: walletProviderMock.wallet.id });

    expect(scope.getState(walletProviderModel.$proxyAccounts)).toEqual([
      walletProviderMock.proxyAccount1,
      walletProviderMock.proxyAccount2,
    ]);
  });

  test('should set $signatoryContacts when $walletForDetails changes to multisig', async () => {
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(walletProviderMock.wallet.id);

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [walletProviderMock.multisiigWallet])
        .set(walletModel.$accounts, [walletProviderMock.multisigAccount])
        .set(proxyModel.$proxies, walletProviderMock.proxyAccounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: walletProviderMock.multisiigWallet.id });

    expect(scope.getState(walletProviderModel.$signatoryContacts)).toEqual(
      walletProviderMock.multisigAccount.signatories,
    );
  });

  test('should set $signatoryWallets when $walletForDetails changes to multisig', async () => {
    jest.spyOn(storageService.wallets, 'update').mockResolvedValue(walletProviderMock.wallet.id);

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [walletProviderMock.multisiigWallet, ...walletProviderMock.signatoriesWallets])
        .set(walletModel.$accounts, [walletProviderMock.multisigAccount, ...walletProviderMock.signatoriesAccounts])
        .set(proxyModel.$proxies, walletProviderMock.proxyAccounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: walletProviderMock.multisiigWallet.id });

    expect(scope.getState(walletProviderModel.$signatoryWallets)).toEqual([
      ['0x01', walletProviderMock.signatoriesWallets[0]],
      ['0x02', walletProviderMock.signatoriesWallets[1]],
    ]);
  });
});
