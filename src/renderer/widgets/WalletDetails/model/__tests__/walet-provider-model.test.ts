import { allSettled, fork } from 'effector';

import { walletModel } from '@entities/wallet';
import { walletSelectModel } from '@features/wallets';
import { walletProviderModel } from '../wallet-provider-model';
import { storageService } from '@shared/api/storage';
import { proxyModel } from '@entities/proxy';
import { walletProviderMock } from './wallet-provider.mock';
import { networkModel } from '@entities/network';
import { TEST_CHAIN_ID } from '@shared/lib/utils';

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

  test('should set $proxiesByChain when $walletForDetails changes', async () => {
    // jest.spyOn(storageService.wallets, 'update').mockResolvedValue(walletProviderMock.wallet.id);

    const scope = fork({
      values: new Map()
        .set(walletModel.$wallets, [walletProviderMock.wallet])
        .set(walletModel.$accounts, walletProviderMock.dupAccounts)
        .set(networkModel.$chains, walletProviderMock.chains)
        .set(proxyModel.$proxies, walletProviderMock.proxyAccounts),
    });

    await allSettled(walletSelectModel.events.walletIdSet, { scope, params: walletProviderMock.wallet.id });

    expect(scope.getState(walletProviderModel.$proxiesByChain)).toEqual({
      [TEST_CHAIN_ID]: [walletProviderMock.proxyAccount1],
      ['0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e']: [walletProviderMock.proxyAccount2],
    });
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
